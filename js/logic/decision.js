/* 意思決定ロジック — 「今どう判断すべきか」を財務・設備リスク・試算精度の3軸で組み立てる(純関数・UMD)
   【設計上の契約】
   - 財務評価と設備リスクは別軸。設備が古いことを理由に経済性を良好扱いしない(誇大提案の防止)
   - 法的な買替義務があるとは表現しない(景表法ガード: data/master_background.js の prohibited をテストで検査)
   - 返却値は判断コードと根拠コードを必ず持つ。表示文言は同じ出所(この関数)から供給し、画面とPowerPointで一致させる
   - 現在時刻を内部で参照しない(currentYear は呼び出し側から渡す) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SSDecision = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  /* 財務が「良好」と言える上限回収年数。業務用設備の一般的な検討期間(10年)を採る */
  var PAYBACK_GOOD_YEARS = 10;
  /* 厨房冷凍機器を「古い」と見なす経過年数(業界の更新目安の下限側) */
  var KITCHEN_OLD_YEARS = 15;

  /* ---------- 財務評価 ---------- */
  function assessFinancial(aggregate) {
    var agg = aggregate || {};
    var investMid = Number(agg.investMid) || 0;
    var annualSaving = Number(agg.annualSavingYen) || 0;
    var payback = (agg.paybackYears === 0 || agg.paybackYears) ? Number(agg.paybackYears) : null;
    var tenYearNet = Number(agg.tenYearNet) || 0;

    var metrics = {
      investMidYen: investMid,
      annualSavingYen: annualSaving,
      paybackYears: payback,
      tenYearNetYen: tenYearNet
    };

    var reasons = [];
    if (investMid <= 0) { reasons.push("NO_INVESTMENT"); }
    if (annualSaving <= 0) { reasons.push("NO_SAVING"); }
    if (payback === null || !isFinite(payback)) { reasons.push("PAYBACK_UNAVAILABLE"); }
    if (reasons.length > 0) {
      return { code: "insufficient", reasons: reasons, metrics: metrics };
    }

    if (payback <= PAYBACK_GOOD_YEARS) { reasons.push("PAYBACK_WITHIN_10Y"); }
    else { reasons.push("PAYBACK_OVER_10Y"); }
    if (tenYearNet >= 0) { reasons.push("TEN_YEAR_NET_POSITIVE"); }
    else { reasons.push("TEN_YEAR_NET_NEGATIVE"); }

    var good = payback <= PAYBACK_GOOD_YEARS && tenYearNet >= 0;
    return { code: good ? "positive" : "long_payback", reasons: reasons, metrics: metrics };
  }

  /* ---------- 設備リスク(事業継続の観点。経済性とは独立) ---------- */
  var RISK_NOTES = {
    AIRCON_R22_ERA: "既設空調がR22冷媒世代の可能性が高く、修理用冷媒・部品の入手性が下がっています",
    AIRCON_OVER_LIFE: "既設空調が業界団体の耐用年数目安(6〜15年)の上限に達しています",
    TROUBLE_REPORTED: "現状の不調・停止のご相談をいただいています",
    AIRCON_CAUTION_AGE: "既設空調が補修用部品の保有期間を考えると注意が必要な時期です",
    FLUORESCENT_PRESENT: "蛍光灯を使用しており、製造終了後は交換用ランプの入手性が下がる見込みです",
    KITCHEN_OLD: "厨房冷凍機器の設置から年数が経っており、故障時の食材ロス・営業への影響が懸念されます"
  };

  function assessOperationalRisk(facts) {
    var f = facts || {};
    var reasons = [];

    if (f.airconR22) { reasons.push("AIRCON_R22_ERA"); }
    if (f.airconStage === "over") { reasons.push("AIRCON_OVER_LIFE"); }
    if (f.troubleReported) { reasons.push("TROUBLE_REPORTED"); }
    var high = reasons.length > 0;

    if (f.airconStage === "caution") { reasons.push("AIRCON_CAUTION_AGE"); }
    if (f.hasFluorescent) { reasons.push("FLUORESCENT_PRESENT"); }
    if (f.kitchenOldest && f.currentYear && (f.currentYear - f.kitchenOldest) >= KITCHEN_OLD_YEARS) {
      reasons.push("KITCHEN_OLD");
    }

    var level = high ? "high" : (reasons.length > 0 ? "medium" : "low");
    return {
      level: level,
      reasons: reasons,
      notes: reasons.map(function (r) { return RISK_NOTES[r]; }).filter(Boolean)
    };
  }

  /* 診断オブジェクトからリスク判定の材料を取り出す(画面・PowerPointで同じ入力を作るため) */
  function factsFromDiag(diag, currentYear) {
    var d = diag || {};
    var input = d.input || {};
    var ac = d.aircon || {};
    /* 判定材料は「今回の提案対象カテゴリ」に限る。
       空調を外した商談で、前回入力の不調メモが残ってリスクが跳ね上がるのを防ぐ */
    var trouble = (d.aircon && input.aircon && input.aircon.trouble) ? String(input.aircon.trouble).trim() : "";
    var kitchenYears = ((d.kitchen && d.kitchen.rows) || [])
      .map(function (r) { return Number(r.year) || 0; })
      .filter(function (y) { return y > 0; });

    return {
      airconR22: !!(ac.refInfo && ac.refInfo.isR22Era),
      airconStage: ac.ageInfo ? ac.ageInfo.stage : null,
      troubleReported: trouble.length > 0,
      hasFluorescent: !!(d.lighting && d.lighting.hasFluorescent),
      kitchenOldest: kitchenYears.length > 0 ? Math.min.apply(null, kitchenYears) : null,
      currentYear: currentYear
    };
  }

  /* ---------- 試算精度(根拠の裏付け度合い) ---------- */
  var EVIDENCE_ITEMS = [
    { key: "billsConfirmed", label: "直近12か月の請求書・使用量の確認" },
    { key: "modelConfirmed", label: "既設機器の銘板・型番の確認" },
    { key: "quoteConfirmed", label: "見積単価・確定に近い価格の反映" }
  ];

  function assessConfidence(evidence) {
    var e = evidence || {};
    var confirmed = EVIDENCE_ITEMS.filter(function (it) { return !!e[it.key]; });
    var missing = EVIDENCE_ITEMS.filter(function (it) { return !e[it.key]; });
    var n = confirmed.length;
    var grade = n >= 3 ? "A" : (n === 2 ? "B" : "C");
    var noteByGrade = {
      A: "請求書・銘板・見積のいずれも確認済みで、試算の確度は高い状態です",
      B: "主要な根拠を確認済みですが、未確認の項目があります",
      C: "既定値・年式帯からの推計が中心です。現地確認で精度が上がります"
    };
    return {
      grade: grade,
      confirmedCount: n,
      total: EVIDENCE_ITEMS.length,
      confirmed: confirmed.map(function (it) { return { key: it.key, label: it.label }; }),
      missing: missing.map(function (it) { return { key: it.key, label: it.label }; }),
      note: noteByGrade[grade]
    };
  }

  /* 保存JSONの後方互換: evidence が無い旧ファイルは全て未確認として読む */
  function normalizeEvidence(evidence) {
    var e = evidence || {};
    return {
      billsConfirmed: !!e.billsConfirmed,
      modelConfirmed: !!e.modelConfirmed,
      quoteConfirmed: !!e.quoteConfirmed
    };
  }

  /* ---------- 統合判断 ---------- */
  var DECISIONS = {
    plan_update: {
      label: "計画更新を優先",
      summary: "電気代削減が投資に見合ううえ、設備側にも更新を急ぐ事情があります。時期と予算を決める段階です。",
      tone: "ok",
      actions: ["現地調査(無料)の日程を決める", "正式見積で条件を確定する", "使える補助金の公募時期を確認する"]
    },
    compare_candidates: {
      label: "更新候補として比較",
      summary: "電気代削減が投資に見合う見通しです。設備側の緊急性は高くないため、機種と導入方法をじっくり比較できます。",
      tone: "ok",
      actions: ["候補機種のグレード差を比較する", "一括購入とリースの負担を比較する", "現地調査で条件を確認する"]
    },
    risk_first: {
      label: "故障リスク対策を優先し、正式見積で再判定",
      summary: "電気代の削減だけでは投資の回収に時間がかかります。一方で設備側に不調・入手性の懸念があるため、止まったときの損失を含めてご判断ください。",
      tone: "warn",
      actions: ["故障時の対応方針(応急・仮設)を決めておく", "正式見積で投資額を確定し再判定する", "補助金の活用可否を確認する"]
    },
    operations_first: {
      label: "運用改善・現状維持を先行",
      summary: "現時点の前提では、電気代の削減額が投資に見合いにくい試算です。まず費用のかからない運用改善から始める選択肢があります。",
      tone: "warn",
      actions: ["費用ゼロの運用改善(設定温度・清掃)から着手する", "3か月後に電気使用量を再計測する", "電気単価・実勢価格を反映して再試算する"]
    },
    reassess: {
      label: "現地調査・実データ確認後に再判定",
      summary: "判断に必要な数値がまだそろっていません。現地調査と実データの確認後に、あらためて試算します。",
      tone: "info",
      actions: ["直近12か月の請求書を確認する", "既設機器の銘板・型番を確認する", "現地調査で工事条件を確認する"]
    }
  };

  var FINANCIAL_REASON_TEXT = {
    PAYBACK_WITHIN_10Y: "投資回収は約{payback}年で、10年以内の見込みです",
    PAYBACK_OVER_10Y: "投資回収は約{payback}年で、10年を超える見込みです",
    TEN_YEAR_NET_POSITIVE: "10年間の累計収支は{tenYear}のプラスです",
    TEN_YEAR_NET_NEGATIVE: "10年間の累計収支は{tenYear}のマイナスです",
    NO_INVESTMENT: "投資額が算定できていません",
    NO_SAVING: "電気代の削減額が算定できていません",
    PAYBACK_UNAVAILABLE: "回収年数が算定できていません"
  };

  function yen(n) {
    var man = Math.round(Math.abs(n) / 1000) / 10;
    return man.toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "万円";
  }

  function financialReasonText(code, metrics) {
    var t = FINANCIAL_REASON_TEXT[code] || code;
    return t
      .replace("{payback}", metrics.paybackYears === null ? "—" : metrics.paybackYears)
      .replace("{tenYear}", yen(metrics.tenYearNetYen));
  }

  function buildDecision(financial, operational, confidence) {
    var fin = financial || assessFinancial(null);
    var ope = operational || assessOperationalRisk(null);
    var conf = confidence || assessConfidence(null);

    var code;
    if (fin.code === "insufficient") { code = "reassess"; }
    else if (fin.code === "positive") { code = (ope.level === "low") ? "compare_candidates" : "plan_update"; }
    else { code = (ope.level === "high") ? "risk_first" : "operations_first"; }

    var def = DECISIONS[code];

    /* 根拠は「財務の主要2点 + リスクの代表1点」を上限4件で。数字の根拠を必ず先頭に置く */
    var reasons = fin.reasons.slice(0, 2).map(function (r) { return financialReasonText(r, fin.metrics); });
    if (ope.notes.length > 0) { reasons.push(ope.notes[0]); }
    if (reasons.length < 2) { reasons.push(conf.note); }
    reasons = reasons.slice(0, 4);

    var actions = def.actions.slice();
    if (conf.grade === "C" && code !== "reassess") {
      actions.push("請求書・銘板・見積の確認で試算精度を上げる");
    }

    return {
      code: code,
      label: def.label,
      summary: def.summary,
      tone: def.tone,
      reasons: reasons,
      nextActions: actions,
      financial: fin,
      operational: ope,
      confidence: conf
    };
  }

  /* 診断オブジェクトから一気に判断を作る(画面・PowerPointの共通入口) */
  function fromDiag(diag, currentYear, evidence) {
    var d = diag || {};
    return buildDecision(
      assessFinancial(d.econAggregate),
      assessOperationalRisk(factsFromDiag(d, currentYear)),
      assessConfidence(evidence || (d.input && d.input.evidence))
    );
  }

  return {
    assessFinancial: assessFinancial,
    assessOperationalRisk: assessOperationalRisk,
    assessConfidence: assessConfidence,
    buildDecision: buildDecision,
    factsFromDiag: factsFromDiag,
    normalizeEvidence: normalizeEvidence,
    fromDiag: fromDiag,
    EVIDENCE_ITEMS: EVIDENCE_ITEMS,
    PAYBACK_GOOD_YEARS: PAYBACK_GOOD_YEARS
  };
});
