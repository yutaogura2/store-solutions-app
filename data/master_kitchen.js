/* 厨房冷凍機器マスタ — 既設タイプ・サイズごとの後継候補
   annualKwh = 現行機の年間消費電力量の概算(JIS表示ベースの目安) / price = メーカー希望価格の概算(税別)
   eraFactors = 既設機の年間消費電力量を「現行機の何倍か」で推計する係数(インバーター化・断熱改善による削減の目安) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SS_MASTER_KITCHEN = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  return {
    updated: "2026-08-05",
    note: "年間消費電力量・価格は公開カタログベースの概算。型番は代表例(要最新確認)。設置条件(幅・奥行・電源)は現地調査で確定。",
    eraFactors: [
      { until: 2005, factor: 3.0, label: "〜2005年" },
      { until: 2012, factor: 2.2, label: "2006〜2012年" },
      { until: 2018, factor: 1.5, label: "2013〜2018年" },
      { until: 9999, factor: 1.1, label: "2019年〜" }
    ],
    types: [
      {
        id: "upright_ref",
        imageKey: "kitchen_upright_ref",
        name: "縦型冷蔵庫",
        sizes: [
          { id: "w900",  name: "幅900mm(2枚扉)",  annualKwh: 420, price: 380000,
            options: [
              { maker: "ホシザキ", model: "HR-90B",  verified: true },
              { maker: "フクシマガリレイ", model: "GRD-090RDX(三相)", verified: true } ] },
          { id: "w1200", name: "幅1200mm(4枚扉)", annualKwh: 500, price: 430000,
            options: [
              { maker: "ホシザキ", model: "HR-120B", verified: true },
              { maker: "フクシマガリレイ", model: "GRD-120RX(単相)", verified: true } ] },
          { id: "w1500", name: "幅1500mm(4枚扉)", annualKwh: 560, price: 500000,
            options: [
              { maker: "ホシザキ", model: "HR-150B", verified: true },
              { maker: "フクシマガリレイ", model: "GRD-150RDX(三相)", verified: true } ] },
          { id: "w1800", name: "幅1800mm(6枚扉)", annualKwh: 640, price: 570000,
            options: [
              { maker: "ホシザキ", model: "HR-180B", verified: false },
              { maker: "フクシマガリレイ", model: "GRD-180RDX(三相)", verified: true } ] }
        ]
      },
      {
        id: "upright_frz_ref",
        imageKey: "kitchen_upright_frz_ref",
        name: "縦型冷凍冷蔵庫",
        sizes: [
          { id: "w900",  name: "幅900mm(冷凍1室)",  annualKwh: 700,  price: 520000,
            options: [
              { maker: "ホシザキ", model: "HRF-90B",  verified: false },
              { maker: "フクシマガリレイ", model: "GRD-092PM", verified: false } ] },
          { id: "w1200", name: "幅1200mm(冷凍1室)", annualKwh: 850,  price: 600000,
            options: [
              { maker: "ホシザキ", model: "HRF-120B", verified: false },
              { maker: "フクシマガリレイ", model: "GRD-122PM", verified: false } ] },
          { id: "w1500", name: "幅1500mm(冷凍2室)", annualKwh: 950,  price: 680000,
            options: [
              { maker: "ホシザキ", model: "HRF-150B", verified: false },
              { maker: "フクシマガリレイ", model: "GRD-152PM", verified: false } ] },
          { id: "w1800", name: "幅1800mm(冷凍2室)", annualKwh: 1100, price: 760000,
            options: [
              { maker: "ホシザキ", model: "HRF-180B", verified: false },
              { maker: "フクシマガリレイ", model: "GRD-182PM", verified: false } ] }
        ]
      },
      {
        id: "cold_table",
        imageKey: "kitchen_cold_table",
        name: "コールドテーブル(台下冷蔵庫)",
        sizes: [
          { id: "w1200", name: "幅1200mm", annualKwh: 350, price: 250000,
            options: [
              { maker: "ホシザキ", model: "RT-120SNG", verified: false },
              { maker: "フクシマガリレイ", model: "LRC-120RM", verified: false } ] },
          { id: "w1500", name: "幅1500mm", annualKwh: 400, price: 290000,
            options: [
              { maker: "ホシザキ", model: "RT-150SNG", verified: false },
              { maker: "フクシマガリレイ", model: "LRC-150RM", verified: false } ] },
          { id: "w1800", name: "幅1800mm", annualKwh: 450, price: 320000,
            options: [
              { maker: "ホシザキ", model: "RT-180SNG", verified: false },
              { maker: "フクシマガリレイ", model: "LRC-180RM", verified: false } ] }
        ]
      },
      {
        id: "ice_maker",
        imageKey: "kitchen_ice_maker",
        name: "全自動製氷機(キューブアイス)",
        sizes: [
          { id: "kg25", name: "25kgタイプ", annualKwh: 600,  price: 330000,
            options: [ { maker: "ホシザキ", model: "IM-25M", verified: false } ] },
          { id: "kg45", name: "45kgタイプ", annualKwh: 700,  price: 390000,
            options: [ { maker: "ホシザキ", model: "IM-45M", verified: false } ] },
          { id: "kg65", name: "65kgタイプ", annualKwh: 900,  price: 480000,
            options: [ { maker: "ホシザキ", model: "IM-65M", verified: false } ] },
          { id: "kg95", name: "95kgタイプ", annualKwh: 1200, price: 600000,
            options: [ { maker: "ホシザキ", model: "IM-95M", verified: false } ] }
        ]
      },
      {
        id: "ref_showcase",
        imageKey: "kitchen_ref_showcase",
        name: "冷蔵ショーケース(小形・ビール/ドリンク)",
        sizes: [
          { id: "std", name: "小形(100〜300Lクラス)", annualKwh: 900, price: 350000,
            options: [
              { maker: "ホシザキ", model: "小形冷蔵ショーケース SSB系", verified: false },
              { maker: "フクシマガリレイ", model: "リーチインショーケース", verified: false } ] }
        ]
      },
      {
        id: "freezer_stocker",
        imageKey: "kitchen_freezer_stocker",
        name: "冷凍ストッカー",
        sizes: [
          { id: "std", name: "標準(200〜400Lクラス)", annualKwh: 400, price: 150000,
            options: [
              { maker: "ホシザキ", model: "冷凍ストッカー FM系", verified: false },
              { maker: "フクシマガリレイ", model: "冷凍ストッカー", verified: false } ] }
        ]
      }
    ],
    /* フロン排出抑制法の点検義務 — 環境省ポータル https://www.env.go.jp/earth/furon/index.html を出典とする一般周知事実(数値要件は記載しない) */
    inspectionNote: "業務用冷凍冷蔵機器はフロン排出抑制法に基づく点検(全機器の簡易点検・一定規模以上は専門家による定期点検)の対象です。更新時はフロン類を適正に回収・処分します"
  };
});
