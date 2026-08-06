/* 機器イメージの取得 — 収集済みライブラリ(data/images.js)優先、無ければ自作SVGイラスト(著作権フリー)で代替 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(require("../data/images.js")); }
  else { root.SSImages = factory(root.SS_IMAGES || {}); }
})(typeof self !== "undefined" ? self : this, function (LIB) {

  function b64(s) {
    if (typeof btoa === "function") { return btoa(unescape(encodeURIComponent(s))); }
    return Buffer.from(s, "utf8").toString("base64");
  }

  var FRAME_PRE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">' +
    '<rect x="0" y="0" width="200" height="150" fill="#f2f4f7"/>';
  var STROKE = 'fill="none" stroke="#5a6472" stroke-width="3"';
  var FILLED = 'fill="#dfe4ea" stroke="#5a6472" stroke-width="3"';

  /* 機器タイプ別の簡易シルエット(中央120x80の領域に描く) */
  var SHAPES = {
    aircon:
      '<rect x="50" y="35" width="100" height="70" rx="8" ' + FILLED + '/>' +
      '<rect x="65" y="50" width="70" height="40" rx="4" ' + STROKE + '/>' +
      '<line x1="50" y1="42" x2="150" y2="42" stroke="#5a6472" stroke-width="3"/>' +
      '<line x1="57" y1="35" x2="57" y2="105" stroke="#5a6472" stroke-width="3"/>' +
      '<line x1="143" y1="35" x2="143" y2="105" stroke="#5a6472" stroke-width="3"/>',
    light_baselight:
      '<rect x="35" y="55" width="130" height="28" rx="6" ' + FILLED + '/>' +
      '<rect x="45" y="63" width="110" height="12" rx="6" fill="#fff" stroke="#5a6472" stroke-width="2"/>',
    light_downlight:
      '<circle cx="100" cy="70" r="30" ' + FILLED + '/>' +
      '<circle cx="100" cy="70" r="16" fill="#fff" stroke="#5a6472" stroke-width="2"/>',
    light_highbay:
      '<path d="M70 45 L130 45 L145 85 L55 85 Z" ' + FILLED + '/>' +
      '<circle cx="100" cy="95" r="14" fill="#fff" stroke="#5a6472" stroke-width="3"/>' +
      '<rect x="90" y="30" width="20" height="15" ' + FILLED + '/>',
    light_spot:
      '<rect x="75" y="45" width="55" height="32" rx="8" transform="rotate(25 100 60)" ' + FILLED + '/>' +
      '<rect x="93" y="85" width="14" height="25" ' + FILLED + '/>' +
      '<rect x="70" y="108" width="60" height="8" rx="4" ' + FILLED + '/>',
    kitchen_upright:
      '<rect x="65" y="25" width="70" height="100" rx="4" ' + FILLED + '/>' +
      '<line x1="65" y1="75" x2="135" y2="75" stroke="#5a6472" stroke-width="3"/>' +
      '<line x1="100" y1="25" x2="100" y2="125" stroke="#5a6472" stroke-width="3"/>' +
      '<rect x="90" y="45" width="6" height="18" fill="#5a6472"/>' +
      '<rect x="104" y="45" width="6" height="18" fill="#5a6472"/>',
    kitchen_cold_table:
      '<rect x="35" y="55" width="130" height="55" rx="4" ' + FILLED + '/>' +
      '<line x1="78" y1="55" x2="78" y2="110" stroke="#5a6472" stroke-width="3"/>' +
      '<line x1="122" y1="55" x2="122" y2="110" stroke="#5a6472" stroke-width="3"/>' +
      '<rect x="35" y="47" width="130" height="8" fill="#c6ccd4" stroke="#5a6472" stroke-width="2"/>',
    kitchen_ice:
      '<rect x="60" y="35" width="80" height="90" rx="4" ' + FILLED + '/>' +
      '<rect x="70" y="80" width="60" height="35" fill="#fff" stroke="#5a6472" stroke-width="2"/>' +
      '<rect x="76" y="88" width="14" height="14" fill="#dfe9f5" stroke="#5a6472" stroke-width="2"/>' +
      '<rect x="93" y="88" width="14" height="14" fill="#dfe9f5" stroke="#5a6472" stroke-width="2"/>' +
      '<rect x="110" y="88" width="14" height="14" fill="#dfe9f5" stroke="#5a6472" stroke-width="2"/>',
    kitchen_showcase:
      '<rect x="65" y="25" width="70" height="100" rx="4" ' + FILLED + '/>' +
      '<rect x="75" y="35" width="50" height="70" fill="#eaf2fa" stroke="#5a6472" stroke-width="2"/>' +
      '<line x1="75" y1="58" x2="125" y2="58" stroke="#5a6472" stroke-width="2"/>' +
      '<line x1="75" y1="81" x2="125" y2="81" stroke="#5a6472" stroke-width="2"/>',
    kitchen_stocker:
      '<rect x="45" y="55" width="110" height="60" rx="4" ' + FILLED + '/>' +
      '<rect x="45" y="45" width="110" height="10" rx="3" fill="#c6ccd4" stroke="#5a6472" stroke-width="2"/>' +
      '<rect x="90" y="48" width="20" height="4" fill="#5a6472"/>',
    generic:
      '<rect x="55" y="40" width="90" height="70" rx="6" ' + FILLED + '/>'
  };

  /* imageKey → シルエットの対応 */
  function shapeFor(key) {
    if (!key) { return SHAPES.generic; }
    if (key.indexOf("aircon") === 0) { return SHAPES.aircon; }
    if (key.indexOf("light_baselight") === 0) { return SHAPES.light_baselight; }
    if (key.indexOf("light_downlight") === 0) { return SHAPES.light_downlight; }
    if (key.indexOf("light_highbay") === 0) { return SHAPES.light_highbay; }
    if (key.indexOf("light_spot") === 0) { return SHAPES.light_spot; }
    if (key.indexOf("kitchen_upright") === 0) { return SHAPES.kitchen_upright; }
    if (key.indexOf("kitchen_cold_table") === 0) { return SHAPES.kitchen_cold_table; }
    if (key.indexOf("kitchen_ice") === 0) { return SHAPES.kitchen_ice; }
    if (key.indexOf("kitchen_ref_showcase") === 0) { return SHAPES.kitchen_showcase; }
    if (key.indexOf("kitchen_freezer_stocker") === 0) { return SHAPES.kitchen_stocker; }
    return SHAPES.generic;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* key の画像を返す(収集済みがあればそれ、無ければSVGイラスト)。label はイラスト下部の説明文 */
  function get(key, label) {
    if (LIB && LIB[key]) { return LIB[key]; }
    var svg = FRAME_PRE + shapeFor(key) +
      (label ? '<text x="100" y="140" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#5a6472">' + esc(label) + "</text>" : "") +
      "</svg>";
    return "data:image/svg+xml;base64," + b64(svg);
  }

  function has(key) { return !!(LIB && LIB[key]); }

  return { get: get, has: has };
});
