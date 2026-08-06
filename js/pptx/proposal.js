/* 提案資料生成 — PptxGenJS で顧客提示用 PowerPoint を組み立てる
   build(diag, C) は PptxGenJS インスタンスを返す(呼び出し側で writeFile する) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(require("../logic/economics.js")); }
  else { root.SSProposal = factory(root.SSEconomics); }
})(typeof self !== "undefined" ? self : this, function (SSEconomicsRef) {

  var NAVY = "1F3050";
  var GRAY = "5A6472";
  var LIGHT = "F2F4F7";
  var GREEN = "1A7F37";
  var AMBER = "A05A00";
  var WHITE = "FFFFFF";
  var FONT = "Meiryo";

  var DISCLAIMER = "本資料の金額・効果はすべて概算の目安です。正式なご提案・お見積りは現地調査のうえ作成いたします。";

  function man(n) { return (Math.round(n / 10000)).toLocaleString("ja-JP") + "万円"; }
  function num(n) { return Math.round(n).toLocaleString("ja-JP"); }

  function newSlide(pptx, title, state) {
    var slide = pptx.addSlide();
    slide.background = { color: WHITE };
    if (title) {
      slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.75, fill: { color: NAVY } });
      slide.addText(title, {
        x: 0.4, y: 0.06, w: 11.0, h: 0.62,
        fontFace: FONT, fontSize: 20, bold: true, color: WHITE, valign: "middle"
      });
    }
    state.page += 1;
    slide.addText(state.company + "  |  " + DISCLAIMER, {
      x: 0.4, y: 7.08, w: 11.6, h: 0.35, fontFace: FONT, fontSize: 8, color: GRAY, valign: "middle"
    });
    slide.addText(String(state.page), {
      x: 12.4, y: 7.08, w: 0.6, h: 0.35, fontFace: FONT, fontSize: 9, color: GRAY, align: "right", valign: "middle"
    });
    return slide;
  }

  function th(text) { return { text: text, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontFace: FONT, fontSize: 11 } }; }
  function td(text, opts) {
    var o = { fontFace: FONT, fontSize: 11, color: "1F2430", valign: "middle" };
    if (opts) { Object.keys(opts).forEach(function (k) { o[k] = opts[k]; }); }
    return { text: String(text), options: o };
  }

  function build(diag, C) {
    var input = diag.input;
    var meta = input.meta;
    var state = { page: 0, company: meta.companyName };

    var pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
    pptx.layout = "WIDE";
    pptx.author = meta.companyName;
    pptx.title = input.customer + "様 店舗設備のご提案";

    buildCover(pptx, diag, state);
    buildHearingSummary(pptx, diag, state);
    buildOverview(pptx, diag, state);
    if (diag.background) { buildBackground(pptx, diag, state); }
    if (diag.mapImage) { buildMap(pptx, diag, state); }
    if (diag.aircon) { buildAircon(pptx, diag, state); }
    if (diag.lighting && diag.lighting.rows.length > 0) { buildLighting(pptx, diag, state); }
    if (diag.kitchen && diag.kitchen.rows.length > 0) { buildKitchen(pptx, diag, state); }
    if (diag.demographics) { buildDemographics(pptx, diag, state); }
    if (diag.renovation && diag.renovation.estimate.breakdown.length > 0) { buildRenovation(pptx, diag, state); }
    if (diag.econAggregate && diag.econAggregate.annualSavingYen > 0) {
      buildEconomics(pptx, diag, state, C);
      buildPayback(pptx, diag, state, C);
    }
    if (diag.operations && diag.operations.items.length > 0) { buildOperations(pptx, diag, state); }
    if (diag.subsidies.length > 0) { buildSubsidy(pptx, diag, state); }
    buildProcess(pptx, diag, state);
    buildNotes(pptx, diag, state);

    return pptx;
  }

  /* ---- 表紙 ---- */
  function buildCover(pptx, diag, state) {
    var input = diag.input;
    var slide = pptx.addSlide();
    slide.background = { color: WHITE };
    state.page += 1;

    slide.addShape("rect", { x: 0, y: 2.3, w: 13.33, h: 2.6, fill: { color: NAVY } });
    slide.addText(input.customer + " 様", {
      x: 0.9, y: 2.55, w: 11.5, h: 0.8, fontFace: FONT, fontSize: 28, bold: true, color: WHITE
    });
    slide.addText("店舗設備リプレイスのご提案", {
      x: 0.9, y: 3.35, w: 11.5, h: 0.9, fontFace: FONT, fontSize: 36, bold: true, color: WHITE
    });
    var catNames = [];
    if (diag.aircon) { catNames.push("空調設備"); }
    if (diag.lighting) { catNames.push("照明設備"); }
    if (diag.kitchen) { catNames.push("厨房冷凍機器"); }
    if (diag.renovation) { catNames.push("店舗改装"); }
    slide.addText(catNames.join(" / "), {
      x: 0.9, y: 4.25, w: 11.5, h: 0.5, fontFace: FONT, fontSize: 16, color: "C9D2E0"
    });

    var dateText = input.meta.proposalDate ? input.meta.proposalDate.replace(/-/g, "/") : "";
    var lines = [dateText, state.company];
    if (input.meta.salesName) { lines.push("担当: " + input.meta.salesName); }
    slide.addText(lines.join("\n"), {
      x: 0.9, y: 5.6, w: 11.5, h: 1.2, fontFace: FONT, fontSize: 14, color: GRAY, lineSpacing: 24
    });
    slide.addText(DISCLAIMER, {
      x: 0.4, y: 7.08, w: 12.5, h: 0.35, fontFace: FONT, fontSize: 8, color: GRAY
    });
  }

  /* ---- 現状の整理 ---- */
  function buildHearingSummary(pptx, diag, state) {
    var input = diag.input;
    var slide = newSlide(pptx, "現状の整理(ヒアリング内容)", state);
    var rows = [[th("項目"), th("内容")]];
    rows.push([td("店舗名"), td(input.customer)]);
    var C = (typeof window !== "undefined" && window.SS_CONST) ? window.SS_CONST : null;
    var btName = C && C.AIRCON_LOAD_PER_TSUBO[input.businessType] ? C.AIRCON_LOAD_PER_TSUBO[input.businessType].name : input.businessType;
    rows.push([td("業態"), td(btName)]);
    rows.push([td("店舗面積"), td(input.areaTsubo + "坪(約" + Math.round(input.areaTsubo * 3.31) + "㎡)")]);
    rows.push([td("営業時間"), td(input.hoursPerDay + "時間/日 × " + input.daysPerMonth + "日/月")]);
    if (diag.aircon) {
      rows.push([td("既設空調"), td((input.aircon.units || diag.aircon.plan.units) + "台・" + diag.aircon.era.label + "設置" +
        (input.aircon.trouble ? "\nお困りごと: " + input.aircon.trouble : ""))]);
    }
    if (diag.lighting && diag.lighting.rows.length > 0) {
      rows.push([td("既設照明"), td(diag.lighting.rows.map(function (r) { return r.typeName + " " + r.count + "台"; }).join("\n"))]);
    }
    if (diag.kitchen && diag.kitchen.rows.length > 0) {
      rows.push([td("厨房冷凍機器"), td(diag.kitchen.rows.map(function (r) { return r.typeName + "(" + r.sizeName + ")" + r.count + "台・" + r.eraLabel; }).join("\n"))]);
    }
    if (diag.renovation) {
      var re = diag.renovation;
      var reText = [];
      if (re.purposes.length > 0) { reText.push("目的: " + re.purposes.join("・")); }
      if (re.timing) { reText.push("希望時期: " + re.timing); }
      if (re.budget) { reText.push("予算感: " + re.budget); }
      if (reText.length > 0) { rows.push([td("改装のご意向"), td(reText.join("\n"))]); }
    }
    slide.addTable(rows, {
      x: 0.5, y: 1.1, w: 12.3, colW: [2.6, 9.7],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 },
      rowH: 0.42, valign: "middle", autoPage: false
    });
  }

  /* ---- ご提案の全体像 ---- */
  function buildOverview(pptx, diag, state) {
    var slide = newSlide(pptx, "ご提案の全体像", state);
    var items = [];
    if (diag.aircon) {
      items.push({ name: "空調設備", text: diag.aircon.plan.units + "台 × " + diag.aircon.plan.cls.hp + "馬力への更新(" + diag.aircon.chosen.series + ")— 効きの改善と省エネの両立" });
    }
    if (diag.lighting && diag.lighting.rows.length > 0) {
      items.push({ name: "照明設備", text: "計" + diag.lighting.totals.count + "台のLED化 — 消費電力を約" + num(diag.lighting.totals.totalWattSaving) + "W削減・球替え作業も削減" });
    }
    if (diag.kitchen && diag.kitchen.rows.length > 0) {
      items.push({ name: "厨房冷凍機器", text: "計" + diag.kitchen.totals.count + "台の後継機更新 — 故障による食材ロスのリスク低減と省エネ" });
    }
    if (diag.renovation && diag.renovation.estimate.breakdown.length > 0) {
      items.push({ name: "店舗改装", text: "概算 " + man(diag.renovation.estimate.low) + "〜" + man(diag.renovation.estimate.high) + " — " + (diag.renovation.purposes.join("・") || "店舗価値の向上") });
    }
    var y = 1.2;
    items.forEach(function (item, i) {
      var slideY = y + i * 1.05;
      pptxBox(slide, 0.6, slideY, 12.1, 0.9, item.name, item.text);
    });
    var agg = diag.econAggregate;
    if (agg && agg.annualSavingYen > 0) {
      slide.addShape("rect", { x: 0.6, y: y + items.length * 1.05 + 0.15, w: 12.1, h: 1.1, fill: { color: "E6F4EA" } });
      slide.addText([
        { text: "設備更新による電気代削減(概算): ", options: { fontFace: FONT, fontSize: 15, color: "1F2430", bold: true } },
        { text: "年間 約" + man(agg.annualSavingYen), options: { fontFace: FONT, fontSize: 20, color: GREEN, bold: true } },
        { text: "  投資回収の目安: " + (agg.paybackYears != null ? "約" + agg.paybackYears + "年" : "—"), options: { fontFace: FONT, fontSize: 15, color: "1F2430", bold: true } }
      ], { x: 0.9, y: y + items.length * 1.05 + 0.25, w: 11.6, h: 0.9, valign: "middle" });
    }
  }

  /* スライド右側の画像列(既設写真・新機種イメージ等)。items: [{label, data}] */
  function sideImages(slide, items) {
    var y = 1.5;
    items.forEach(function (it) {
      if (!it || !it.data) { return; }
      slide.addText(it.label, { x: 9.35, y: y, w: 3.4, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: GRAY });
      slide.addImage({ data: it.data, x: 9.35, y: y + 0.32, w: 3.4, h: 2.05, sizing: { type: "contain", w: 3.4, h: 2.05 } });
      y += 2.65;
    });
  }

  /* ---- 店舗マップ(更新箇所) ---- */
  function buildMap(pptx, diag, state) {
    var slide = newSlide(pptx, "店舗レイアウトと更新箇所", state);
    slide.addImage({ data: diag.mapImage, x: 0.6, y: 1.15, w: 8.9, h: 5.5, sizing: { type: "contain", w: 8.9, h: 5.5 } });
    var legendY = 1.3;
    slide.addText("更新箇所", { x: 9.8, y: legendY, w: 3.0, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: NAVY });
    legendY += 0.45;
    (diag.mapCounts || []).forEach(function (c) {
      slide.addShape("ellipse", { x: 9.85, y: legendY + 0.06, w: 0.22, h: 0.22, fill: { color: (c.color || "#5A6472").replace("#", "") } });
      slide.addText(c.name + ": " + c.count + "箇所", { x: 10.15, y: legendY, w: 2.7, h: 0.34, fontFace: FONT, fontSize: 12, color: "1F2430", valign: "middle" });
      legendY += 0.42;
    });
    slide.addText("マーカーはヒアリング時点の想定位置です。正確な位置・台数は現地調査で確定します。",
      { x: 9.8, y: legendY + 0.2, w: 3.1, h: 1.2, fontFace: FONT, fontSize: 9.5, color: GRAY });
  }

  function pptxBox(slide, x, y, w, h, title, text) {
    slide.addShape("rect", { x: x, y: y, w: 2.4, h: h, fill: { color: NAVY } });
    slide.addText(title, { x: x, y: y, w: 2.4, h: h, fontFace: FONT, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle" });
    slide.addShape("rect", { x: x + 2.4, y: y, w: w - 2.4, h: h, fill: { color: LIGHT } });
    slide.addText(text, { x: x + 2.6, y: y, w: w - 2.8, h: h, fontFace: FONT, fontSize: 12.5, color: "1F2430", valign: "middle" });
  }

  /* ---- 空調 ---- */
  function buildAircon(pptx, diag, state) {
    var a = diag.aircon;
    var slide = newSlide(pptx, "空調設備のご提案", state);

    var adjText = a.cap.adjustments.length > 0
      ? "(" + a.cap.adjustments.map(function (x) { return x.name + "+" + Math.round(x.rate * 100) + "%"; }).join("・") + ")"
      : "";
    slide.addText([
      { text: "必要能力の考え方: ", options: { bold: true } },
      { text: a.cap.businessTypeName + " " + a.cap.areaTsubo + "坪 × " + a.cap.kwPerTsubo + "kW/坪 " + adjText + " → 約" + a.cap.requiredKw + "kW", options: {} }
    ], { x: 0.6, y: 1.0, w: 12.1, h: 0.45, fontFace: FONT, fontSize: 13, color: "1F2430" });

    slide.addText("推奨構成: " + a.plan.units + "台 × " + a.plan.cls.hp + "馬力(合計" + a.plan.totalKw + "kW)/ " + a.chosen.shapeName, {
      x: 0.6, y: 1.5, w: 12.1, h: 0.45, fontFace: FONT, fontSize: 15, bold: true, color: NAVY
    });

    var rows = [[th("ご提案"), th("メーカー"), th("シリーズ"), th("型番(代表例)"), th("グレード"), th("本体希望価格")]];
    a.candidates.forEach(function (cand) {
      var isChosen = cand === a.chosen;
      var mark = isChosen ? "◎" : "";
      var fill = isChosen ? { fill: { color: "E6F4EA" }, bold: true } : {};
      rows.push([
        td(mark, Object.assign({ align: "center" }, fill)),
        td(cand.maker, fill),
        td(cand.series, fill),
        td(cand.model + (cand.verified ? "" : " ※"), fill),
        td(cand.gradeName, fill),
        td(man(cand.price * a.plan.units) + "(" + a.plan.units + "台)", Object.assign({ align: "right" }, fill))
      ]);
    });
    slide.addTable(rows, {
      x: 0.6, y: 2.1, w: 8.5, colW: [0.6, 1.2, 1.9, 2.2, 1.0, 1.6],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 }, rowH: 0.4, autoPage: false, fontSize: 10
    });
    sideImages(slide, [
      { label: "既設の状況(写真)", data: diag.input.photos && diag.input.photos.aircon },
      { label: "新機種イメージ: " + a.chosen.maker + " " + a.chosen.series, data: a.image }
    ]);

    var noteY = 2.1 + (rows.length) * 0.42 + 0.25;
    slide.addText([
      { text: "工事費の目安: " + man(a.install.low) + "〜" + man(a.install.high) + "(標準工事・実額は現地調査後)\n", options: {} },
      { text: "既設(" + a.era.label + "設置・想定COP" + a.era.cop + ")→ 新機種(COP" + a.chosen.cop + ")で効率が大きく改善します。\n", options: {} },
      { text: "※印の型番は提案時点の代表例です。正式見積時に最新カタログで確認します。", options: { color: AMBER } }
    ], { x: 0.6, y: noteY, w: 12.1, h: 1.2, fontFace: FONT, fontSize: 11.5, color: GRAY, lineSpacing: 18 });
  }

  /* ---- 照明 ---- */
  function buildLighting(pptx, diag, state) {
    var L = diag.lighting;
    var slide = newSlide(pptx, "照明設備のご提案(LED化)", state);
    var rows = [[th("既設"), th("本数"), th("LED代替(候補)"), th("消費電力"), th("器具費(定価)")]];
    L.rows.forEach(function (r) {
      var opts = r.ledOptions.map(function (o) { return o.maker + " " + o.model + (o.verified ? "" : " ※"); }).join("\n");
      rows.push([
        td(r.typeName),
        td(r.count + "台", { align: "right" }),
        td(r.ledName + "\n" + opts, { fontSize: 9.5 }),
        td(r.existingWatt + "W → " + r.ledWatt + "W", { align: "right" }),
        td(man(r.productCost), { align: "right" })
      ]);
    });
    slide.addTable(rows, {
      x: 0.6, y: 1.1, w: 8.5, colW: [2.5, 0.7, 3.2, 1.2, 0.9],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 }, autoPage: false, rowH: 0.45, fontSize: 10
    });
    sideImages(slide, [
      { label: "既設の状況(写真)", data: diag.input.photos && diag.input.photos.lighting },
      { label: "LED器具イメージ", data: L.image }
    ]);
    var y = Math.min(6.0, 1.1 + rows.length * 0.75 + 0.3);
    slide.addText(
      "合計削減電力: 約" + num(L.totals.totalWattSaving) + "W / 交換工事の目安: " + man(L.totals.installLow) + "〜" + man(L.totals.installHigh) +
      "\nLED化により球替え・安定器交換のメンテナンス作業も不要になります。※印の型番は代表例(要最新確認)。",
      { x: 0.6, y: y, w: 8.5, h: 0.8, fontFace: FONT, fontSize: 11.5, color: GRAY, lineSpacing: 18 });
  }

  /* ---- 厨房 ---- */
  function buildKitchen(pptx, diag, state) {
    var K = diag.kitchen;
    var slide = newSlide(pptx, "厨房冷凍機器のご提案", state);
    var rows = [[th("機器"), th("台数"), th("年式帯"), th("後継候補(代表例)"), th("年間消費電力量(推計)"), th("本体希望価格")]];
    K.rows.forEach(function (r) {
      var opts = r.options.map(function (o) { return o.maker + " " + o.model + (o.verified ? "" : " ※"); }).join("\n");
      rows.push([
        td(r.typeName + "\n" + r.sizeName, { fontSize: 10 }),
        td(r.count + "台", { align: "right" }),
        td(r.eraLabel),
        td(opts, { fontSize: 9.5 }),
        td(num(r.existingAnnualKwh) + " → " + num(r.newAnnualKwh) + " kWh/年", { align: "right" }),
        td(man(r.productCost), { align: "right" })
      ]);
    });
    slide.addTable(rows, {
      x: 0.6, y: 1.1, w: 8.5, colW: [1.8, 0.6, 1.1, 2.5, 1.7, 0.8],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 }, autoPage: false, rowH: 0.5, fontSize: 9.5
    });
    sideImages(slide, [
      { label: "既設の状況(写真)", data: diag.input.photos && diag.input.photos.kitchen },
      { label: "新機種イメージ", data: K.image }
    ]);
    var y = Math.min(6.0, 1.1 + rows.length * 0.8 + 0.3);
    slide.addText(
      "冷蔵・冷凍機器は24時間365日通電のため、古い機器ほど電気代の差が大きく出ます。" +
      "更新により故障(食材ロス・営業停止)のリスクも低減できます。年式帯からの推計値であり、実測ではありません。※印の型番は代表例(要最新確認)。",
      { x: 0.6, y: y, w: 8.5, h: 0.9, fontFace: FONT, fontSize: 11.5, color: GRAY, lineSpacing: 18 });
  }

  /* ---- なぜ今、設備更新か(電気料金の構造+規制の正確な事実) ---- */
  function buildBackground(pptx, diag, state) {
    var bg = diag.background;
    var slide = newSlide(pptx, "なぜ今、設備更新か(背景)", state);

    function factBox(x, section) {
      slide.addShape("rect", { x: x, y: 1.15, w: 5.95, h: 0.55, fill: { color: NAVY } });
      slide.addText(section.title, { x: x + 0.15, y: 1.15, w: 5.7, h: 0.55, fontFace: FONT, fontSize: 13, bold: true, color: WHITE, valign: "middle" });
      var facts = section.facts.filter(function (f) { return f.verified; });
      var parts = [];
      facts.forEach(function (f) {
        parts.push({ text: "● " + f.text + "\n", options: { fontSize: 11.5, color: "1F2430", bold: false } });
        if (f.detail) { parts.push({ text: "  " + f.detail + "\n", options: { fontSize: 10, color: GRAY } }); }
      });
      slide.addShape("rect", { x: x, y: 1.7, w: 5.95, h: 3.3, fill: { color: LIGHT } });
      slide.addText(parts, { x: x + 0.15, y: 1.8, w: 5.65, h: 3.1, valign: "top", fontFace: FONT, lineSpacing: 16 });
      slide.addShape("rect", { x: x, y: 5.05, w: 5.95, h: 0.95, fill: { color: "E6F4EA" } });
      slide.addText(section.implication, { x: x + 0.15, y: 5.1, w: 5.65, h: 0.85, fontFace: FONT, fontSize: 11, bold: true, color: GREEN, valign: "middle" });
      // 出典(verifiedのみ)
      var sources = facts.map(function (f) { return f.source; }).filter(function (s, i, arr) { return s && arr.indexOf(s) === i; });
      slide.addText("出典: " + sources.join(" / "), { x: x, y: 6.05, w: 5.95, h: 0.5, fontFace: FONT, fontSize: 8.5, color: GRAY });
    }
    factBox(0.5, bg.electricity);
    factBox(6.85, bg.regulation);
    slide.addText("※制度・料金は変動します。記載は作成時点で公的資料により確認した事実に限っています(誇張した省エネ表示は行いません)。",
      { x: 0.5, y: 6.6, w: 12.3, h: 0.4, fontFace: FONT, fontSize: 9, color: GRAY });
  }

  /* ---- 費用ゼロの運用改善+公的診断への橋渡し ---- */
  function buildOperations(pptx, diag, state) {
    var op = diag.operations;
    var slide = newSlide(pptx, "あわせてご提案: 費用ゼロでできる運用改善", state);
    var rows = [[th("チェック項目"), th("ポイント")]];
    op.items.forEach(function (it) {
      rows.push([td(it.name, { bold: true }), td(it.tip, { fontSize: 10 })]);
    });
    slide.addTable(rows, {
      x: 0.6, y: 1.1, w: 12.1, colW: [3.6, 8.5],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 }, autoPage: false, rowH: 0.38, fontSize: 10.5
    });
    var y = Math.min(5.5, 1.1 + rows.length * 0.45 + 0.2);
    slide.addShape("rect", { x: 0.6, y: y, w: 12.1, h: 1.1, fill: { color: LIGHT } });
    slide.addText([
      { text: op.diagnosis.name + "(" + op.diagnosis.cost + ")\n", options: { bold: true, fontSize: 12, color: NAVY } },
      { text: op.diagnosis.summary + " " + op.diagnosis.note, options: { fontSize: 10.5, color: "1F2430" } }
    ], { x: 0.8, y: y + 0.08, w: 11.7, h: 0.95, valign: "top", fontFace: FONT, lineSpacing: 15 });
    slide.addText("運用改善の効果は使い方・環境により異なります。定量的な把握には上記の公的診断をご活用いただけます。",
      { x: 0.6, y: y + 1.25, w: 12.1, h: 0.4, fontFace: FONT, fontSize: 9.5, color: GRAY });
  }

  /* ---- 商圏の地域特性(人口動態) ---- */
  function buildDemographics(pptx, diag, state) {
    var dg = diag.demographics;
    var slide = newSlide(pptx, "商圏の地域特性と店づくりの方向性(" + dg.city.name + ")", state);

    // 左: 4指標の比較グラフ(当該市区町村 vs 府県平均)
    slide.addChart(pptx.ChartType.bar, [
      { name: dg.city.name, labels: dg.comparison.map(function (c) { return c.label; }), values: dg.comparison.map(function (c) { return c.value; }) },
      { name: dg.pref.name + "平均", labels: dg.comparison.map(function (c) { return c.label; }), values: dg.comparison.map(function (c) { return c.prefAvg; }) }
    ], {
      x: 0.5, y: 1.15, w: 6.6, h: 4.3,
      barDir: "bar",
      chartColors: ["1F3050", "8B95A5"],
      showValue: true, dataLabelFormatCode: '0.0"%"', dataLabelFontSize: 9,
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
      showLegend: true, legendPos: "b", legendFontSize: 10,
      valAxisMaxVal: Math.ceil(Math.max.apply(null, dg.comparison.map(function (c) { return Math.max(c.value, c.prefAvg); })) / 10) * 10 + 10,
      fontFace: FONT
    });

    // 右: 方向性の提案(最大2件)
    var y = 1.15;
    slide.addText("この商圏の特徴と改装の方向性", { x: 7.4, y: y, w: 5.4, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: NAVY });
    y += 0.5;
    dg.recommendations.forEach(function (r) {
      var itemsText = r.items.map(function (it) { return "・" + it; }).join("\n");
      slide.addShape("rect", { x: 7.4, y: y, w: 5.4, h: 2.15, fill: { color: LIGHT } });
      slide.addText([
        { text: r.title + "\n", options: { bold: true, fontSize: 13, color: NAVY } },
        { text: itemsText + "\n", options: { fontSize: 11, color: "1F2430" } },
        { text: r.reason, options: { fontSize: 9.5, color: GRAY } }
      ], { x: 7.55, y: y + 0.08, w: 5.1, h: 2.0, valign: "top", fontFace: FONT, lineSpacing: 15 });
      y += 2.3;
    });

    // 下: 事例(改装カテゴリ選択時・1件 — 判定された特性に合う事例を優先)+出典
    if (diag.renoCases && diag.renoCases.length > 0) {
      var cs = null;
      (dg.dominant || []).forEach(function (d) {
        if (!cs) { cs = diag.renoCases.filter(function (x) { return x.traitId === d.id; })[0] || null; }
      });
      cs = cs || diag.renoCases[0];
      slide.addText([
        { text: "改装効果の考え方: ", options: { bold: true, color: NAVY } },
        { text: cs.title + " — " + cs.effect + (cs.source ? "(出典: " + cs.source + ")" : "(一般に言われる傾向)"), options: { color: "1F2430" } }
      ], { x: 0.5, y: 5.65, w: 12.3, h: 0.6, fontFace: FONT, fontSize: 11, valign: "top" });
    }
    slide.addText("出典: 総務省統計局『令和2年国勢調査』。市区町村単位の集計であり、店舗前の実際の客層は立地により異なります。改装の効果は立地・業態・運営により異なり、売上を保証するものではありません。",
      { x: 0.5, y: 6.35, w: 12.3, h: 0.55, fontFace: FONT, fontSize: 9, color: GRAY });
  }

  /* ---- 改装 ---- */
  function buildRenovation(pptx, diag, state) {
    var re = diag.renovation;
    var slide = newSlide(pptx, "店舗改装のご提案(概算)", state);
    if (re.purposes.length > 0) {
      slide.addText("目的: " + re.purposes.join("・"), { x: 0.6, y: 1.0, w: 12.1, h: 0.4, fontFace: FONT, fontSize: 13, bold: true, color: NAVY });
    }
    var rows = [[th("工事メニュー"), th("数量"), th("概算レンジ(税別)")]];
    re.estimate.breakdown.forEach(function (b) {
      rows.push([
        td(b.name),
        td(b.unit === "tsubo" ? b.quantity + "坪" : "一式", { align: "right" }),
        td(man(b.low) + " 〜 " + man(b.high), { align: "right" })
      ]);
    });
    rows.push([
      td("概算合計", { bold: true, fill: { color: LIGHT } }),
      td("", { fill: { color: LIGHT } }),
      td(man(re.estimate.low) + " 〜 " + man(re.estimate.high), { bold: true, align: "right", fill: { color: LIGHT } })
    ]);
    slide.addTable(rows, {
      x: 0.6, y: 1.5, w: 8.5, colW: [4.3, 1.4, 2.8],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 }, autoPage: false, rowH: 0.42, fontSize: 10
    });
    sideImages(slide, [
      { label: "現状(ビフォー)", data: diag.input.photos && diag.input.photos.renovation },
      { label: "施工イメージ(アフター)", data: diag.input.photos && diag.input.photos.renovationAfter }
    ]);
    var y = 1.5 + rows.length * 0.44 + 0.3;
    var sched = "進め方: " + (window.SS_MASTER_RENOVATION ? window.SS_MASTER_RENOVATION.schedule.map(function (s) { return s.step + "(" + s.duration + ")"; }).join(" → ") : "");
    slide.addText(sched +
      ((re.timing ? "\n希望時期: " + re.timing : "") + (re.budget ? " / 予算感: " + re.budget : "")) +
      "\n営業を止めない夜間・休業日の施工もご相談いただけます。金額は仕様・下地の状態により変動します。",
      { x: 0.6, y: Math.min(y, 5.8), w: 8.5, h: 1.1, fontFace: FONT, fontSize: 11.5, color: GRAY, lineSpacing: 18 });
  }

  /* ---- 経済効果 ---- */
  function buildEconomics(pptx, diag, state, C) {
    var agg = diag.econAggregate;
    var input = diag.input;
    var slide = newSlide(pptx, "設備更新による経済効果(概算)", state);

    // 左: 指標
    var metrics = [
      ["年間電気代の削減", "約" + man(agg.annualSavingYen) + "/年", GREEN],
      ["概算投資(本体+工事)", man(agg.investLow) + "〜" + man(agg.investHigh), NAVY],
      ["投資回収の目安", agg.paybackYears != null ? "約" + agg.paybackYears + "年" : "—", NAVY],
      [C.ECON_YEARS + "年間の累計効果", "約" + man(agg.tenYearNet), agg.tenYearNet >= 0 ? GREEN : AMBER]
    ];
    metrics.forEach(function (m, i) {
      var y = 1.15 + i * 1.05;
      slide.addShape("rect", { x: 0.6, y: y, w: 5.4, h: 0.92, fill: { color: LIGHT } });
      slide.addText(m[0], { x: 0.85, y: y + 0.08, w: 4.9, h: 0.3, fontFace: FONT, fontSize: 11, color: GRAY });
      slide.addText(m[1], { x: 0.85, y: y + 0.34, w: 4.9, h: 0.5, fontFace: FONT, fontSize: 19, bold: true, color: m[2] });
    });

    // 右: 現状vs提案後の年間電気代グラフ
    var oldCost = agg.existingAnnualKwh * input.tariff;
    var newCost = agg.newAnnualKwh * input.tariff;
    slide.addChart(pptx.ChartType.bar, [
      { name: "年間電気代(概算)", labels: ["現状", "ご提案後"], values: [Math.round(oldCost / 10000), Math.round(newCost / 10000)] }
    ], {
      x: 6.4, y: 1.15, w: 6.3, h: 4.1,
      barDir: "col",
      chartColors: ["8B95A5", "2E8B57"],
      showValue: true,
      dataLabelFormatCode: '#,##0"万円"',
      valAxisTitle: "万円/年",
      showValAxisTitle: false,
      catAxisLabelFontSize: 12, valAxisLabelFontSize: 10,
      dataLabelFontSize: 13, dataLabelFontBold: true,
      showLegend: false, fontFace: FONT
    });

    // 下: カテゴリ別内訳
    var rows = [[th("カテゴリ"), th("現状電気代(推計)"), th("ご提案後"), th("年間削減"), th("回収目安")]];
    [["空調", diag.econ.aircon], ["照明", diag.econ.lighting], ["厨房冷凍", diag.econ.kitchen]].forEach(function (pair) {
      var e = pair[1];
      if (!e) { return; }
      rows.push([
        td(pair[0]),
        td(man(e.existingAnnualKwh * input.tariff) + "/年", { align: "right" }),
        td(man(e.newAnnualKwh * input.tariff) + "/年", { align: "right" }),
        td(man(e.annualSavingYen) + "/年", { align: "right", color: GREEN, bold: true }),
        td(e.paybackYears != null ? "約" + e.paybackYears + "年" : "—", { align: "right" })
      ]);
    });
    slide.addTable(rows, {
      x: 0.6, y: 5.45, w: 12.1, colW: [2.2, 2.8, 2.6, 2.5, 2.0],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 }, autoPage: false, rowH: 0.34, fontSize: 10
    });
    slide.addText("前提: 電気単価" + input.tariff + "円/kWh・営業" + input.hoursPerDay + "時間/日×" + input.daysPerMonth +
      "日/月・機器価格=" + (input.priceRatePercent === 100 ? "メーカー希望価格" : "メーカー希望価格×" + input.priceRatePercent + "%") +
      "・空調負荷率" + C.AIRCON_LOAD_FACTOR + "・年式帯の代表効率による推計。実際の使用状況・契約条件により変動します。",
      { x: 0.6, y: 6.75, w: 12.1, h: 0.3, fontFace: FONT, fontSize: 9, color: GRAY });
  }

  /* ---- 投資回収の見通し(1年単位の累積折れ線+損益分岐点) ---- */
  function buildPayback(pptx, diag, state, C) {
    var agg = diag.econAggregate;
    var slide = newSlide(pptx, "投資回収の見通し(累積効果・概算)", state);
    /* 損益分岐点がグラフ内に必ず映るよう表示年数を伸ばす(見せたい交差点が切れるのを防ぐ) */
    var years = SSEconomicsRef.paybackChartYears(agg.paybackYears, C);
    var breakEven = (agg.paybackYears != null) ? Math.ceil(agg.paybackYears) : null;
    var labels = [], cum = [], invest = [];
    for (var i = 0; i <= years; i++) {
      labels.push(i === 0 ? "現在" : (i === breakEven ? "★" + i + "年目" : i + "年目"));
      cum.push(Math.round(agg.annualSavingYen * i / 10000));
      invest.push(Math.round(agg.investMid / 10000));
    }
    slide.addChart(pptx.ChartType.line, [
      { name: "電気代削減の累積", labels: labels, values: cum },
      { name: "投資額(概算・中央値)", labels: labels, values: invest }
    ], {
      x: 0.6, y: 1.1, w: 12.1, h: 4.7,
      chartColors: ["2E8B57", "B00020"],
      lineSize: 3,
      lineDataSymbol: "circle", lineDataSymbolSize: 7,
      showLegend: true, legendPos: "b", legendFontSize: 11,
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
      valAxisTitle: "万円", showValAxisTitle: true, valAxisTitleFontSize: 10,
      showValue: false, fontFace: FONT
    });
    var noteOpts = { x: 0.6, y: 6.0, w: 12.1, h: 0.9, fontFace: FONT, fontSize: 14, valign: "top" };
    if (agg.paybackYears != null && agg.paybackYears <= years) {
      slide.addText([
        { text: "約" + agg.paybackYears + "年", options: { bold: true, fontSize: 18, color: GREEN } },
        { text: " で累積削減額が投資額を上回ります(損益分岐点)。グラフの★印は、投資額を上回る最初の年です。", options: { color: "1F2430" } },
        { text: "以降は削減額がそのまま利益になり、" + (C.ECON_YEARS || 10) + "年間の累計効果は約" + man(agg.tenYearNet) + "です。", options: { bold: true, color: agg.tenYearNet >= 0 ? GREEN : AMBER } }
      ], noteOpts);
    } else {
      slide.addText([
        { text: "この前提では" + years + "年以内に損益分岐点へ到達しません。", options: { bold: true, color: AMBER } },
        { text: " 補助金の活用・機器グレードの見直し・電気単価の実態反映により改善する可能性があります(担当までご相談ください)。", options: { color: "1F2430" } }
      ], noteOpts);
    }
  }

  /* ---- 補助金 ---- */
  function buildSubsidy(pptx, diag, state) {
    var slide = newSlide(pptx, "活用できる可能性のある補助金", state);
    var rows = [[th("制度名"), th("概要"), th("補助率・公募")]];
    diag.subsidies.forEach(function (s) {
      rows.push([
        td(s.name + "\n(" + s.admin + ")", { fontSize: 10, bold: true }),
        td(s.summary + "\n【注意】" + s.caution, { fontSize: 9.5 }),
        td(s.rateNote + "\n" + s.seasonNote, { fontSize: 9.5 })
      ]);
    });
    slide.addTable(rows, {
      x: 0.6, y: 1.1, w: 12.1, colW: [3.6, 5.9, 2.6],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 }, autoPage: false, rowH: 0.9
    });
    slide.addText("補助金は公募時期・要件が毎年変わります。上記は「該当の可能性」であり、申請可否は最新の公募要領で確認のうえ、申請サポートも含めてご相談ください。",
      { x: 0.6, y: 1.2 + diag.subsidies.length * 1.15 + 0.3, w: 12.1, h: 0.6, fontFace: FONT, fontSize: 11, color: AMBER, bold: true });
  }

  /* ---- 進め方 ---- */
  function buildProcess(pptx, diag, state) {
    var slide = newSlide(pptx, "導入の進め方", state);
    var steps = [
      ["現地調査", "設備・電源・搬入経路を確認(無料)"],
      ["正式お見積り", "実測に基づく機種選定と金額のご提示"],
      ["ご契約", "工事日程の調整(夜間・休業日も相談可)"],
      ["施工", "営業への影響を最小限に工事を実施"],
      ["アフターフォロー", "保証・メンテナンス・補助金実績報告の支援"]
    ];
    var w = 2.25, gap = 0.18, x0 = 0.6, y = 2.3;
    steps.forEach(function (s, i) {
      var x = x0 + i * (w + gap);
      slide.addShape("rect", { x: x, y: y, w: w, h: 0.7, fill: { color: NAVY } });
      slide.addText((i + 1) + ". " + s[0], { x: x, y: y, w: w, h: 0.7, fontFace: FONT, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle" });
      slide.addShape("rect", { x: x, y: y + 0.7, w: w, h: 1.5, fill: { color: LIGHT } });
      slide.addText(s[1], { x: x + 0.08, y: y + 0.78, w: w - 0.16, h: 1.34, fontFace: FONT, fontSize: 10.5, color: "1F2430", valign: "top" });
    });
    slide.addText("最短で現地調査から2〜3週間で正式見積のご提示が可能です。補助金を活用する場合は公募スケジュールに合わせた進行をご提案します。",
      { x: 0.6, y: 4.9, w: 12.1, h: 0.6, fontFace: FONT, fontSize: 12, color: GRAY });

    // 製品情報・ARのQR(検証済み公式URLのみ・B3)
    if (diag.qrLinks && diag.qrLinks.length > 0) {
      slide.addText("スマホでご覧いただけます(メーカー公式ページ・AR設置シミュレーション)", { x: 0.6, y: 5.55, w: 12.1, h: 0.35, fontFace: FONT, fontSize: 11, bold: true, color: NAVY });
      diag.qrLinks.slice(0, 4).forEach(function (q, i) {
        var x = 0.7 + i * 3.15;
        slide.addImage({ data: q.data, x: x, y: 5.95, w: 0.85, h: 0.85 });
        slide.addText(q.label, { x: x + 0.95, y: 5.95, w: 2.1, h: 0.85, fontFace: FONT, fontSize: 8.5, color: "1F2430", valign: "middle" });
      });
    }
  }

  /* ---- 留意事項 ---- */
  function buildNotes(pptx, diag, state) {
    var slide = newSlide(pptx, "本資料に関する留意事項", state);
    var notes = [
      "本資料の金額・効果はすべて概算の目安です。正式なご提案・お見積りは現地調査のうえ作成いたします。",
      "機器の型番は提案時点の代表例です。生産終了・後継機種への変更があり得るため、受注前に最新カタログで確認いたします。",
      "電気代の削減効果は、記載の前提(電気単価・稼働時間・負荷率・年式帯の代表効率)に基づく推計であり、実際の使用状況・契約条件により変動します。",
      "空調の正式な機種選定には現地調査(断熱・開口部・熱源・電源容量の確認)が必要です。",
      "補助金は公募時期・要件が変動します。申請可否は最新の公募要領によります。",
      "価格はメーカー希望価格(税別)ベースです。実際のご提供価格はお見積りにてご提示いたします。"
    ];
    slide.addText(notes.map(function (n) {
      return { text: n, options: { bullet: { characterCode: "2022", indent: 12 }, fontFace: FONT, fontSize: 13, color: "1F2430", paraSpaceAfter: 10 } };
    }), { x: 0.8, y: 1.3, w: 11.7, h: 5.0, valign: "top" });
  }

  /* ---- 店舗間比較レポート(B1) — stores: [{name, diag}] ---- */
  function buildComparison(stores, C) {
    var pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
    pptx.layout = "WIDE";
    var company = stores[0] && stores[0].diag.input.meta.companyName || "";
    var state = { page: 0, company: company };
    var slide = newSlide(pptx, "店舗間比較(設備更新の効果・概算)", state);

    slide.addChart(pptx.ChartType.bar, [
      { name: "年間削減額(万円)", labels: stores.map(function (s) { return s.name; }), values: stores.map(function (s) { return Math.round((s.diag.econAggregate ? s.diag.econAggregate.annualSavingYen : 0) / 10000); }) }
    ], {
      x: 0.6, y: 1.15, w: 6.4, h: 4.4, barDir: "bar",
      chartColors: ["2E8B57"], showValue: true, dataLabelFormatCode: '#,##0"万円"',
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 9, showLegend: false, fontFace: FONT
    });

    var rows = [[th("店舗"), th("所在地"), th("年間削減額"), th("投資(中央値)"), th("回収目安"), th("商圏の特徴")]];
    stores.forEach(function (s) {
      var agg = s.diag.econAggregate || {};
      rows.push([
        td(s.name, { bold: true, fontSize: 10 }),
        td(s.diag.demographics ? s.diag.demographics.city.name : "—", { fontSize: 10 }),
        td(agg.annualSavingYen ? man(agg.annualSavingYen) + "/年" : "—", { align: "right", fontSize: 10 }),
        td(agg.investMid ? man(agg.investMid) : "—", { align: "right", fontSize: 10 }),
        td(agg.paybackYears != null ? "約" + agg.paybackYears + "年" : "—", { align: "right", fontSize: 10 }),
        td(s.diag.demographics ? s.diag.demographics.recommendations.map(function (r) { return r.traitLabel; }).join("・") : "—", { fontSize: 9 })
      ]);
    });
    slide.addTable(rows, {
      x: 7.2, y: 1.15, w: 5.6, colW: [1.3, 0.9, 1.0, 1.0, 0.7, 0.7],
      border: { type: "solid", color: "D9DDE3", pt: 0.75 }, autoPage: false, rowH: 0.4
    });
    slide.addText("各店舗の入力前提(電気単価・営業時間・価格係数)はそれぞれの保存内容によります。優先順位づけ(どの店舗から更新するか)のご検討にお使いください。",
      { x: 0.6, y: 5.9, w: 12.1, h: 0.6, fontFace: FONT, fontSize: 10.5, color: GRAY });
    return pptx;
  }

  return { build: build, buildComparison: buildComparison };
});
