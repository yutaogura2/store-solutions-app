/* 計算定数マスタ — 経済効果・能力算定の前提値(すべて概算の目安)
   更新するときは 更新手順.md を参照。値の出典・考え方は各コメントに記載 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SS_CONST = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  return {
    updated: "2026-08-05",

    /* --- 単位換算 --- */
    TSUBO_M2: 3.30578,      // 1坪 = 3.30578㎡
    KW_PER_HP: 2.8,         // 業務用エアコン1馬力 ≈ 冷房能力2.8kW(業界慣行)

    /* --- 電気料金の既定値(UIで変更可能・資料に前提として明記) --- */
    DEFAULT_TARIFF_YEN_PER_KWH: 30,  // 円/kWh(低圧の電力量料金+燃調の概算目安)
    DEFAULT_PRICE_RATE_PERCENT: 100, // 機器価格の係数(%)。定価=100。実勢に合わせ営業が商談時に調整する(値引率はツールに内蔵しない)
    DEFAULT_HOURS_PER_DAY: 10,       // 営業時間の既定(時間/日)
    DEFAULT_DAYS_PER_MONTH: 26,      // 月営業日数の既定

    /* --- 空調の能力算定(坪あたり必要冷房能力 kW/坪 — 店舗選定の一般的目安) --- */
    AIRCON_LOAD_PER_TSUBO: {
      office:            { name: "事務所・サービス店舗", kwPerTsubo: 0.45 },
      retail:            { name: "物販店舗",             kwPerTsubo: 0.55 },
      salon:             { name: "美容室・理容室",       kwPerTsubo: 0.55 },
      clinic:            { name: "医院・調剤薬局",       kwPerTsubo: 0.50 },
      restaurant_light:  { name: "飲食店(カフェ・軽飲食)", kwPerTsubo: 0.70 },
      restaurant_heavy:  { name: "飲食店(焼肉・中華・ラーメン等 厨房負荷大)", kwPerTsubo: 0.90 }
    },
    /* 能力補正(該当するものを乗算で加算) */
    AIRCON_ADJUSTMENTS: {
      ceilingHigh: { name: "天井高3m超",        rate: 0.10 },
      topFloor:    { name: "最上階・屋根直下",  rate: 0.10 },
      largeWindow: { name: "西日・大開口ガラス", rate: 0.10 },
      openKitchen: { name: "オープンキッチン",  rate: 0.15 }
    },

    /* --- 空調の稼働前提(概算) --- */
    AIRCON_CLASS_TOLERANCE: 0.95, // クラス選定の許容(必要能力の95%以上なら1クラス下を許容 — 過大選定の防止)
    AIRCON_MAX_OVERSIZE: 1.3,     // 既設台数を踏襲すると合計能力が必要の1.3倍を超える場合は台数を減らして提案
    AIRCON_LOAD_FACTOR: 0.6,   // 平均負荷率(定格に対する平均出力の割合・冷暖平均の概算)
    AIRCON_MONTHS_PER_YEAR: 12, // 冷暖房を通年使用する前提(店舗)

    /* --- 既設空調の効率(COP: 冷暖平均の概算目安。年式帯で推計) ---
       正確な効率は機種により異なるため「年式帯の代表値」で推計し、資料に前提を明記する */
    AIRCON_EXISTING_COP_BY_ERA: [
      { until: 2000, cop: 2.5, label: "〜2000年" },
      { until: 2010, cop: 3.0, label: "2001〜2010年" },
      { until: 2015, cop: 3.5, label: "2011〜2015年" },
      { until: 9999, cop: 4.0, label: "2016年〜" }
    ],

    /* --- 照明の稼働前提 --- */
    LIGHTING_ON_RATIO: 1.0,    // 営業時間中の点灯率(既定100%)

    /* --- 厨房機器は24時間365日通電(冷蔵・冷凍・製氷) --- */
    KITCHEN_HOURS_PER_YEAR: 8760,

    /* --- 標準工事費の目安(概算レンジ・税別) — 資料には「工事費は現地調査後に正式見積」を明記 --- */
    INSTALL_COST_AIRCON: [
      { maxHp: 3,   low: 150000, high: 300000, label: "〜3馬力" },
      { maxHp: 5,   low: 250000, high: 450000, label: "4〜5馬力" },
      { maxHp: 999, low: 350000, high: 700000, label: "6馬力〜" }
    ],
    INSTALL_COST_LIGHTING_PER_UNIT: { low: 3000, high: 8000 },   // 器具1台あたり交換工事
    INSTALL_COST_KITCHEN_PER_UNIT:  { low: 20000, high: 60000 }, // 搬入・入替・処分の目安

    /* --- 経済効果の表示前提 --- */
    ECON_YEARS: 10,           // 累計効果の表示年数(「10年間の累計効果」の基準)
    ECON_CHART_MAX_YEARS: 20  // 投資回収グラフの上限年数(分岐点が遠いときの打ち切り)
  };
});
