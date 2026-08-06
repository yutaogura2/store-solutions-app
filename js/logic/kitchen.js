/* 厨房冷凍機器ロジック — 後継候補の選定と既設消費電力量の推計(純関数) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SSKitchen = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  function findType(typeId, master) {
    for (var i = 0; i < master.types.length; i++) {
      if (master.types[i].id === typeId) { return master.types[i]; }
    }
    return null;
  }

  function eraFactor(year, master) {
    var eras = master.eraFactors;
    for (var i = 0; i < eras.length; i++) {
      if (year <= eras[i].until) { return eras[i]; }
    }
    return eras[eras.length - 1];
  }

  /* rows: [{ typeId, sizeId, year, count }] → 機器ごとの診断結果 */
  function plan(rows, master, C) {
    var results = [];
    rows.forEach(function (row) {
      if (!(row.count > 0)) { return; }
      var t = findType(row.typeId, master);
      if (!t) { throw new Error("未知の厨房機器タイプ: " + row.typeId); }
      var size = null;
      for (var i = 0; i < t.sizes.length; i++) {
        if (t.sizes[i].id === row.sizeId) { size = t.sizes[i]; break; }
      }
      if (!size) { throw new Error("未知のサイズ: " + row.typeId + "/" + row.sizeId); }
      var era = eraFactor(row.year || 2005, master);
      var existingKwh = Math.round(size.annualKwh * era.factor) * row.count;
      var newKwh = size.annualKwh * row.count;
      results.push({
        typeId: t.id,
        typeName: t.name,
        imageKey: t.imageKey || null,
        sizeName: size.name,
        count: row.count,
        year: row.year,
        eraLabel: era.label,
        existingAnnualKwh: existingKwh,
        newAnnualKwh: newKwh,
        annualKwhSaving: existingKwh - newKwh,
        options: size.options,
        productCost: size.price * row.count,
        installLow: C.INSTALL_COST_KITCHEN_PER_UNIT.low * row.count,
        installHigh: C.INSTALL_COST_KITCHEN_PER_UNIT.high * row.count
      });
    });
    return results;
  }

  function totals(results) {
    var out = { count: 0, existingAnnualKwh: 0, newAnnualKwh: 0, annualKwhSaving: 0, productCost: 0, installLow: 0, installHigh: 0 };
    results.forEach(function (r) {
      out.count += r.count;
      out.existingAnnualKwh += r.existingAnnualKwh;
      out.newAnnualKwh += r.newAnnualKwh;
      out.annualKwhSaving += r.annualKwhSaving;
      out.productCost += r.productCost;
      out.installLow += r.installLow;
      out.installHigh += r.installHigh;
    });
    return out;
  }

  return { plan: plan, totals: totals, eraFactor: eraFactor };
});
