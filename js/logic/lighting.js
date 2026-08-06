/* 照明ロジック — 既設タイプごとのLED換算(純関数) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SSLighting = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  /* rows: [{ typeId, count }] → 換算結果の配列 */
  function plan(rows, master, C) {
    var results = [];
    rows.forEach(function (row) {
      if (!(row.count > 0)) { return; }
      var t = null;
      for (var i = 0; i < master.types.length; i++) {
        if (master.types[i].id === row.typeId) { t = master.types[i]; break; }
      }
      if (!t) { throw new Error("未知の照明タイプ: " + row.typeId); }
      var wattSavingPerUnit = t.watt - t.led.watt;
      results.push({
        typeId: t.id,
        typeName: t.name,
        count: row.count,
        existingWatt: t.watt,
        ledName: t.led.name,
        ledWatt: t.led.watt,
        ledOptions: t.led.options,
        ledImageKey: t.led.imageKey || null,
        wattSavingPerUnit: wattSavingPerUnit,
        totalWattSaving: wattSavingPerUnit * row.count,
        productCost: t.led.price * row.count,
        installLow: C.INSTALL_COST_LIGHTING_PER_UNIT.low * row.count,
        installHigh: C.INSTALL_COST_LIGHTING_PER_UNIT.high * row.count
      });
    });
    return results;
  }

  /* 合計(W削減・器具費・工事費) */
  function totals(results) {
    var out = { count: 0, totalWattSaving: 0, productCost: 0, installLow: 0, installHigh: 0 };
    results.forEach(function (r) {
      out.count += r.count;
      out.totalWattSaving += r.totalWattSaving;
      out.productCost += r.productCost;
      out.installLow += r.installLow;
      out.installHigh += r.installHigh;
    });
    return out;
  }

  /* plan()の結果行に「蛍光」を含むtypeNameが1つでもあるか(水俣条約の規制ブロック表示判定・純関数) */
  function hasFluorescent(rows) {
    return rows.some(function (r) { return r.typeName && r.typeName.indexOf("蛍光") >= 0; });
  }

  return { plan: plan, totals: totals, hasFluorescent: hasFluorescent };
});
