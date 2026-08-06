/* 空調品番マスタ — 業務用エアコン(店舗・事務所用)
   型番は「代表例」: verified:true は公式カタログで実在確認済み / false は命名パターンからの推定(要最新確認)。
   同社の取扱メーカーに合わせた差し替えは makers 配列の編集だけで完結する(更新手順.md 参照) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SS_MASTER_AIRCON = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  /* 能力クラス(業務用エアコンの標準ラインナップ)
     code = 型番に使われる能力コード(冷房能力kW×10) / priceStd = 標準グレードの本体希望価格の概算(税別) */
  var CLASSES = [
    { hp: 1.5, kw: 4.0,  code: "40",  priceStd:  700000 },
    { hp: 2,   kw: 5.0,  code: "50",  priceStd:  800000 },
    { hp: 2.5, kw: 6.3,  code: "63",  priceStd:  900000 },
    { hp: 3,   kw: 8.0,  code: "80",  priceStd: 1050000 },
    { hp: 4,   kw: 11.2, code: "112", priceStd: 1300000 },
    { hp: 5,   kw: 14.0, code: "140", priceStd: 1500000 },
    { hp: 6,   kw: 16.0, code: "160", priceStd: 1800000 },
    { hp: 8,   kw: 22.4, code: "224", priceStd: 2400000 },
    { hp: 10,  kw: 28.0, code: "280", priceStd: 2900000 }
  ];

  /* メーカー×グレード(形状は天井カセット4方向を代表とする。他形状は正式見積時に選定)
     modelPattern の {code} が能力コードに置換される。cop は冷暖平均効率の概算(経済効果計算用) */
  var MAKERS = [
    {
      maker: "ダイキン",
      shapeName: "天井カセット4方向(S-ラウンドフロー センシング)",
      grades: [
        { grade: "eco",      gradeName: "省エネ重視", imageKey: "aircon_daikin_fivestar", series: "FIVE STAR ZEAS", modelPattern: "SSRC{code}D", cop: 5.2, apfNote: "APF 6.0〜7.2(能力による)", priceRate: 1.15, verified: true },
        { grade: "standard", gradeName: "標準",       imageKey: "aircon_daikin_ecozeas", series: "EcoZEAS", modelPattern: "SZRC{code}D", cop: 4.8, apfNote: "APF 5.6〜6.8(能力による)", priceRate: 1.0,  verified: false }
      ]
    },
    {
      maker: "三菱電機",
      shapeName: "4方向天井カセット形(i-スクエアタイプ)",
      grades: [
        { grade: "eco",      gradeName: "省エネ重視", imageKey: "aircon_mitsubishi_zr", series: "スリムZR", modelPattern: "PLZ-ZRMP{code}HF4", cop: 5.1, apfNote: "APF 6.0〜7.0(能力による)", priceRate: 1.15, verified: true },
        { grade: "standard", gradeName: "標準",       imageKey: "aircon_mitsubishi_er", series: "スリムER", modelPattern: "PLZ-ERMP{code}EF4", cop: 4.7, apfNote: "APF 5.5〜6.6(能力による)", priceRate: 1.0,  verified: false }
      ]
    },
    {
      maker: "日立",
      shapeName: "てんかせ4方向",
      grades: [
        { grade: "eco",      gradeName: "省エネ重視", imageKey: "aircon_hitachi_premium", series: "省エネの達人プレミアム", modelPattern: "RCI-GP{code}KA", cop: 5.1, apfNote: "APF 6.0〜7.0(能力による)", priceRate: 1.15, verified: false },
        { grade: "standard", gradeName: "標準",       imageKey: "aircon_hitachi_standard", series: "省エネの達人", modelPattern: "RCI-GP{code}K", cop: 4.7, apfNote: "APF 5.5〜6.6(能力による)", priceRate: 1.0,  verified: false }
      ]
    }
  ];

  /* 更新時期の根拠(市場リサーチ 2026-08-06 — 一次資料で確認済みの事実のみ) */
  var LIFECYCLE = {
    jraiaYears: "6〜15年",
    jraiaCondition: "1日10時間・年2,500時間の使用を仮定した目安(日本冷凍空調工業会)",
    partsNote: "補修用性能部品の保有期間は製造打切りから9年間が一般的",
    legalNote: "法定耐用年数は13年(建物附属設備・冷凍機出力22kW以下)",
    r22Note: "R22冷媒は2020年に実質全廃 — 15年以上前の機種は該当の可能性(室外機の銘板で確認できます)",
    maintenanceNote: "清掃されないまま使われた機器が約40%の電気を浪費した実例が業界団体資料に示されています",
    reuseNote: "既設配管の流用が可能な場合は工期・費用を抑えられます(可否は現地調査で判定)",
    source: "日本冷凍空調工業会(JRAIA)パンフレット・国税庁・ダイキン公式(2026年8月時点の公表情報)",
    disclaimer: "耐用年数の目安は保証年数ではありません",
    /* 冷媒規制のマイルストーン(一次確認済み: 環境省・経産省 合同会議資料 2026-03-27) */
    refrigerant: {
      r22EndYear: 2020,
      r22EraUntil: 2009,  // この年以前の設置機はR22冷媒の可能性が高い(銘板で要確認)
      hfcMilestones: [
        { year: 2029, label: "基準比▲70%" },
        { year: 2034, label: "基準比▲80%" },
        { year: 2036, label: "基準比▲85%" }
      ],
      source: "環境省・経済産業省 合同会議資料(2026年3月)/ダイキン公式(R22)"
    }
  };

  return {
    updated: "2026-08-05",
    lifecycle: LIFECYCLE,
    note: "型番はメーカー公式サイトで確認した代表例(verified:true=公式ページで実在確認済み・2026-08-05時点)。型番末尾の記号はモデルイヤーで変わるため、verified:true でも受注前に最新カタログで再確認する。能力コード(数字=冷房能力kW×10)は実在型番からの帰納であり公式解説は未確認。価格はメーカー希望価格の概算(税別・本体のみ)。",
    classes: CLASSES,
    makers: MAKERS
  };
});
