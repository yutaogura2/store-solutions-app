/* 商圏の人口動態ロジック — 市区町村の指標を府県平均と比較し、改装の方向性を組み立てる(純関数)
   指標の定義(すべて%):
     youngRatio     = 15歳未満人口 / 総人口
     elderlyRatio   = 65歳以上人口 / 総人口
     singleRatio    = 単独世帯 / 一般世帯
     familyKidsRatio= 夫婦と子供から成る世帯 / 一般世帯 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.SSDemographics = factory(); }
})(typeof self !== "undefined" ? self : this, function () {

  function findCity(code, demo) {
    for (var i = 0; i < demo.cities.length; i++) {
      if (demo.cities[i].code === code) { return demo.cities[i]; }
    }
    return null;
  }

  function findPref(prefCode, demo) {
    return demo.prefs[prefCode] || null;
  }

  /* 市区町村と府県平均の比較(4指標) — グラフ・表の元データ */
  function compare(city, pref) {
    var metrics = [
      { id: "familyKidsRatio", label: "ファミリー世帯(夫婦と子供)" },
      { id: "singleRatio",     label: "単独世帯" },
      { id: "youngRatio",      label: "年少人口(15歳未満)" },
      { id: "elderlyRatio",    label: "高齢化率(65歳以上)" }
    ];
    return metrics.map(function (m) {
      var value = city[m.id];
      var avg = pref[m.id];
      return {
        id: m.id,
        label: m.label,
        value: value,
        prefAvg: avg,
        ratio: avg > 0 ? Math.round(value / avg * 100) / 100 : null
      };
    });
  }

  /* 特性判定と改装方向性の組み立て
     businessType: 業態キー(office/retail/...)/ demo: 人口マスタ / mkt: マーケティングルールマスタ */
  function assess(cityCode, businessType, demo, mkt) {
    var city = findCity(cityCode, demo);
    if (!city) { return null; }
    var pref = findPref(city.pref, demo);
    if (!pref) { return null; }

    var comparison = compare(city, pref);
    var category = mkt.businessCategory[businessType] || "service";
    var strong = mkt.threshold.strong;

    // 各トレイトの乖離率(family は「夫婦と子供世帯」と「年少人口」の強い方を採る)
    var byId = {};
    comparison.forEach(function (c) { byId[c.id] = c; });
    var traitScores = mkt.traits.map(function (t) {
      var ratio = byId[t.metric] ? byId[t.metric].ratio : null;
      if (t.id === "family" && byId.youngRatio && byId.youngRatio.ratio != null) {
        ratio = Math.max(ratio || 0, byId.youngRatio.ratio);
      }
      return { trait: t, ratio: ratio };
    }).filter(function (x) { return x.ratio != null; });

    // 平均より5%以上高い特性を強い順に(最大2件)
    var dominant = traitScores
      .filter(function (x) { return x.ratio >= strong; })
      .sort(function (a, b) { return b.ratio - a.ratio; })
      .slice(0, 2);

    var recommendations;
    var balancedApplied = false;
    if (dominant.length > 0) {
      recommendations = dominant.map(function (x) {
        var reco = x.trait.recos[category];
        return {
          traitId: x.trait.id,
          traitLabel: x.trait.label,
          metricLabel: x.trait.metricLabel,
          ratio: x.ratio,
          title: reco.title,
          items: reco.items,
          reason: reco.reason
        };
      });
    } else {
      balancedApplied = true;
      recommendations = [{
        traitId: "balanced",
        traitLabel: mkt.balanced.title,
        ratio: null,
        title: mkt.balanced.title,
        items: mkt.balanced.items,
        reason: mkt.balanced.reason
      }];
    }

    return {
      city: city,
      pref: pref,
      comparison: comparison,
      category: category,
      dominant: dominant.map(function (x) { return { id: x.trait.id, ratio: x.ratio }; }),
      balanced: balancedApplied,
      recommendations: recommendations
    };
  }

  /* 事例枠: 業態区分に合う事例を返す(source 未登録は「一般的な傾向」扱い) */
  function casesFor(businessType, mkt) {
    var category = mkt.businessCategory[businessType] || "service";
    var wanted = category === "restaurant" ? "飲食店" : "小売・サービス";
    return mkt.cases.filter(function (c) { return c.business === wanted || c.business === "共通"; });
  }

  return { findCity: findCity, findPref: findPref, compare: compare, assess: assess, casesFor: casesFor };
});
