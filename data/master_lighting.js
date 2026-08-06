/* 照明品番マスタ — 既設照明タイプごとの LED 代替
   watt = 既設の実消費電力(安定器込みの概算) / led.watt = LED代替の消費電力(概算)
   led.price = 器具1台のメーカー希望価格の概算(税別)。型番は代表例(verified:false は要最新確認) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SS_MASTER_LIGHTING = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  return {
    updated: "2026-08-05",
    note: "消費電力は安定器損失を含む概算。LED化は器具ごと交換(バイパス工事直管は原則提案しない=安全側)。型番は代表例であり正式見積時に最新カタログで確認。",
    types: [
      {
        id: "fl40_2_fuji",
        name: "直管蛍光灯 40形×2灯(逆富士・ベースライト)",
        watt: 86,
        led: {
          name: "LEDベースライト 40形 5200lmクラス(Hf32高出力×2灯相当)", imageKey: "light_baselight40",
          watt: 26, price: 32000,
          options: [
            { maker: "パナソニック", series: "iDシリーズ", model: "NNLK42523J+NEL4500HN LE9(省エネタイプ26.3W)", verified: true },
            { maker: "アイリスオーヤマ", series: "ラインルクス", model: "LX3-170-52N-CL40-LI(約33W)", verified: true }
          ]
        }
      },
      {
        id: "fl40_1",
        name: "直管蛍光灯 40形×1灯",
        watt: 43,
        led: {
          name: "LEDベースライト 40形 2500lmクラス(1灯相当)", imageKey: "light_baselight40",
          watt: 14, price: 25000,
          options: [
            { maker: "パナソニック", series: "iDシリーズ", model: "XLX420系(器具+ライトバー)", verified: false },
            { maker: "アイリスオーヤマ", series: "ラインルクス", model: "LX3シリーズ 40形 2500lm", verified: false }
          ]
        }
      },
      {
        id: "fl20_2",
        name: "直管蛍光灯 20形×2灯",
        watt: 36,
        led: {
          name: "LEDベースライト 20形 1600lmクラス", imageKey: "light_baselight20",
          watt: 10, price: 18000,
          options: [
            { maker: "パナソニック", series: "iDシリーズ", model: "XLX210系", verified: false },
            { maker: "アイリスオーヤマ", series: "ラインルクス", model: "LX3シリーズ 20形", verified: false }
          ]
        }
      },
      {
        id: "downlight_inc60",
        name: "白熱ダウンライト 60W形",
        watt: 54,
        led: {
          name: "LEDダウンライト 60形相当(電球色/昼白色)", imageKey: "light_downlight",
          watt: 6, price: 8000,
          options: [
            { maker: "パナソニック", series: "LEDダウンライト", model: "NDN系(60形相当)", verified: false },
            { maker: "アイリスオーヤマ", series: "LEDダウンライト", model: "DL系(60形相当)", verified: false }
          ]
        }
      },
      {
        id: "downlight_fdl27",
        name: "コンパクト蛍光灯ダウンライト(FDL27等)",
        watt: 32,
        led: {
          name: "LEDダウンライト 100形相当", imageKey: "light_downlight",
          watt: 10, price: 12000,
          options: [
            { maker: "パナソニック", series: "LEDダウンライト", model: "NDN系(100形相当)", verified: false },
            { maker: "アイリスオーヤマ", series: "LEDダウンライト", model: "DL系(100形相当)", verified: false }
          ]
        }
      },
      {
        id: "mercury400",
        name: "水銀灯 400W(高天井・倉庫/ホール)",
        watt: 435,
        led: {
          name: "高天井用LED 400W形相当", imageKey: "light_highbay",
          watt: 105, price: 90000,
          options: [
            { maker: "パナソニック", series: "高天井用LED(HID代替)", model: "NYM系(400形相当)", verified: false },
            { maker: "アイリスオーヤマ", series: "高天井LED", model: "HXシリーズ(400W形相当)", verified: false }
          ]
        }
      },
      {
        id: "mercury250",
        name: "水銀灯 250W",
        watt: 280,
        led: {
          name: "高天井用LED 250W形相当", imageKey: "light_highbay",
          watt: 65, price: 60000,
          options: [
            { maker: "パナソニック", series: "高天井用LED(HID代替)", model: "NYM系(250形相当)", verified: false },
            { maker: "アイリスオーヤマ", series: "高天井LED", model: "HXシリーズ(250W形相当)", verified: false }
          ]
        }
      },
      {
        id: "halogen_spot",
        name: "ハロゲンスポット 100W形(店舗演出照明)",
        watt: 90,
        led: {
          name: "LEDスポットライト 100W形相当(配線ダクト用)", imageKey: "light_spot",
          watt: 12, price: 9000,
          options: [
            { maker: "パナソニック", series: "LEDスポットライト", model: "NTS系(100形相当)", verified: false },
            { maker: "アイリスオーヤマ", series: "LEDスポットライト", model: "SP系(100形相当)", verified: false }
          ]
        }
      }
    ]
  };
});
