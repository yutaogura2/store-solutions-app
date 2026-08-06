/* 空調ロジック — 必要能力の算定と品番候補の組み立て(純関数・マスタは引数で受け取る) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SSAircon = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  /* 必要冷房能力(kW)の算定
     input: { areaTsubo, businessType, adjustments: {ceilingHigh, topFloor, largeWindow, openKitchen} } */
  function requiredCapacity(input, C) {
    var bt = C.AIRCON_LOAD_PER_TSUBO[input.businessType];
    if (!bt) { throw new Error("未知の業態: " + input.businessType); }
    if (!(input.areaTsubo > 0)) { throw new Error("店舗面積(坪)が未入力です"); }
    var base = input.areaTsubo * bt.kwPerTsubo;
    var applied = [];
    var rateSum = 0;
    var adj = input.adjustments || {};
    Object.keys(C.AIRCON_ADJUSTMENTS).forEach(function (key) {
      if (adj[key]) {
        rateSum += C.AIRCON_ADJUSTMENTS[key].rate;
        applied.push(C.AIRCON_ADJUSTMENTS[key]);
      }
    });
    var kw = base * (1 + rateSum);
    return {
      requiredKw: Math.round(kw * 10) / 10,
      baseKw: Math.round(base * 10) / 10,
      businessTypeName: bt.name,
      kwPerTsubo: bt.kwPerTsubo,
      areaTsubo: input.areaTsubo,
      adjustments: applied
    };
  }

  /* 台数と1台あたり能力クラスの決定
     既設台数が分かればその台数で更新(現実的)。不明なら最大クラスに収まる最小台数。
     tolerance(既定0.95): 必要能力の95%以上あれば1クラス下を許容(端数で過大クラスに跳ねるのを防ぐ) */
  function pickPlan(requiredKw, existingUnits, master, C) {
    var tolerance = (C && C.AIRCON_CLASS_TOLERANCE) || 0.95;
    var maxOversize = (C && C.AIRCON_MAX_OVERSIZE) || 1.3;
    var classes = master.classes;
    var maxKw = classes[classes.length - 1].kw;
    var units = existingUnits > 0 ? existingUnits
      : Math.max(1, Math.ceil(requiredKw / maxKw));
    // 既設台数を踏襲すると最小クラスでも過大になる場合は台数を減らす(小規模店に多台数の既設があるケース)
    var reducedFrom = null;
    if (existingUnits > 0) {
      var minKw = classes[0].kw;
      while (units > 1 && minKw * units > requiredKw * maxOversize) { units -= 1; }
      if (units !== existingUnits) { reducedFrom = existingUnits; }
    }
    var perUnitKw = requiredKw / units;
    var cls = null;
    for (var i = 0; i < classes.length; i++) {
      if (classes[i].kw >= perUnitKw * tolerance - 0.001) { cls = classes[i]; break; }
    }
    if (!cls) {
      // 1台あたりが最大クラスを超える場合は台数を増やす
      units = Math.ceil(requiredKw / maxKw);
      perUnitKw = requiredKw / units;
      for (var j = 0; j < classes.length; j++) {
        if (classes[j].kw >= perUnitKw * tolerance - 0.001) { cls = classes[j]; break; }
      }
    }
    return { units: units, cls: cls, totalKw: Math.round(cls.kw * units * 10) / 10, reducedFrom: reducedFrom };
  }

  /* 品番候補の組み立て(メーカー×グレード) */
  function buildCandidates(cls, master) {
    var out = [];
    master.makers.forEach(function (mk) {
      mk.grades.forEach(function (g) {
        out.push({
          maker: mk.maker,
          shapeName: mk.shapeName,
          grade: g.grade,
          gradeName: g.gradeName,
          series: g.series,
          imageKey: g.imageKey || null,
          model: g.modelPattern.replace("{code}", cls.code),
          cop: g.cop,
          apfNote: g.apfNote,
          price: Math.round(cls.priceStd * g.priceRate / 10000) * 10000,
          verified: !!g.verified,
          hp: cls.hp,
          kw: cls.kw
        });
      });
    });
    return out;
  }

  /* 経過年数から更新時期の評価(JRAIA目安6〜15年に基づく — 断定しない文言) */
  function ageAssessment(installYear, currentYear) {
    var age = Math.max(0, currentYear - installYear);
    var stage, text;
    if (age >= 15) {
      stage = "over";
      text = "設置から約" + age + "年 — 業界団体の耐用年数目安(6〜15年)の上限に達しており、計画的な更新の検討期です";
    } else if (age >= 9) {
      stage = "caution";
      text = "設置から約" + age + "年 — 補修用部品の保有期間(製造打切りから9年間が一般的)を考えると、故障時に修理できないリスクが高まる時期です";
    } else {
      stage = "ok";
      text = "設置から約" + age + "年 — まだ使用期間に余裕がありますが、定期的な点検・清掃が効率維持に有効です";
    }
    return { age: age, stage: stage, text: text };
  }

  /* 既設機の効率(COP)を年式帯から推計 */
  function existingCop(year, C) {
    var eras = C.AIRCON_EXISTING_COP_BY_ERA;
    for (var i = 0; i < eras.length; i++) {
      if (year <= eras[i].until) { return eras[i]; }
    }
    return eras[eras.length - 1];
  }

  /* 標準工事費レンジ(1台あたり×台数) */
  function installCost(hp, units, C) {
    var table = C.INSTALL_COST_AIRCON;
    for (var i = 0; i < table.length; i++) {
      if (hp <= table[i].maxHp) {
        return { low: table[i].low * units, high: table[i].high * units, label: table[i].label };
      }
    }
    var last = table[table.length - 1];
    return { low: last.low * units, high: last.high * units, label: last.label };
  }

  return {
    requiredCapacity: requiredCapacity,
    pickPlan: pickPlan,
    buildCandidates: buildCandidates,
    existingCop: existingCop,
    ageAssessment: ageAssessment,
    installCost: installCost
  };
});
