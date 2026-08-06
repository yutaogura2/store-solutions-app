/* 店舗改装ロジック — 工事メニューの概算レンジ集計(純関数) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SSRenovation = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  /* selections: [{ menuId, quantity }] quantity: unit=tsubo のときは坪数 / shiki のときは 1(式) */
  function estimate(selections, master) {
    var breakdown = [];
    var low = 0, high = 0;
    selections.forEach(function (sel) {
      var menu = null;
      for (var i = 0; i < master.menus.length; i++) {
        if (master.menus[i].id === sel.menuId) { menu = master.menus[i]; break; }
      }
      if (!menu) { throw new Error("未知の工事メニュー: " + sel.menuId); }
      var qty = menu.unit === "tsubo" ? (sel.quantity || 0) : 1;
      if (menu.unit === "tsubo" && !(qty > 0)) { return; }
      var rowLow = menu.low * qty;
      var rowHigh = menu.high * qty;
      low += rowLow; high += rowHigh;
      breakdown.push({
        menuId: menu.id,
        name: menu.name,
        unit: menu.unit,
        quantity: qty,
        low: rowLow,
        high: rowHigh
      });
    });
    return { breakdown: breakdown, low: low, high: high };
  }

  return { estimate: estimate };
});
