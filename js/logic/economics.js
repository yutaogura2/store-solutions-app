/* 経済効果ロジック — 電気代推計・投資回収(純関数・すべて概算の目安)
   モデル: 空調は「新設備の能力×負荷率×稼働時間」を熱需要とみなし、効率(COP)差だけを効果として計上する
   (既設が能力不足/過大でも同じ土俵で比較するための単純化。前提は資料に明記する) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SSEconomics = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  function round1(x) { return Math.round(x * 10) / 10; }

  /* 空調の年間消費電力量(kWh) */
  function airconAnnualKwh(servedKw, cop, hoursPerDay, daysPerMonth, C) {
    if (!(cop > 0)) { throw new Error("COPが不正です"); }
    return Math.round(
      servedKw * C.AIRCON_LOAD_FACTOR * hoursPerDay * daysPerMonth * C.AIRCON_MONTHS_PER_YEAR / cop
    );
  }

  /* 空調の経済効果 */
  function airconEconomics(params, C) {
    // params: { servedKw, existingCop, newCop, hoursPerDay, daysPerMonth, tariff, productCost, installLow, installHigh }
    var oldKwh = airconAnnualKwh(params.servedKw, params.existingCop, params.hoursPerDay, params.daysPerMonth, C);
    var newKwh = airconAnnualKwh(params.servedKw, params.newCop, params.hoursPerDay, params.daysPerMonth, C);
    var savingKwh = oldKwh - newKwh;
    return buildResult(oldKwh, newKwh, savingKwh, params.tariff, params.productCost, params.installLow, params.installHigh, C);
  }

  /* 照明の経済効果(totalWattSaving: W合計) */
  function lightingEconomics(params, C) {
    // params: { totalWattSaving, existingWattTotal, hoursPerDay, daysPerMonth, tariff, productCost, installLow, installHigh }
    var hoursYear = params.hoursPerDay * params.daysPerMonth * 12 * (C.LIGHTING_ON_RATIO || 1);
    var oldKwh = Math.round((params.existingWattTotal || 0) / 1000 * hoursYear);
    var savingKwh = Math.round(params.totalWattSaving / 1000 * hoursYear);
    var newKwh = oldKwh - savingKwh;
    return buildResult(oldKwh, newKwh, savingKwh, params.tariff, params.productCost, params.installLow, params.installHigh, C);
  }

  /* 厨房の経済効果(既に年間kWhが出ている) */
  function kitchenEconomics(params, C) {
    // params: { existingAnnualKwh, newAnnualKwh, tariff, productCost, installLow, installHigh }
    var savingKwh = params.existingAnnualKwh - params.newAnnualKwh;
    return buildResult(params.existingAnnualKwh, params.newAnnualKwh, savingKwh, params.tariff, params.productCost, params.installLow, params.installHigh, C);
  }

  function buildResult(oldKwh, newKwh, savingKwh, tariff, productCost, installLow, installHigh, C) {
    var savingYen = Math.round(savingKwh * tariff);
    var investLow = (productCost || 0) + (installLow || 0);
    var investHigh = (productCost || 0) + (installHigh || 0);
    var investMid = Math.round((investLow + investHigh) / 2);
    return {
      existingAnnualKwh: oldKwh,
      newAnnualKwh: newKwh,
      annualSavingKwh: savingKwh,
      annualSavingYen: savingYen,
      productCost: productCost || 0,
      investLow: investLow,
      investHigh: investHigh,
      investMid: investMid,
      paybackYears: savingYen > 0 ? round1(investMid / savingYen) : null,
      tenYearNet: savingYen * (C.ECON_YEARS || 10) - investMid
    };
  }

  /* リース試算(概算) — 月額=投資額×月額料率。実質月額負担=リース月額−月々の電気代削減額 */
  function leaseCalc(investMid, annualSavingYen, leaseYears, monthlyRatePercent) {
    if (!(investMid > 0) || !(leaseYears > 0) || !(monthlyRatePercent > 0)) { return null; }
    var monthly = Math.round(investMid * monthlyRatePercent / 100);
    var monthlySaving = Math.round(annualSavingYen / 12);
    return {
      years: leaseYears,
      ratePercent: monthlyRatePercent,
      monthly: monthly,
      totalPayment: monthly * leaseYears * 12,
      monthlySaving: monthlySaving,
      netMonthly: monthly - monthlySaving,           // 正=実質持ち出し / 負=削減がリース料を上回る
      coverRatio: monthly > 0 ? Math.round(monthlySaving / monthly * 100) : null  // 削減がリース料の何%をカバーするか
    };
  }

  /* 投資回収グラフの表示年数
     損益分岐点が既定年数(10年)より先にある場合、既定のままだと肝心の交差点がグラフに映らないため
     分岐点+1年まで伸ばす(上限あり)。到達しない/超長期なら上限で打ち切る */
  function paybackChartYears(paybackYears, C) {
    var base = C.ECON_YEARS || 10;
    var max = C.ECON_CHART_MAX_YEARS || 20;
    // 分岐点が既定年数の内側(または不明)なら既定のまま — 「10年間の累計効果」の説明と軸を揃える
    if (!(paybackYears > base)) { return base; }
    return Math.min(max, Math.ceil(paybackYears) + 1);
  }

  /* 複数カテゴリの合算 */
  function aggregate(results, C) {
    var out = { existingAnnualKwh: 0, newAnnualKwh: 0, annualSavingKwh: 0, annualSavingYen: 0, productCost: 0, investLow: 0, investHigh: 0, investMid: 0 };
    results.forEach(function (r) {
      if (!r) { return; }
      out.existingAnnualKwh += r.existingAnnualKwh;
      out.newAnnualKwh += r.newAnnualKwh;
      out.annualSavingKwh += r.annualSavingKwh;
      out.annualSavingYen += r.annualSavingYen;
      out.productCost += r.productCost;
      out.investLow += r.investLow;
      out.investHigh += r.investHigh;
      out.investMid += r.investMid;
    });
    out.paybackYears = out.annualSavingYen > 0 ? round1(out.investMid / out.annualSavingYen) : null;
    out.tenYearNet = out.annualSavingYen * (C.ECON_YEARS || 10) - out.investMid;
    // CO2削減の概算(排出係数×削減kWh)と杉の木換算
    out.co2Kg = Math.round(out.annualSavingKwh * (C.CO2_KG_PER_KWH || 0));
    out.sugiTrees = C.SUGI_CO2_KG_PER_TREE > 0 ? Math.round(out.co2Kg / C.SUGI_CO2_KG_PER_TREE) : 0;
    return out;
  }

  return {
    airconAnnualKwh: airconAnnualKwh,
    airconEconomics: airconEconomics,
    lightingEconomics: lightingEconomics,
    kitchenEconomics: kitchenEconomics,
    paybackChartYears: paybackChartYears,
    leaseCalc: leaseCalc,
    aggregate: aggregate
  };
});
