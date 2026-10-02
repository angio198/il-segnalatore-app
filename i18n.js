// Lingua dell'app (richiesta utente 02/10/2026: traduzione in inglese, scelta in Impostazioni).
// L'app e' scritta in italiano; qui un osservatore traduce i testi appena vengono disegnati, prima che si
// vedano, con il dizionario di i18n_en.js: frase esatta, oppure frase con i numeri al posto di "#"
// ("# vinti su #" -> "# won of #"). Una frase che non e' nel dizionario resta in italiano: per tradurla basta
// aggiungerla li'. Le quote "1,81" in inglese diventano "1.81".
(function () {
  "use strict";
  var KEY = "statsight.lingua";
  var lang = null;
  try { lang = localStorage.getItem(KEY); } catch (e) {}
  if (lang !== "it" && lang !== "en") lang = /^it\b/i.test(navigator.language || "it") ? "it" : "en";
  document.documentElement.lang = lang;
  window.getLingua = function () { return lang; };
  window.setLingua = function (v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    location.reload();
  };
  if (lang === "it") return;

  var EN = window.I18N_EN || {};
  var NUM = /[+−-]?\d+(?:[.,]\d+)*%?/g;
  var NUMERIC = /^[\s\d.,+−%·/:–\-x×]+$/;
  function dots(s) { return s.replace(/(\d),(\d)/g, "$1.$2"); }

  // voci che finiscono con " *": prefissi ("Mostra i segnali di *" + resto tradotto a parte)
  var PREFIX = Object.keys(EN).filter(function (k) { return / \*$/.test(k); })
    .map(function (k) { return [k.slice(0, -1), EN[k].replace(/\*$/, "")]; })
    .sort(function (a, b) { return b[0].length - a[0].length; });

  function one(t) {
    var out = EN[t];
    if (out != null) return out;
    var nums = [];
    var k = t.replace(NUM, function (m) { nums.push(m); return "#"; });
    if (nums.length && EN[k] != null) {
      var i = 0;
      return EN[k].replace(/#/g, function () { return dots(nums[i++] || ""); });
    }
    for (var p = 0; p < PREFIX.length; p++) {
      if (t.indexOf(PREFIX[p][0]) === 0) return PREFIX[p][1] + (one(t.slice(PREFIX[p][0].length)) || t.slice(PREFIX[p][0].length));
    }
    return null;
  }
  // pezzi di una frase composta: tradotti uno per uno, null se nessuno cambia
  function pieces(parts, sep) {
    var any = false;
    parts = parts.map(function (x) {
      var r = NUMERIC.test(x) ? dots(x) : (one(x) || frag(x));
      if (r != null && r !== x) any = true;
      return r == null ? x : r;
    });
    return any ? parts.join(sep) : null;
  }
  // parole fisse dei messaggi dei bot (esiti dell'ippica...), dentro testi con nomi propri
  var FRAG = window.I18N_EN_FRAG || [];
  function frag(t) {
    var out = t;
    for (var i = 0; i < FRAG.length; i++) out = out.replace(FRAG[i][0], FRAG[i][1]);
    return out === t ? null : dots(out);
  }
  // frase intera; se manca: i pezzi separati da " · ", gli elenchi ": a, b, c", le frasi una per una
  function phrase(t) {
    if (NUMERIC.test(t)) return dots(t);
    var out = one(t);
    if (out != null) return out;
    if (t.indexOf(" · ") > 0) { out = pieces(t.split(" · "), " · "); if (out) return out; }
    if (t.indexOf(": ") === 0) { out = pieces(t.slice(2).split(", "), ", "); if (out) return ": " + out; }
    var sentences = t.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) { out = pieces(sentences, " "); if (out) return out; }
    return frag(t);
  }
  function tr(s) {
    var t = s.trim();
    if (!t) return null;
    var out = phrase(t);
    return out == null || out === t ? null : s.replace(t, out);
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var ATTRS = ["aria-label", "title", "placeholder"];
  function fixEl(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute && el.getAttribute(ATTRS[i]);
      if (v) { var r = tr(v); if (r != null) el.setAttribute(ATTRS[i], r); }
    }
  }
  function walk(node) {
    if (node.nodeType === 3) {
      if (node.parentNode && SKIP[node.parentNode.nodeName]) return;
      if (node.parentNode && node.parentNode.closest && node.parentNode.closest('[translate="no"]')) return;  // testi dell'utente (nome, bio)
      var r = tr(node.data);
      if (r != null) node.data = r;
      return;
    }
    if (node.nodeType !== 1 || SKIP[node.nodeName] || node.getAttribute("translate") === "no") return;
    fixEl(node);
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }
  function start() {
    walk(document.body);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === "characterData") walk(m.target);
        else if (m.type === "attributes") fixEl(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  document.title = "StatSight";
})();
