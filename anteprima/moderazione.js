// Filtro dei testi degli utenti (commenti, nome, bio): stesse regole di signals/moderazione.py, lette dallo stesso
// app/moderazione.json. Casi di prova comuni in app/moderazione_casi.json (test_moderazione.py; nel browser: StatSightMod.check su ogni caso deve dare lo stesso esito).
(function () {
  "use strict";
  var rules = null;
  var ready = fetch("moderazione.json").then(function (r) { return r.json(); }).then(function (j) { rules = j; return j; }).catch(function () { return null; });
  var LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
  function collapse(s) { return s.replace(/([a-z])\1+/g, "$1"); }
  // minuscole, senza accenti, numeri-lettera, parole separate da uno spazio, lettere staccate riattaccate
  function normalize(text) {
    var t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[013457@$]/g, function (c) { return LEET[c]; });
    var out = [], run = "";
    t.split(/[^a-z]+/).forEach(function (w) {
      if (w.length === 1) { run += w; return; }
      if (run) { out.push(run); run = ""; }
      if (w) out.push(w);
    });
    if (run) out.push(run);
    return collapse(out.join(" "));
  }
  function entryRe(entry) {
    var e = collapse(entry.toLowerCase()), star = /\*$/.test(e);
    e = e.replace(/\*$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, " ?");
    return new RegExp("(?:^| )" + e + (star ? "[a-z]*" : "") + "(?: |$)");
  }
  // null se il testo va bene, altrimenti il motivo: "rete" (regole non ancora lette), "lungo", "contatti", "vendita", "linguaggio"
  function check(text) {
    if (!rules) return "rete";
    if (text.length > rules.limiti.max_caratteri) return "lungo";
    var raw = text.toLowerCase();
    if (rules.contatti.some(function (p) { return new RegExp(p).test(raw); })) return "contatti";
    var norm = normalize(text);
    if (rules.vendita.some(function (e) { return entryRe(e).test(norm); })) return "vendita";
    if (rules.linguaggio.some(function (e) { return entryRe(e).test(norm); })) return "linguaggio";
    return null;
  }
  window.StatSightMod = { check: check, normalize: normalize, ready: ready, rules: function () { return rules; } };
})();
