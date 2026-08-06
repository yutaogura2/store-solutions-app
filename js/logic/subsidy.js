/* 補助金ロジック — 選択カテゴリとの突き合わせ(該当「可能性」の提示のみ) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SSSubsidy = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  /* categories: 提案対象カテゴリ / prefCode: 店舗所在地の府県コード(自治体制度の絞り込み。未指定なら全国制度のみ) */
  function applicable(categories, master, prefCode) {
    return master.items.filter(function (item) {
      if (item.pref && item.pref !== prefCode) { return false; } // 他府県の自治体制度は出さない
      return item.targets.some(function (t) { return categories.indexOf(t) >= 0; });
    }).map(function (item) {
      return {
        id: item.id,
        name: item.name,
        admin: item.admin,
        summary: item.summary,
        rateNote: item.rateNote,
        seasonNote: item.seasonNote,
        caution: item.caution,
        matchedCategories: item.targets.filter(function (t) { return categories.indexOf(t) >= 0; })
      };
    });
  }

  return { applicable: applicable };
});
