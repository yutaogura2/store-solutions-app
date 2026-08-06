/* 店舗ソリューション提案ツール — 画面制御
   計算はすべて js/logic/(純関数)に委譲し、ここでは入力収集・描画・遷移だけを行う */
(function () {
  "use strict";

  var C = window.SS_CONST;
  var MA = window.SS_MASTER_AIRCON;
  var ML = window.SS_MASTER_LIGHTING;
  var MK = window.SS_MASTER_KITCHEN;
  var MR = window.SS_MASTER_RENOVATION;
  var MS = window.SS_MASTER_SUBSIDY;
  var MD = window.SS_MASTER_DEMOGRAPHICS;
  var MM = window.SS_MASTER_MARKETING;
  var MO = window.SS_MASTER_OPERATIONS;
  var MB = window.SS_MASTER_BACKGROUND;

  var $ = function (id) { return document.getElementById(id); };

  var currentStep = 1;
  var lastDiag = null;                 // 直近の診断結果(資料生成に使う)
  var ui = { selectedAirconIdx: 0 };   // 画面上の選択状態

  /* 既設写真(カテゴリごとに1枚・dataURL)+改装の施工イメージ */
  var photos = { aircon: null, lighting: null, kitchen: null, renovation: null, renovationAfter: null };

  /* 店舗マップ(下絵dataURL+相対座標マーカー) */
  var mapState = { base: null, blank: false, markers: [], activeCat: "aircon" };
  var MAP_CATS = [
    { id: "aircon",     name: "空調",   color: "#2563eb", short: "空" },
    { id: "lighting",   name: "照明",   color: "#a05a00", short: "照" },
    { id: "kitchen",    name: "厨房",   color: "#1a7f37", short: "厨" },
    { id: "renovation", name: "改装",   color: "#b00020", short: "改" },
    { id: "other",      name: "その他", color: "#5a6472", short: "他" }
  ];

  /* ============ 共通ヘルパ ============ */
  function fmtYen(n) { return Math.round(n).toLocaleString("ja-JP") + "円"; }
  function fmtMan(n) { return (Math.round(n / 10000)).toLocaleString("ja-JP") + "万円"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function showError(cause, action, raw) {
    $("errorCause").textContent = cause;
    $("errorAction").textContent = action;
    $("errorRaw").textContent = raw || "";
    $("errorCard").hidden = false;
    $("errorCard").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ============ 初期化 ============ */
  function init() {
    // 業態セレクト
    var sel = $("inBusinessType");
    Object.keys(C.AIRCON_LOAD_PER_TSUBO).forEach(function (key) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = C.AIRCON_LOAD_PER_TSUBO[key].name;
      sel.appendChild(opt);
    });

    // 改装: 目的
    var pWrap = $("renoPurposes");
    MR.purposes.forEach(function (p) {
      var label = document.createElement("label");
      label.className = "check-item";
      label.innerHTML = '<input type="checkbox" data-purpose="' + esc(p.id) + '"> ' + esc(p.name);
      pWrap.appendChild(label);
    });

    // 改装: 工事メニュー
    var mWrap = $("renoMenus");
    MR.menus.forEach(function (m) {
      var row = document.createElement("div");
      row.className = "dyn-row";
      var unitNote = m.unit === "tsubo"
        ? "坪単価 " + fmtYen(m.low) + "〜" + fmtYen(m.high)
        : "一式 " + fmtMan(m.low) + "〜" + fmtMan(m.high);
      row.innerHTML =
        '<label class="check-item" style="flex:2;min-width:220px;"><input type="checkbox" data-menu="' + esc(m.id) + '"> ' +
        esc(m.name) + ' <span class="status-note">(' + unitNote + ')</span></label>' +
        (m.unit === "tsubo"
          ? '<div class="field small"><label>対象坪数</label><input type="number" min="0" step="0.5" data-menu-qty="' + esc(m.id) + '"></div>'
          : "");
      mWrap.appendChild(row);
    });

    // 照明・厨房の初期行
    addLightRow();
    addKitchenRow();

    // 提案日の初期値=今日
    var today = new Date();
    $("inProposalDate").value = today.getFullYear() + "-" +
      String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

    // イベント
    $("nextBtn").addEventListener("click", function () { goStep(currentStep + 1); });
    $("backBtn").addEventListener("click", function () { goStep(currentStep - 1); });
    document.querySelectorAll(".wizard-step").forEach(function (btn) {
      btn.addEventListener("click", function () { goStep(Number(btn.dataset.step)); });
    });
    $("addLightRow").addEventListener("click", addLightRow);
    $("addKitchenRow").addEventListener("click", addKitchenRow);
    $("genPptxBtn").addEventListener("click", generatePptx);
    $("exportCsvBtn").addEventListener("click", exportEconCsv);
    $("compareInput").addEventListener("change", loadCompareStores);
    $("compareReportBtn").addEventListener("click", generateComparePptx);
    $("saveJsonBtn").addEventListener("click", saveJson);
    $("loadJsonInput").addEventListener("change", loadJson);
    $("errorCloseBtn").addEventListener("click", function () { $("errorCard").hidden = true; });

    // 面積が入ったら改装の坪数の初期値に反映(未入力欄のみ)
    $("inArea").addEventListener("change", function () {
      var area = Number($("inArea").value);
      if (!(area > 0)) { return; }
      document.querySelectorAll("[data-menu-qty]").forEach(function (input) {
        if (input.value === "") { input.value = area; }
      });
    });

    initPhotos();
    initMap();
    initGsi();
    initDemographics();
    showStep(1);
  }

  /* ============ 地図から下絵を作る(国土地理院・地理院タイル) ============
     出典明記(国土地理院コンテンツ利用規約)を採用画像に自動で焼き込む。通信必須(オフライン時は従来のアップロード) */
  /* scale: タイル上限(z18)を超えて寄るためのデジタル拡大(1/2/4)。建物外形は線画のため拡大でも実用に耐える */
  var gsi = { lon: null, lat: null, z: 17, scale: 1, style: "pale", drag: null, tileCache: {}, renderId: 0 };
  var GSI_W = 1000, GSI_H = 600, TILE = 256, GSI_MAX_Z = 18, GSI_MAX_SCALE = 4;

  function worldPx(lon, lat, z) {
    var n = Math.pow(2, z) * TILE;
    var rad = lat * Math.PI / 180;
    return {
      x: (lon + 180) / 360 * n,
      y: (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n
    };
  }
  function pxToLonLat(x, y, z) {
    var n = Math.pow(2, z) * TILE;
    var yy = Math.PI * (1 - 2 * y / n);
    return { lon: x / n * 360 - 180, lat: Math.atan(Math.sinh(yy)) * 180 / Math.PI };
  }

  function initGsi() {
    $("gsiSearchBtn").addEventListener("click", gsiSearch);
    $("gsiZoomIn").addEventListener("click", function () {
      if (gsi.z < GSI_MAX_Z) { gsi.z += 1; }
      else if (gsi.scale < GSI_MAX_SCALE) { gsi.scale *= 2; }
      gsiRender(); gsiZoomNote();
    });
    $("gsiZoomOut").addEventListener("click", function () {
      if (gsi.scale > 1) { gsi.scale /= 2; }
      else if (gsi.z > 15) { gsi.z -= 1; }
      gsiRender(); gsiZoomNote();
    });
    $("gsiStyleBtn").addEventListener("click", function () { gsi.style = gsi.style === "pale" ? "std" : "pale"; gsi.tileCache = {}; gsiRender(); });
    $("gsiAdoptBtn").addEventListener("click", gsiAdopt);
    var canvas = $("gsiCanvas");
    canvas.addEventListener("pointerdown", function (ev) {
      gsi.drag = { x: ev.clientX, y: ev.clientY, lon: gsi.lon, lat: gsi.lat };
      canvas.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (!gsi.drag) { return; }
      var rect = canvas.getBoundingClientRect();
      var viewScale = GSI_W / rect.width;
      var start = worldPx(gsi.drag.lon, gsi.drag.lat, gsi.z);
      var moved = pxToLonLat(
        start.x - (ev.clientX - gsi.drag.x) * viewScale / gsi.scale,
        start.y - (ev.clientY - gsi.drag.y) * viewScale / gsi.scale, gsi.z);
      gsi.lon = moved.lon; gsi.lat = moved.lat;
      gsiRender();
    });
    canvas.addEventListener("pointerup", function () { gsi.drag = null; });
  }

  function gsiSearch() {
    var q = $("gsiAddress").value.trim();
    if (!q) { $("gsiStatus").textContent = "住所を入力してください"; return; }
    $("gsiStatus").textContent = "検索中…";
    fetch("https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (list) {
        if (!list || list.length === 0) {
          $("gsiStatus").textContent = "住所が見つかりませんでした(市区町村名から入れる・番地を省く等お試しください)";
          return;
        }
        var c = list[0].geometry.coordinates; // [経度, 緯度]
        gsi.lon = c[0]; gsi.lat = c[1]; gsi.z = 17;
        $("gsiCanvas").hidden = false;
        $("gsiControls").hidden = false;
        gsiRender();
        $("gsiStatus").textContent = "「" + ((list[0].properties && list[0].properties.title) || q) + "」周辺を表示中。ドラッグで店舗を中央へ・「拡大」で建物の輪郭が見えます";
      })
      .catch(function () {
        $("gsiStatus").textContent = "地図を取得できませんでした(通信環境をご確認ください。オフライン時は写真・スクリーンショットのアップロードをご利用ください)";
      });
  }

  function gsiZoomNote() {
    var level = gsi.scale > 1 ? "最大タイル+" + gsi.scale + "倍拡大(建物レベル)" : "ズームレベル " + gsi.z;
    $("gsiStatus").textContent = "表示: " + level + "。ドラッグで移動 → 建物が十分大きく見えたら「この範囲を下絵に採用」";
  }

  function gsiRender() {
    var canvas = $("gsiCanvas");
    canvas.width = GSI_W; canvas.height = GSI_H;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = gsi.scale === 1; // 拡大時はシャープに(建物輪郭の線画向き)
    ctx.fillStyle = "#eef1f5"; ctx.fillRect(0, 0, GSI_W, GSI_H);
    var s = gsi.scale;
    var center = worldPx(gsi.lon, gsi.lat, gsi.z);
    var left = center.x * s - GSI_W / 2, top = center.y * s - GSI_H / 2;
    var ts = TILE * s;
    var renderId = ++gsi.renderId;
    for (var tx = Math.floor(left / ts); tx <= Math.floor((left + GSI_W) / ts); tx++) {
      for (var ty = Math.floor(top / ts); ty <= Math.floor((top + GSI_H) / ts); ty++) {
        (function (tx, ty) {
          var key = gsi.style + "/" + gsi.z + "/" + tx + "/" + ty;
          function draw(img) {
            if (renderId !== gsi.renderId) { return; }
            ctx.drawImage(img, Math.round(tx * ts - left), Math.round(ty * ts - top), ts, ts);
          }
          if (gsi.tileCache[key]) { draw(gsi.tileCache[key]); return; }
          var img = new Image();
          img.crossOrigin = "anonymous"; // 出典明記のうえ canvas 合成するため(地理院タイルはCORS対応)
          img.onload = function () { gsi.tileCache[key] = img; draw(img); };
          img.src = "https://cyberjapandata.gsi.go.jp/xyz/" + gsi.style + "/" + gsi.z + "/" + tx + "/" + ty + ".png";
        })(tx, ty);
      }
    }
  }

  function gsiAdopt() {
    try {
      var out = document.createElement("canvas");
      out.width = GSI_W; out.height = GSI_H + 30;
      var ctx = out.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage($("gsiCanvas"), 0, 0);
      ctx.fillStyle = "#5a6472"; ctx.font = "14px sans-serif";
      ctx.fillText("地図出典: 国土地理院(地理院タイル)", 10, GSI_H + 20);
      mapState.base = out.toDataURL("image/png");
      mapState.blank = false;
      showMapEditor();
      $("gsiStatus").textContent = "下絵に採用しました。下の「設備マーカーの配置」でマーカーを打てます";
    } catch (e) {
      $("gsiStatus").textContent = "画像化できませんでした(" + (e && e.message) + ")。スクリーンショットのアップロードをご利用ください";
    }
  }

  /* ============ 店舗所在地(人口動態) ============ */
  function initDemographics() {
    if (!MD || MD.cities.length === 0) { return; }  // データ未生成時は機能ごと非表示
    $("fieldPref").hidden = false;
    $("fieldCity").hidden = false;
    var prefSel = $("inPref");
    Object.keys(MD.prefs).forEach(function (code) {
      var opt = document.createElement("option");
      opt.value = code;
      opt.textContent = MD.prefs[code].name;
      prefSel.appendChild(opt);
    });
    prefSel.addEventListener("change", function () { fillCities(prefSel.value, null); });
    $("estatTestBtn").addEventListener("click", estatConnectionTest);
  }

  /* e-Stat API 接続テスト(公式仕様のJSONPエンドポイントを使用 — オフライン時・キー未設定時は失敗表示のみ) */
  function estatConnectionTest() {
    var key = $("inEstatKey").value.trim();
    var out = $("estatTestResult");
    if (!key) { out.textContent = "appId を入力してください"; return; }
    out.textContent = "接続中…";
    var done = false;
    window.__ssEstatCb = function (data) {
      done = true;
      try {
        var result = data && data.GET_STATS_LIST && data.GET_STATS_LIST.RESULT;
        if (result && Number(result.STATUS) === 0) {
          out.textContent = "接続OK: APIキーは有効です(データ全体の更新は保守スクリプトで実行してください)";
        } else {
          out.textContent = "接続エラー: " + (result && result.ERROR_MSG ? result.ERROR_MSG : "APIキーをご確認ください");
        }
      } catch (e) {
        out.textContent = "接続エラー: 応答を解釈できませんでした";
      }
    };
    var script = document.createElement("script");
    script.src = "https://api.e-stat.go.jp/rest/3.0/app/jsonp/getStatsList?appId=" + encodeURIComponent(key) +
      "&limit=1&searchWord=" + encodeURIComponent("国勢調査") + "&callback=__ssEstatCb";
    script.onerror = function () { done = true; out.textContent = "接続エラー: 通信できません(オフライン環境では利用できません)"; };
    document.body.appendChild(script);
    setTimeout(function () {
      if (!done) { out.textContent = "接続エラー: 応答がありません(通信環境をご確認ください)"; }
      script.remove();
    }, 10000);
  }

  function fillCities(prefCode, selectCode) {
    var citySel = $("inCity");
    citySel.innerHTML = '<option value="">未選択</option>';
    if (!prefCode) { citySel.disabled = true; return; }
    citySel.disabled = false;
    MD.cities.filter(function (c) { return c.pref === prefCode; }).forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.code;
      opt.textContent = c.name;
      citySel.appendChild(opt);
    });
    if (selectCode) { citySel.value = selectCode; }
  }

  /* ============ 既設写真 ============ */
  function initPhotos() {
    document.querySelectorAll("[data-photo-input]").forEach(function (input) {
      input.addEventListener("change", function (ev) {
        var cat = input.dataset.photoInput;
        var file = ev.target.files[0];
        ev.target.value = "";
        if (!file) { return; }
        readImageFile(file, 1200, function (dataUrl) {
          photos[cat] = dataUrl;
          refreshPhotoPreview(cat);
        });
      });
    });
    document.querySelectorAll("[data-photo-clear]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        photos[btn.dataset.photoClear] = null;
        refreshPhotoPreview(btn.dataset.photoClear);
      });
    });
  }

  function refreshPhotoPreview(cat) {
    var img = document.querySelector('[data-photo-preview="' + cat + '"]');
    var btn = document.querySelector('[data-photo-clear="' + cat + '"]');
    if (img) { img.src = photos[cat] || ""; img.hidden = !photos[cat]; }
    if (btn) { btn.hidden = !photos[cat]; }
  }

  /* 画像ファイルを読み、maxPx以内に縮小したdataURL(JPEG)を返す(資料の肥大化防止) */
  function readImageFile(file, maxPx, callback) {
    var reader = new FileReader();
    reader.onload = function () {
      var image = new Image();
      image.onload = function () {
        var scale = Math.min(1, maxPx / Math.max(image.width, image.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.onerror = function () {
        showError("画像を読み込めませんでした", "JPEG/PNG形式の画像を選択してください", file.name);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ============ 店舗マップ ============ */
  var MAP_W = 1000;   // canvasの論理幅(下絵に合わせて高さを可変)

  function initMap() {
    var radios = $("mapCatRadios");
    MAP_CATS.forEach(function (cat, i) {
      var label = document.createElement("label");
      label.className = "check-item";
      label.innerHTML = '<input type="radio" name="mapCat" value="' + cat.id + '"' + (i === 0 ? " checked" : "") + '>' +
        '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + cat.color + ';margin-right:4px;vertical-align:-2px;"></span>' + cat.name;
      radios.appendChild(label);
    });
    radios.addEventListener("change", function (ev) {
      if (ev.target.name === "mapCat") { mapState.activeCat = ev.target.value; }
    });

    $("mapBaseInput").addEventListener("change", function (ev) {
      var file = ev.target.files[0];
      ev.target.value = "";
      if (!file) { return; }
      readImageFile(file, 1600, function (dataUrl) {
        mapState.base = dataUrl;
        mapState.blank = false;
        showMapEditor();
      });
    });
    $("mapBlankBtn").addEventListener("click", function () {
      mapState.base = null;
      mapState.blank = true;
      showMapEditor();
    });
    $("mapResetBtn").addEventListener("click", function () {
      mapState.base = null; mapState.blank = false; mapState.markers = [];
      $("mapEditor").hidden = true;
    });
    $("mapUndoBtn").addEventListener("click", function () { mapState.markers.pop(); drawMap(); });
    $("mapMarkersClearBtn").addEventListener("click", function () { mapState.markers = []; drawMap(); });

    $("mapCanvas").addEventListener("click", function (ev) {
      if (!mapHasBase()) { return; }
      var canvas = $("mapCanvas");
      var rect = canvas.getBoundingClientRect();
      var x = (ev.clientX - rect.left) / rect.width;
      var y = (ev.clientY - rect.top) / rect.height;
      mapState.markers.push({ x: x, y: y, cat: mapState.activeCat });
      drawMap();
    });
  }

  function mapHasBase() { return !!mapState.base || mapState.blank; }

  function showMapEditor() {
    $("mapEditor").hidden = false;
    drawMap();
  }

  function drawMap(callback) {
    var canvas = $("mapCanvas");
    var ctx = canvas.getContext("2d");
    function paint(baseImage) {
      var h = baseImage ? Math.round(MAP_W * baseImage.height / baseImage.width) : 600;
      h = Math.max(300, Math.min(1200, h));
      canvas.width = MAP_W; canvas.height = h;
      canvas.style.width = "100%";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, MAP_W, h);
      if (baseImage) {
        ctx.drawImage(baseImage, 0, 0, MAP_W, h);
      } else {
        // 白紙: 方眼
        ctx.strokeStyle = "#dfe4ea"; ctx.lineWidth = 1;
        for (var gx = 0; gx <= MAP_W; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
        for (var gy = 0; gy <= h; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(MAP_W, gy); ctx.stroke(); }
      }
      // マーカー(カテゴリごとの連番)
      var counters = {};
      mapState.markers.forEach(function (m) {
        var def = MAP_CATS.filter(function (c) { return c.id === m.cat; })[0] || MAP_CATS[4];
        counters[m.cat] = (counters[m.cat] || 0) + 1;
        var cx = m.x * MAP_W, cy = m.y * h;
        ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fillStyle = def.color; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.stroke();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(def.short + counters[m.cat], cx, cy + 1);
      });
      mapState.lastImage = canvas.toDataURL("image/png");
      if (callback) { callback(mapState.lastImage); }
    }
    if (mapState.base) {
      var image = new Image();
      image.onload = function () { paint(image); };
      image.src = mapState.base;
    } else if (mapState.blank) {
      paint(null);
    } else if (callback) {
      callback(null);
    }
  }

  function mapCounts() {
    var counts = {};
    mapState.markers.forEach(function (m) { counts[m.cat] = (counts[m.cat] || 0) + 1; });
    return MAP_CATS.filter(function (c) { return counts[c.id] > 0; })
      .map(function (c) { return { name: c.name, color: c.color, count: counts[c.id] }; });
  }

  /* ============ ステップ遷移 ============ */
  function selectedCategories() {
    var cats = [];
    if ($("catAircon").checked) { cats.push("aircon"); }
    if ($("catLighting").checked) { cats.push("lighting"); }
    if ($("catKitchen").checked) { cats.push("kitchen"); }
    if ($("catRenovation").checked) { cats.push("renovation"); }
    return cats;
  }

  function validateStep1() {
    var ok = true;
    var fc = $("fieldCustomer");
    var bad = $("inCustomer").value.trim() === "";
    fc.classList.toggle("invalid", bad);
    fc.querySelector(".field-error").hidden = !bad;
    if (bad) { ok = false; }

    var fa = $("fieldArea");
    var area = Number($("inArea").value);
    var areaBad = !(area > 0);
    fa.classList.toggle("invalid", areaBad);
    fa.querySelector(".field-error").hidden = !areaBad;
    if (areaBad) { ok = false; }

    var noCat = selectedCategories().length === 0;
    $("catError").hidden = !noCat;
    if (noCat) { ok = false; }
    return ok;
  }

  function goStep(n) {
    if (n < 1 || n > 4) { return; }
    if (n > 1 && !validateStep1()) { showStep(1); return; }
    if (n === 2) { buildCatTabs(); }
    if (n >= 3) {
      try {
        computeDiagnosis();
      } catch (e) {
        showError("診断の計算でエラーが発生しました", "ヒアリング内容(数値・選択)を確認してください", e && e.message);
        return;
      }
    }
    if (n === 4 && $("inCustomer").value.trim() !== "") {
      // 特に処理なし(宛名は生成時に取得)
    }
    showStep(n);
  }

  function showStep(n) {
    currentStep = n;
    [1, 2, 3, 4].forEach(function (i) { $("step" + i).hidden = (i !== n); });
    document.querySelectorAll(".wizard-step").forEach(function (btn) {
      if (Number(btn.dataset.step) === n) { btn.setAttribute("aria-current", "step"); }
      else { btn.removeAttribute("aria-current"); }
    });
    $("backBtn").disabled = (n === 1);
    $("nextBtn").disabled = (n === 4);
    window.scrollTo({ top: 0 });
  }

  /* ============ STEP2: タブと動的行 ============ */
  var CAT_DEFS = [
    { id: "aircon", name: "空調設備", panel: "panelAircon" },
    { id: "lighting", name: "照明設備", panel: "panelLighting" },
    { id: "kitchen", name: "厨房冷凍機器", panel: "panelKitchen" },
    { id: "renovation", name: "店舗改装", panel: "panelRenovation" }
  ];

  function buildCatTabs() {
    var cats = selectedCategories();
    var tabs = $("catTabs");
    tabs.innerHTML = "";
    var defs = CAT_DEFS.concat([{ id: "map", name: "店舗マップ", panel: "panelMap" }]);
    defs.forEach(function (def) {
      $(def.panel).hidden = true;
      if (def.id !== "map" && cats.indexOf(def.id) < 0) { return; }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-tab";
      btn.setAttribute("role", "tab");
      btn.textContent = def.name;
      btn.addEventListener("click", function () { activateTab(def.id); });
      btn.dataset.cat = def.id;
      tabs.appendChild(btn);
    });
    if (cats.length > 0) { activateTab(cats[0]); } else { activateTab("map"); }
  }

  function activateTab(catId) {
    CAT_DEFS.concat([{ id: "map", panel: "panelMap" }]).forEach(function (def) {
      var active = def.id === catId;
      var tab = document.querySelector('.cat-tab[data-cat="' + def.id + '"]');
      if (tab) { tab.setAttribute("aria-selected", active ? "true" : "false"); }
      $(def.panel).hidden = !(active && tab);
    });
  }

  function addLightRow() {
    var wrap = $("lightRows");
    var row = document.createElement("div");
    row.className = "dyn-row";
    var opts = ML.types.map(function (t) {
      return '<option value="' + esc(t.id) + '">' + esc(t.name) + "</option>";
    }).join("");
    row.innerHTML =
      '<div class="field"><label>既設照明の種類</label><select data-light-type>' + opts + "</select></div>" +
      '<div class="field small"><label>本数</label><input type="number" min="0" step="1" data-light-count placeholder="0"></div>' +
      '<button type="button" class="btn btn-small" data-remove>削除</button>';
    row.querySelector("[data-remove]").addEventListener("click", function () { row.remove(); });
    wrap.appendChild(row);
  }

  function addKitchenRow() {
    var wrap = $("kitchenRows");
    var row = document.createElement("div");
    row.className = "dyn-row";
    var typeOpts = MK.types.map(function (t) {
      return '<option value="' + esc(t.id) + '">' + esc(t.name) + "</option>";
    }).join("");
    row.innerHTML =
      '<div class="field"><label>機器の種類</label><select data-kitchen-type>' + typeOpts + "</select></div>" +
      '<div class="field"><label>サイズ</label><select data-kitchen-size></select></div>' +
      '<div class="field"><label>年式(おおよそ)</label><select data-kitchen-year>' +
      '<option value="2000">2005年以前</option>' +
      '<option value="2008" selected>2006〜2012年</option>' +
      '<option value="2015">2013〜2018年</option>' +
      '<option value="2021">2019年以降</option>' +
      "</select></div>" +
      '<div class="field small"><label>台数</label><input type="number" min="0" step="1" data-kitchen-count placeholder="0"></div>' +
      '<button type="button" class="btn btn-small" data-remove>削除</button>';
    var typeSel = row.querySelector("[data-kitchen-type]");
    var sizeSel = row.querySelector("[data-kitchen-size]");
    function fillSizes() {
      var t = MK.types.filter(function (x) { return x.id === typeSel.value; })[0];
      sizeSel.innerHTML = (t ? t.sizes : []).map(function (s) {
        return '<option value="' + esc(s.id) + '">' + esc(s.name) + "</option>";
      }).join("");
    }
    typeSel.addEventListener("change", fillSizes);
    fillSizes();
    row.querySelector("[data-remove]").addEventListener("click", function () { row.remove(); });
    wrap.appendChild(row);
  }

  /* ============ 入力収集 ============ */
  function collectInputs() {
    var lightRows = [];
    document.querySelectorAll("#lightRows .dyn-row").forEach(function (row) {
      lightRows.push({
        typeId: row.querySelector("[data-light-type]").value,
        count: Number(row.querySelector("[data-light-count]").value) || 0
      });
    });
    var kitchenRows = [];
    document.querySelectorAll("#kitchenRows .dyn-row").forEach(function (row) {
      kitchenRows.push({
        typeId: row.querySelector("[data-kitchen-type]").value,
        sizeId: row.querySelector("[data-kitchen-size]").value,
        year: Number(row.querySelector("[data-kitchen-year]").value),
        count: Number(row.querySelector("[data-kitchen-count]").value) || 0
      });
    });
    var renoSelections = [];
    document.querySelectorAll("[data-menu]").forEach(function (cb) {
      if (!cb.checked) { return; }
      var id = cb.dataset.menu;
      var qtyInput = document.querySelector('[data-menu-qty="' + id + '"]');
      renoSelections.push({ menuId: id, quantity: qtyInput ? Number(qtyInput.value) || 0 : 1 });
    });
    var renoPurposes = [];
    document.querySelectorAll("[data-purpose]").forEach(function (cb) {
      if (cb.checked) { renoPurposes.push(cb.dataset.purpose); }
    });

    return {
      customer: $("inCustomer").value.trim(),
      businessType: $("inBusinessType").value,
      areaTsubo: Number($("inArea").value),
      hoursPerDay: Number($("inHours").value) || C.DEFAULT_HOURS_PER_DAY,
      daysPerMonth: Number($("inDays").value) || C.DEFAULT_DAYS_PER_MONTH,
      tariff: Number($("inTariff").value) || C.DEFAULT_TARIFF_YEN_PER_KWH,
      priceRatePercent: Number($("inPriceRate").value) || C.DEFAULT_PRICE_RATE_PERCENT,
      prefCode: $("inPref").value,
      cityCode: $("inCity").value,
      categories: selectedCategories(),
      aircon: {
        units: Number($("acUnits").value) || 0,
        year: Number($("acYear").value),
        trouble: $("acTrouble").value.trim(),
        adjustments: {
          ceilingHigh: $("adjCeilingHigh").checked,
          topFloor: $("adjTopFloor").checked,
          largeWindow: $("adjLargeWindow").checked,
          openKitchen: $("adjOpenKitchen").checked
        }
      },
      lightRows: lightRows,
      kitchenRows: kitchenRows,
      renovation: {
        purposes: renoPurposes,
        selections: renoSelections,
        timing: $("renoTiming").value.trim(),
        budget: $("renoBudget").value.trim()
      },
      photos: {
        aircon: photos.aircon, lighting: photos.lighting,
        kitchen: photos.kitchen, renovation: photos.renovation,
        renovationAfter: photos.renovationAfter
      },
      map: { base: mapState.base, blank: mapState.blank, markers: mapState.markers.slice() },
      meta: {
        proposalDate: $("inProposalDate").value,
        salesName: $("inSalesName").value.trim(),
        companyName: $("inCompanyName").value.trim() || "ストアソリューションズ株式会社"
      }
    };
  }

  /* ============ 診断 ============ */
  function computeDiagnosis() {
    lastDiag = buildDiag(collectInputs(), { includeMap: true, selectedAirconIdx: ui.selectedAirconIdx });
    renderDiag(lastDiag);
  }

  /* 入力オブジェクトから診断を組み立てる(DOM非依存 — 店舗間比較でも使用) */
  function buildDiag(input, opts) {
    opts = opts || {};
    var priceRate = input.priceRatePercent / 100;
    var selectedIdx = opts.selectedAirconIdx || 0;
    var diag = { input: input, aircon: null, lighting: null, kitchen: null, renovation: null, subsidies: [], econ: {} };

    if (input.categories.indexOf("aircon") >= 0) {
      var cap = window.SSAircon.requiredCapacity(
        { areaTsubo: input.areaTsubo, businessType: input.businessType, adjustments: input.aircon.adjustments }, C);
      var plan = window.SSAircon.pickPlan(cap.requiredKw, input.aircon.units, MA, C);
      var cands = window.SSAircon.buildCandidates(plan.cls, MA);
      if (selectedIdx >= cands.length) { selectedIdx = 0; ui.selectedAirconIdx = 0; }
      var chosen = cands[selectedIdx];
      var era = window.SSAircon.existingCop(input.aircon.year, C);
      var install = window.SSAircon.installCost(plan.cls.hp, plan.units, C);
      var econ = window.SSEconomics.airconEconomics({
        servedKw: plan.cls.kw * plan.units,
        existingCop: era.cop,
        newCop: chosen.cop,
        hoursPerDay: input.hoursPerDay,
        daysPerMonth: input.daysPerMonth,
        tariff: input.tariff,
        productCost: Math.round(chosen.price * plan.units * priceRate),
        installLow: install.low,
        installHigh: install.high
      }, C);
      diag.aircon = { cap: cap, plan: plan, candidates: cands, chosen: chosen, era: era, install: install, econ: econ,
        image: window.SSImages.get(chosen.imageKey, chosen.maker + " " + chosen.series + " イメージ") };
      diag.econ.aircon = econ;
    }

    if (input.categories.indexOf("lighting") >= 0) {
      var lrows = window.SSLighting.plan(input.lightRows, ML, C);
      var ltot = window.SSLighting.totals(lrows);
      var existingWattTotal = lrows.reduce(function (s, r) { return s + r.existingWatt * r.count; }, 0);
      var lecon = lrows.length > 0 ? window.SSEconomics.lightingEconomics({
        totalWattSaving: ltot.totalWattSaving,
        existingWattTotal: existingWattTotal,
        hoursPerDay: input.hoursPerDay,
        daysPerMonth: input.daysPerMonth,
        tariff: input.tariff,
        productCost: Math.round(ltot.productCost * priceRate),
        installLow: ltot.installLow,
        installHigh: ltot.installHigh
      }, C) : null;
      lrows.forEach(function (r) { r.image = window.SSImages.get(r.ledImageKey, r.ledName); });
      diag.lighting = { rows: lrows, totals: ltot, econ: lecon,
        image: lrows.length > 0 ? lrows[0].image : null };
      if (lecon) { diag.econ.lighting = lecon; }
    }

    if (input.categories.indexOf("kitchen") >= 0) {
      var krows = window.SSKitchen.plan(input.kitchenRows, MK, C);
      var ktot = window.SSKitchen.totals(krows);
      var kecon = krows.length > 0 ? window.SSEconomics.kitchenEconomics({
        existingAnnualKwh: ktot.existingAnnualKwh,
        newAnnualKwh: ktot.newAnnualKwh,
        tariff: input.tariff,
        productCost: Math.round(ktot.productCost * priceRate),
        installLow: ktot.installLow,
        installHigh: ktot.installHigh
      }, C) : null;
      krows.forEach(function (r) { r.image = window.SSImages.get(r.imageKey, r.typeName + " イメージ"); });
      diag.kitchen = { rows: krows, totals: ktot, econ: kecon,
        image: krows.length > 0 ? krows[0].image : null };
      if (kecon) { diag.econ.kitchen = kecon; }
    }

    if (input.categories.indexOf("renovation") >= 0) {
      diag.renovation = {
        estimate: window.SSRenovation.estimate(input.renovation.selections, MR),
        purposes: input.renovation.purposes.map(function (pid) {
          var p = MR.purposes.filter(function (x) { return x.id === pid; })[0];
          return p ? p.name : pid;
        }),
        timing: input.renovation.timing,
        budget: input.renovation.budget
      };
    }

    // 商圏の地域特性(所在地が選択されているとき)
    if (input.cityCode && MD.cities.length > 0) {
      diag.demographics = window.SSDemographics.assess(input.cityCode, input.businessType, MD, MM);
      if (input.categories.indexOf("renovation") >= 0) {
        diag.renoCases = window.SSDemographics.casesFor(input.businessType, MM);
      }
    }

    diag.subsidies = window.SSSubsidy.applicable(input.categories, MS, input.prefCode);
    diag.econAggregate = window.SSEconomics.aggregate(
      [diag.econ.aircon, diag.econ.lighting, diag.econ.kitchen].filter(Boolean), C);

    // 運用改善(費用ゼロの省エネ)+公的診断の橋渡し
    diag.operations = {
      items: MO.items.filter(function (it) {
        return it.category === "common" || input.categories.indexOf(it.category) >= 0;
      }),
      diagnosis: MO.diagnosis
    };
    diag.background = MB;

    // 製品情報・ARのQRリンク(検証済みURLのみ・選択カテゴリに応じて)
    var QR = window.SS_QR || {};
    diag.qrLinks = Object.keys(QR).map(function (k) { return QR[k]; })
      .filter(function (q) { return input.categories.indexOf(q.category) >= 0; });

    // 店舗マップ(直近描画のキャッシュを使用 — 比較用の他店舗では含めない)
    if (opts.includeMap && mapHasBase() && mapState.lastImage) {
      diag.mapImage = mapState.lastImage;
      diag.mapCounts = mapCounts();
    }

    return diag;
  }

  /* ============ 診断の描画 ============ */
  function renderDiag(diag) {
    var html = "";
    var input = diag.input;

    if (diag.mapImage) {
      html += '<div class="result-block"><h3>店舗マップ(更新箇所)</h3>' +
        '<img src="' + diag.mapImage + '" alt="店舗マップ" style="max-width:100%;border:1px solid var(--border);border-radius:6px;">' +
        (diag.mapCounts && diag.mapCounts.length > 0
          ? '<p class="status-note">マーカー: ' + diag.mapCounts.map(function (c) { return c.name + " " + c.count + "箇所"; }).join(" / ") + "</p>"
          : "") +
        "</div>";
    }

    if (diag.aircon) {
      var a = diag.aircon;
      var adjText = a.cap.adjustments.length > 0
        ? a.cap.adjustments.map(function (x) { return x.name + "+" + Math.round(x.rate * 100) + "%"; }).join("・")
        : "補正なし";
      html += '<div class="result-block"><h3>空調設備のご提案</h3>' +
        '<p class="formula-note">必要能力の算定: ' + esc(a.cap.businessTypeName) + " " + a.cap.areaTsubo + "坪 × " +
        a.cap.kwPerTsubo + "kW/坪 = " + a.cap.baseKw + "kW(" + esc(adjText) + ")→ <strong>" + a.cap.requiredKw + "kW</strong></p>" +
        '<div class="metric-row">' +
        '<div class="metric"><div class="metric-label">推奨構成</div><div class="metric-value">' + a.plan.units + "台 × " + a.plan.cls.hp + '馬力</div><div class="metric-note">合計 ' + a.plan.totalKw + "kW(" + esc(a.candidates[0].shapeName) + ")</div></div>" +
        '<div class="metric"><div class="metric-label">既設の想定効率</div><div class="metric-value">COP ' + a.era.cop + '</div><div class="metric-note">' + esc(a.era.label) + "設置の代表値</div></div>" +
        "</div>" +
        '<div class="metric-row">' +
        (photos.aircon ? '<div class="metric"><div class="metric-label">既設の状況(写真)</div><img src="' + photos.aircon + '" alt="既設空調の写真" style="max-height:130px;border-radius:6px;"></div>' : "") +
        '<div class="metric"><div class="metric-label">新機種イメージ(' + esc(a.chosen.maker) + " " + esc(a.chosen.series) + ')</div><img src="' + a.image + '" alt="新機種イメージ" style="max-height:130px;"></div>' +
        "</div>" +
        '<p class="status-note">提案する機種を選択してください(経済効果に反映されます)</p>' +
        '<div class="table-scroll"><table><thead><tr><th></th><th>メーカー</th><th>シリーズ</th><th>型番(代表例)</th><th>グレード</th><th class="num">COP(概算)</th><th class="num">本体希望価格</th></tr></thead><tbody>';
      a.candidates.forEach(function (cand, i) {
        html += '<tr class="' + (i === ui.selectedAirconIdx ? "selected-row" : "") + '">' +
          '<td><input type="radio" name="airconCand" value="' + i + '"' + (i === ui.selectedAirconIdx ? " checked" : "") + ' aria-label="この機種で提案"></td>' +
          "<td>" + esc(cand.maker) + "</td><td>" + esc(cand.series) + "</td>" +
          "<td>" + esc(cand.model) + (cand.verified ? "" : ' <span class="badge badge-warn">要確認</span>') + "</td>" +
          "<td>" + esc(cand.gradeName) + '</td><td class="num">' + cand.cop + '</td><td class="num">' + fmtYen(cand.price) + "</td></tr>";
      });
      html += "</tbody></table></div>" +
        '<p class="status-note">工事費目安(' + esc(a.install.label) + "×" + a.plan.units + "台): " + fmtYen(a.install.low) + "〜" + fmtYen(a.install.high) +
        "。「要確認」の型番は最新カタログでの確認が必要です。</p>" +
        (input.aircon.trouble ? '<p class="status-note">ヒアリングした不調: ' + esc(input.aircon.trouble) + "</p>" : "") +
        "</div>";
    }

    if (diag.lighting) {
      html += '<div class="result-block"><h3>照明設備のご提案(LED化)</h3>';
      if (diag.lighting.rows.length === 0) {
        html += '<p class="empty-note">照明の入力がありません(STEP2で本数を入力してください)</p>';
      } else {
        html += '<div class="table-scroll"><table><thead><tr><th>既設</th><th class="num">本数</th><th>LED代替(候補)</th><th class="num">1台あたり削減</th><th class="num">器具費(定価)</th></tr></thead><tbody>';
        diag.lighting.rows.forEach(function (r) {
          var opts = r.ledOptions.map(function (o) {
            return esc(o.maker) + " " + esc(o.model) + (o.verified ? "" : "(要確認)");
          }).join("<br>");
          html += "<tr><td>" + esc(r.typeName) + '</td><td class="num">' + r.count + "</td>" +
            '<td><img src="' + r.image + '" alt="" style="height:44px;float:right;margin-left:6px;">' + esc(r.ledName) + '<br><span class="status-note">' + opts + '</span></td>' +
            '<td class="num">' + r.existingWatt + "W→" + r.ledWatt + "W(−" + r.wattSavingPerUnit + 'W)</td><td class="num">' + fmtYen(r.productCost) + "</td></tr>";
        });
        html += "</tbody></table></div>" +
          (photos.lighting ? '<p><img src="' + photos.lighting + '" alt="既設照明の写真" style="max-height:130px;border-radius:6px;"> <span class="status-note">既設の状況(写真)</span></p>' : "") +
          '<p class="status-note">合計削減電力: ' + diag.lighting.totals.totalWattSaving + "W / 工事費目安: " +
          fmtYen(diag.lighting.totals.installLow) + "〜" + fmtYen(diag.lighting.totals.installHigh) + "</p>";
      }
      html += "</div>";
    }

    if (diag.kitchen) {
      html += '<div class="result-block"><h3>厨房冷凍機器のご提案</h3>';
      if (diag.kitchen.rows.length === 0) {
        html += '<p class="empty-note">厨房機器の入力がありません(STEP2で台数を入力してください)</p>';
      } else {
        html += '<div class="table-scroll"><table><thead><tr><th>機器</th><th class="num">台数</th><th>年式帯</th><th>後継候補(代表例)</th><th class="num">年間消費電力量(推計)</th><th class="num">本体希望価格</th></tr></thead><tbody>';
        diag.kitchen.rows.forEach(function (r) {
          var opts = r.options.map(function (o) {
            return esc(o.maker) + " " + esc(o.model) + (o.verified ? "" : "(要確認)");
          }).join("<br>");
          html += "<tr><td>" + esc(r.typeName) + "<br><span class='status-note'>" + esc(r.sizeName) + "</span></td>" +
            '<td class="num">' + r.count + "</td><td>" + esc(r.eraLabel) + "</td>" +
            '<td><img src="' + r.image + '" alt="" style="height:44px;float:right;margin-left:6px;">' + opts + "</td>" +
            '<td class="num">' + r.existingAnnualKwh.toLocaleString() + "→" + r.newAnnualKwh.toLocaleString() + "kWh/年</td>" +
            '<td class="num">' + fmtYen(r.productCost) + "</td></tr>";
        });
        html += "</tbody></table></div>" +
          (photos.kitchen ? '<p><img src="' + photos.kitchen + '" alt="既設厨房機器の写真" style="max-height:130px;border-radius:6px;"> <span class="status-note">既設の状況(写真)</span></p>' : "");
      }
      html += "</div>";
    }

    if (diag.demographics) {
      var dg = diag.demographics;
      html += '<div class="result-block"><h3>商圏の地域特性(' + esc(dg.city.name) + ")</h3>" +
        '<div class="table-scroll"><table><thead><tr><th>指標</th><th class="num">' + esc(dg.city.name) + '</th><th class="num">' + esc(dg.pref.name) + '平均</th><th>評価</th></tr></thead><tbody>';
      dg.comparison.forEach(function (c) {
        var badge = c.ratio == null ? "" :
          c.ratio >= MM.threshold.strong ? '<span class="badge badge-ok">高め</span>' :
          c.ratio <= MM.threshold.weak ? '<span class="badge badge-ref">低め</span>' :
          '<span class="badge badge-ref">平均的</span>';
        html += "<tr><td>" + esc(c.label) + '</td><td class="num">' + c.value.toFixed(1) + '%</td><td class="num">' + c.prefAvg.toFixed(1) + "%</td><td>" + badge + "</td></tr>";
      });
      html += "</tbody></table></div>";
      dg.recommendations.forEach(function (r) {
        html += '<div class="formula-note"><strong>' + esc(r.title) + "</strong>(" + esc(r.traitLabel) + ")<br>" +
          r.items.map(esc).join(" / ") + "<br><span>" + esc(r.reason) + "</span></div>";
      });
      html += '<p class="status-note">出典: ' + esc(MD.source) + "。" + esc(MM.note) + "</p></div>";
    }

    if (diag.renovation) {
      var re = diag.renovation;
      html += '<div class="result-block"><h3>店舗改装の概算</h3>';
      if (re.purposes.length > 0) { html += '<p class="status-note">目的: ' + esc(re.purposes.join("・")) + "</p>"; }
      if (re.estimate.breakdown.length === 0) {
        html += '<p class="empty-note">工事メニューが未選択です(STEP2で選択してください)</p>';
      } else {
        html += '<div class="table-scroll"><table><thead><tr><th>工事メニュー</th><th class="num">数量</th><th class="num">概算レンジ(税別)</th></tr></thead><tbody>';
        re.estimate.breakdown.forEach(function (b) {
          html += "<tr><td>" + esc(b.name) + '</td><td class="num">' + (b.unit === "tsubo" ? b.quantity + "坪" : "一式") + "</td>" +
            '<td class="num">' + fmtMan(b.low) + "〜" + fmtMan(b.high) + "</td></tr>";
        });
        html += '</tbody></table></div>' +
          '<p><strong>概算合計: ' + fmtMan(re.estimate.low) + "〜" + fmtMan(re.estimate.high) + "(税別)</strong></p>";
      }
      if (diag.renoCases && diag.renoCases.length > 0) {
        html += '<h3 style="margin-top:var(--space-4);">改装効果の考え方(事例)</h3>';
        diag.renoCases.forEach(function (cs) {
          html += '<div class="formula-note"><strong>' + esc(cs.title) + "</strong>(" + esc(cs.business) + ")<br>" +
            esc(cs.effect) + " <span>" + (cs.source ? "出典: " + esc(cs.source) : "(一般に言われる傾向 — 自社事例の登録は更新手順.md参照)") + "</span></div>";
        });
      }
      html += (photos.renovation ? '<p><img src="' + photos.renovation + '" alt="現状の店舗写真" style="max-height:130px;border-radius:6px;"> <span class="status-note">現状の様子(写真)</span></p>' : "") +
        '<p class="status-note">' +
        (re.timing ? "希望時期: " + esc(re.timing) + " / " : "") +
        (re.budget ? "予算感: " + esc(re.budget) + " / " : "") +
        "仕様・下地の状態により変動します。正式金額は現地調査+プラン確定後の見積となります。</p></div>";
    }

    // 経済効果サマリ
    var agg = diag.econAggregate;
    if (agg && agg.annualSavingYen > 0) {
      html += '<div class="result-block"><h3>経済効果(概算)</h3><div class="metric-row">' +
        '<div class="metric"><div class="metric-label">年間電気代削減(合計)</div><div class="metric-value positive">' + fmtMan(agg.annualSavingYen) + '/年</div><div class="metric-note">' + agg.annualSavingKwh.toLocaleString() + "kWh/年 削減</div></div>" +
        '<div class="metric"><div class="metric-label">概算投資(本体+工事)</div><div class="metric-value">' + fmtMan(agg.investLow) + "〜" + fmtMan(agg.investHigh) + "</div><div class='metric-note'>" +
        (input.priceRatePercent === 100 ? "定価ベース(実売は見積時に提示)" : "機器価格=定価×" + input.priceRatePercent + "%で試算") + "</div></div>" +
        '<div class="metric"><div class="metric-label">投資回収の目安</div><div class="metric-value">' + (agg.paybackYears != null ? "約" + agg.paybackYears + "年" : "—") + '</div><div class="metric-note">投資中央値÷年間削減額</div></div>' +
        '<div class="metric"><div class="metric-label">10年累計効果</div><div class="metric-value ' + (agg.tenYearNet >= 0 ? "positive" : "") + '">' + fmtMan(agg.tenYearNet) + "</div><div class='metric-note'>削減額×10年−投資中央値</div></div>" +
        "</div>" +
        '<div class="table-scroll"><table><thead><tr><th>カテゴリ</th><th class="num">現状電気代(推計)</th><th class="num">提案後</th><th class="num">年間削減</th><th class="num">回収目安</th></tr></thead><tbody>' +
        econRow("空調", diag.econ.aircon, input.tariff) +
        econRow("照明", diag.econ.lighting, input.tariff) +
        econRow("厨房冷凍", diag.econ.kitchen, input.tariff) +
        "</tbody></table></div>" +
        '<p class="formula-note">前提: 電気単価' + input.tariff + "円/kWh・営業" + input.hoursPerDay + "時間/日×" + input.daysPerMonth +
        "日/月・機器価格=" + (input.priceRatePercent === 100 ? "定価" : "定価×" + input.priceRatePercent + "%") +
        "。空調は負荷率" + C.AIRCON_LOAD_FACTOR + "・年式帯の代表効率(COP)による推計。実際の使用状況により変動します。</p></div>";
    } else if (diag.aircon || diag.lighting || diag.kitchen) {
      html += '<div class="result-block"><h3>経済効果(概算)</h3><p class="empty-note">効果を計算できる入力がまだありません。</p></div>';
    }

    // 運用改善(費用ゼロの省エネ)
    if (diag.operations && diag.operations.items.length > 0) {
      html += '<div class="result-block"><h3>あわせてご提案: 費用ゼロでできる運用改善</h3>' +
        '<div class="table-scroll"><table><thead><tr><th>チェック項目</th><th>ポイント</th></tr></thead><tbody>';
      diag.operations.items.forEach(function (it) {
        html += "<tr><td>" + esc(it.name) + "</td><td>" + esc(it.tip) + "</td></tr>";
      });
      html += "</tbody></table></div>" +
        '<div class="formula-note"><strong>' + esc(diag.operations.diagnosis.name) + "</strong>(" + esc(diag.operations.diagnosis.cost) + ")<br>" +
        esc(diag.operations.diagnosis.summary) + "<br><span>" + esc(diag.operations.diagnosis.note) + "</span></div>" +
        '<p class="status-note">' + esc(MO.note) + "</p></div>";
    }

    // 補助金
    if (diag.subsidies.length > 0) {
      html += '<div class="result-block"><h3>活用できる可能性のある補助金</h3>';
      diag.subsidies.forEach(function (s) {
        html += '<div class="formula-note"><strong>' + esc(s.name) + "</strong>(" + esc(s.admin) + ")<br>" +
          esc(s.summary) + "<br>補助率: " + esc(s.rateNote) + " / 公募: " + esc(s.seasonNote) +
          '<br><span class="badge badge-warn">要確認</span> ' + esc(s.caution) + "</div>";
      });
      html += '<p class="status-note">' + esc(MS.note) + "</p></div>";
    }

    $("diagContent").innerHTML = html;

    // 空調候補の選択イベント
    document.querySelectorAll('input[name="airconCand"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        ui.selectedAirconIdx = Number(radio.value);
        computeDiagnosis();
      });
    });
  }

  function econRow(name, econ, tariff) {
    if (!econ) { return ""; }
    return "<tr><td>" + name + '</td><td class="num">' + fmtYen(econ.existingAnnualKwh * tariff) + '/年</td>' +
      '<td class="num">' + fmtYen(econ.newAnnualKwh * tariff) + '/年</td>' +
      '<td class="num">' + fmtYen(econ.annualSavingYen) + '/年</td>' +
      '<td class="num">' + (econ.paybackYears != null ? "約" + econ.paybackYears + "年" : "—") + "</td></tr>";
  }

  /* ============ 資料生成 ============ */
  function generatePptx() {
    try {
      if (!validateStep1()) { showStep(1); return; }
      computeDiagnosis();
      $("loadingCard").hidden = false;
      $("genStatus").textContent = "";
      var fileName = "提案資料_" + (lastDiag.input.customer || "お客様") + "_" +
        (lastDiag.input.meta.proposalDate || "").replace(/-/g, "") + ".pptx";
      window.SSProposal.build(lastDiag, C)
        .writeFile({ fileName: fileName })
        .then(function () {
          $("loadingCard").hidden = true;
          $("genStatus").textContent = "生成しました: " + fileName + "(ダウンロードフォルダをご確認ください)";
        })
        .catch(function (e) {
          $("loadingCard").hidden = true;
          showError("提案資料の生成に失敗しました", "入力内容を確認して再度お試しください。解決しない場合はブラウザを変えてお試しください", e && e.message);
        });
    } catch (e) {
      $("loadingCard").hidden = true;
      showError("提案資料の生成に失敗しました", "入力内容を確認して再度お試しください", e && e.message);
    }
  }

  /* ============ 計算根拠のCSV出力(補助金申請の添付用・A4) ============ */
  function exportEconCsv() {
    try {
      if (!validateStep1()) { showStep(1); return; }
      computeDiagnosis();
      var d = lastDiag;
      var input = d.input;
      var rows = [];
      rows.push(["経済効果 計算根拠シート(概算)"]);
      rows.push(["店舗名", input.customer]);
      rows.push(["作成日", input.meta.proposalDate], []);
      rows.push(["■ 前提条件"]);
      rows.push(["電気単価(円/kWh)", input.tariff]);
      rows.push(["営業時間(時間/日)", input.hoursPerDay]);
      rows.push(["営業日数(日/月)", input.daysPerMonth]);
      rows.push(["機器価格の係数(対メーカー希望価格)", input.priceRatePercent + "%"]);
      rows.push(["空調の平均負荷率", C.AIRCON_LOAD_FACTOR]);
      rows.push(["既設効率の推計方法", "設置年式帯の代表値(COP)による概算"], []);
      rows.push(["■ カテゴリ別の試算", "現状 年間消費電力量(kWh)", "提案後 年間消費電力量(kWh)", "年間削減額(円)", "概算投資 下限(円)", "概算投資 上限(円)", "回収年数の目安(年)"]);
      [["空調", d.econ.aircon], ["照明", d.econ.lighting], ["厨房冷凍", d.econ.kitchen]].forEach(function (pair) {
        var e = pair[1];
        if (!e) { return; }
        rows.push([pair[0], e.existingAnnualKwh, e.newAnnualKwh, e.annualSavingYen, e.investLow, e.investHigh, e.paybackYears != null ? e.paybackYears : "-"]);
      });
      var agg = d.econAggregate;
      if (agg) {
        rows.push(["合計", agg.existingAnnualKwh, agg.newAnnualKwh, agg.annualSavingYen, agg.investLow, agg.investHigh, agg.paybackYears != null ? agg.paybackYears : "-"], []);
      }
      rows.push(["■ 注記"]);
      rows.push(["本シートの金額・効果はすべて概算の試算です。実際の効果は使用状況・契約条件により変動します。"]);
      rows.push(["機器価格はメーカー希望価格ベース(係数適用)。正式金額は現地調査後の見積によります。"]);
      rows.push(["補助金の申請可否・要件は最新の公募要領をご確認ください。"]);
      var csv = "﻿" + rows.map(function (r) {
        return r.map(function (cell) { return '"' + String(cell == null ? "" : cell).replace(/"/g, '""') + '"'; }).join(",");
      }).join("\r\n");
      var blob = new Blob([csv], { type: "text/csv" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "計算根拠_" + (input.customer || "未入力") + "_" + (input.meta.proposalDate || "").replace(/-/g, "") + ".csv";
      a.click();
      URL.revokeObjectURL(a.href);
      $("genStatus").textContent = "計算根拠シート(CSV)を出力しました(ダウンロードフォルダをご確認ください)";
    } catch (e) {
      showError("計算根拠の出力に失敗しました", "入力内容を確認して再度お試しください", e && e.message);
    }
  }

  /* ============ 店舗間比較(B1) ============ */
  var compareStores = [];

  function loadCompareStores(ev) {
    var files = Array.prototype.slice.call(ev.target.files);
    ev.target.value = "";
    if (files.length === 0) { return; }
    compareStores = [];
    var pending = files.length;
    files.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var d = JSON.parse(reader.result);
          if (d._tool === "store-solutions-proposal-tool") {
            compareStores.push({ name: d.customer || file.name, diag: buildDiag(d, { includeMap: false }) });
          }
        } catch (e) { /* 壊れたファイルはスキップ(件数表示で気づける) */ }
        pending -= 1;
        if (pending === 0) { renderCompareTable(files.length); }
      };
      reader.readAsText(file);
    });
  }

  function renderCompareTable(selectedCount) {
    var wrap = $("compareResult");
    if (compareStores.length < 2) {
      wrap.innerHTML = '<p class="status-note">比較には2件以上の有効な保存ファイルが必要です(読込 ' + compareStores.length + "/" + selectedCount + "件)</p>";
      $("compareReportBtn").hidden = true;
      return;
    }
    compareStores.sort(function (a, b) {
      return (b.diag.econAggregate ? b.diag.econAggregate.annualSavingYen : 0) - (a.diag.econAggregate ? a.diag.econAggregate.annualSavingYen : 0);
    });
    var html = '<div class="table-scroll"><table><thead><tr><th>店舗</th><th>所在地</th><th class="num">年間削減額</th><th class="num">概算投資(中央値)</th><th class="num">回収目安</th><th>商圏の特徴</th></tr></thead><tbody>';
    compareStores.forEach(function (s) {
      var agg = s.diag.econAggregate || {};
      var dgLabel = s.diag.demographics
        ? s.diag.demographics.recommendations.map(function (r) { return r.traitLabel; }).join("・")
        : "—";
      html += "<tr><td>" + esc(s.name) + "</td><td>" + (s.diag.demographics ? esc(s.diag.demographics.city.name) : "—") + "</td>" +
        '<td class="num">' + (agg.annualSavingYen ? fmtMan(agg.annualSavingYen) + "/年" : "—") + "</td>" +
        '<td class="num">' + (agg.investMid ? fmtMan(agg.investMid) : "—") + "</td>" +
        '<td class="num">' + (agg.paybackYears != null ? "約" + agg.paybackYears + "年" : "—") + "</td>" +
        "<td>" + esc(dgLabel) + "</td></tr>";
    });
    html += "</tbody></table></div><p class='status-note'>削減額の大きい順。各店舗の入力前提(単価・時間)はそれぞれの保存内容によります。</p>";
    wrap.innerHTML = html;
    $("compareReportBtn").hidden = false;
  }

  function generateComparePptx() {
    try {
      $("loadingCard").hidden = false;
      window.SSProposal.buildComparison(compareStores, C)
        .writeFile({ fileName: "店舗間比較_" + (compareStores.length) + "店舗.pptx" })
        .then(function () {
          $("loadingCard").hidden = true;
          $("genStatus").textContent = "比較レポートを生成しました(ダウンロードフォルダをご確認ください)";
        })
        .catch(function (e) {
          $("loadingCard").hidden = true;
          showError("比較レポートの生成に失敗しました", "保存JSONの内容を確認してください", e && e.message);
        });
    } catch (e) {
      $("loadingCard").hidden = true;
      showError("比較レポートの生成に失敗しました", "保存JSONの内容を確認してください", e && e.message);
    }
  }

  /* ============ 入力の保存・読込 ============ */
  function saveJson() {
    var data = collectInputs();
    data._tool = "store-solutions-proposal-tool";
    data._version = 1;
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ヒアリング_" + (data.customer || "未入力") + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadJson(ev) {
    var file = ev.target.files[0];
    ev.target.value = "";
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        if (d._tool !== "store-solutions-proposal-tool") { throw new Error("このツールの保存ファイルではありません"); }
        applyInputs(d);
        showStep(1);
        $("genStatus").textContent = "";
      } catch (e) {
        showError("保存ファイルの読込に失敗しました", "このツールで保存したJSONファイルを選択してください", e && e.message);
      }
    };
    reader.readAsText(file);
  }

  function applyInputs(d) {
    $("inCustomer").value = d.customer || "";
    $("inBusinessType").value = d.businessType || "office";
    $("inArea").value = d.areaTsubo || "";
    $("inHours").value = d.hoursPerDay || C.DEFAULT_HOURS_PER_DAY;
    $("inDays").value = d.daysPerMonth || C.DEFAULT_DAYS_PER_MONTH;
    $("inTariff").value = d.tariff || C.DEFAULT_TARIFF_YEN_PER_KWH;
    $("inPriceRate").value = d.priceRatePercent || C.DEFAULT_PRICE_RATE_PERCENT;
    if (MD && MD.cities.length > 0) {
      $("inPref").value = d.prefCode || "";
      fillCities(d.prefCode || "", d.cityCode || null);
    }
    var cats = d.categories || [];
    $("catAircon").checked = cats.indexOf("aircon") >= 0;
    $("catLighting").checked = cats.indexOf("lighting") >= 0;
    $("catKitchen").checked = cats.indexOf("kitchen") >= 0;
    $("catRenovation").checked = cats.indexOf("renovation") >= 0;

    var ac = d.aircon || {};
    $("acUnits").value = ac.units || "";
    $("acYear").value = ac.year || 2005;
    $("acTrouble").value = ac.trouble || "";
    var adj = ac.adjustments || {};
    $("adjCeilingHigh").checked = !!adj.ceilingHigh;
    $("adjTopFloor").checked = !!adj.topFloor;
    $("adjLargeWindow").checked = !!adj.largeWindow;
    $("adjOpenKitchen").checked = !!adj.openKitchen;

    $("lightRows").innerHTML = "";
    (d.lightRows && d.lightRows.length ? d.lightRows : [{}]).forEach(function (r) {
      addLightRow();
      var row = $("lightRows").lastElementChild;
      if (r.typeId) { row.querySelector("[data-light-type]").value = r.typeId; }
      if (r.count) { row.querySelector("[data-light-count]").value = r.count; }
    });

    $("kitchenRows").innerHTML = "";
    (d.kitchenRows && d.kitchenRows.length ? d.kitchenRows : [{}]).forEach(function (r) {
      addKitchenRow();
      var row = $("kitchenRows").lastElementChild;
      if (r.typeId) {
        row.querySelector("[data-kitchen-type]").value = r.typeId;
        row.querySelector("[data-kitchen-type]").dispatchEvent(new Event("change"));
      }
      if (r.sizeId) { row.querySelector("[data-kitchen-size]").value = r.sizeId; }
      if (r.year) { row.querySelector("[data-kitchen-year]").value = r.year; }
      if (r.count) { row.querySelector("[data-kitchen-count]").value = r.count; }
    });

    var reno = d.renovation || {};
    document.querySelectorAll("[data-purpose]").forEach(function (cb) {
      cb.checked = (reno.purposes || []).indexOf(cb.dataset.purpose) >= 0;
    });
    document.querySelectorAll("[data-menu]").forEach(function (cb) {
      var sel = (reno.selections || []).filter(function (s) { return s.menuId === cb.dataset.menu; })[0];
      cb.checked = !!sel;
      var qty = document.querySelector('[data-menu-qty="' + cb.dataset.menu + '"]');
      if (qty && sel) { qty.value = sel.quantity || ""; }
    });
    $("renoTiming").value = reno.timing || "";
    $("renoBudget").value = reno.budget || "";

    // 既設写真・店舗マップの復元
    var ph = d.photos || {};
    ["aircon", "lighting", "kitchen", "renovation", "renovationAfter"].forEach(function (cat) {
      photos[cat] = ph[cat] || null;
      refreshPhotoPreview(cat);
    });
    var m = d.map || {};
    mapState.base = m.base || null;
    mapState.blank = !!m.blank;
    mapState.markers = (m.markers || []).slice();
    mapState.lastImage = null;
    if (mapHasBase()) { showMapEditor(); } else { $("mapEditor").hidden = true; }

    var meta = d.meta || {};
    if (meta.proposalDate) { $("inProposalDate").value = meta.proposalDate; }
    $("inSalesName").value = meta.salesName || "";
    if (meta.companyName) { $("inCompanyName").value = meta.companyName; }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
