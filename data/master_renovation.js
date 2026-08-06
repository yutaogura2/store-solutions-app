/* 店舗改装 工事メニューマスタ — 概算レンジ(税別)
   unit: "tsubo"=坪単価×面積 / "shiki"=一式レンジ。金額は一般的な店舗内装の相場目安であり、
   実際は仕様・下地・立地で大きく変わるため「概算レンジ」として提示する */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SS_MASTER_RENOVATION = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  return {
    updated: "2026-08-05",
    note: "概算は仕様・下地状態・営業しながらの施工か等で大きく変動する。正式金額は現地調査+プラン確定後の見積による。",
    menus: [
      { id: "floor",        name: "床改修(フロアタイル・長尺シート)", unit: "tsubo", low: 15000,  high: 35000 },
      { id: "wall",         name: "壁装改修(クロス張替・不燃化粧板)", unit: "tsubo", low: 10000,  high: 25000 },
      { id: "ceiling",      name: "天井改修(ボード・化粧板・塗装)",   unit: "tsubo", low: 10000,  high: 30000 },
      { id: "paint",        name: "内装塗装(壁・天井の塗装仕上げ)",   unit: "tsubo", low: 8000,   high: 20000 },
      { id: "partition",    name: "間仕切り・レイアウト変更",         unit: "shiki", low: 300000, high: 1500000 },
      { id: "facade",       name: "ファサード・看板改修",             unit: "shiki", low: 500000, high: 3000000 },
      { id: "toilet",       name: "トイレ改修(器具交換・内装含む)",   unit: "shiki", low: 500000, high: 1500000 },
      { id: "kitchen_zone", name: "厨房区画・厨房設備工事",           unit: "shiki", low: 1000000, high: 5000000 },
      { id: "lighting_plan",name: "照明計画変更(ダクトレール・調光)", unit: "shiki", low: 200000, high: 1000000 }
    ],
    purposes: [
      { id: "attract",   name: "集客力・イメージの改善" },
      { id: "aging",     name: "老朽化・傷みの解消" },
      { id: "layout",    name: "動線・レイアウトの改善" },
      { id: "format",    name: "業態転換・メニュー変更への対応" },
      { id: "energy",    name: "省エネ・設備更新と同時の改装" }
    ],
    schedule: [
      { step: "現地調査・採寸",       duration: "約1週間" },
      { step: "プラン・概算提示",     duration: "1〜2週間" },
      { step: "正式見積・仕様確定",   duration: "1〜2週間" },
      { step: "契約・着工準備",       duration: "1〜2週間" },
      { step: "施工",                 duration: "規模による(夜間・休業日施工の相談可)" }
    ]
  };
});
