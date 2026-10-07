// Regolamento dei pronostici del Diario per l'app: stessa logica di signals/regolamento.py (il bot la ricontrolla
// quando salvi). I casi di prova condivisi sono in regole_casi.json (test: test_regole.html nel browser,
// signals/test_regolamento.py in Python).
(function (root) {
  "use strict";
  var LIMITS = { multipla: 20, sistema: 10, combos: 120, min_odds: 1.01, live_fresh_s: 600 };

  function calcioDim(code) {
    if (code === "P1" || code === "PN" || code === "P2") return "next";
    if (/^C[OU]\d+$/.test(code)) return "corners";
    if (/^K[OU]\d+$/.test(code)) return "cards";
    return "score";
  }
  function calcioWins(code, h, a, h1, a1) {
    switch (code) {
      case "1": return h > a;
      case "X": return h === a;
      case "2": return a > h;
      case "1X": return h >= a;
      case "X2": return a >= h;
      case "12": return h !== a;
      case "GG": return h > 0 && a > 0;
      case "NG": return !(h > 0 && a > 0);
      case "H1": return h1 > a1;
      case "HX": return h1 === a1;
      case "H2": return a1 > h1;
      case "CSAH": return h > a && h > 3;
      case "CSAA": return a > h && a > 3;
      case "CSAD": return h === a && h > 3;
      case "T1S": return h > 0;
      case "T1N": return h === 0;
      case "T2S": return a > 0;
      case "T2N": return a === 0;
    }
    var m;
    if ((m = /^([OU])(\d)(\d)$/.exec(code))) { var n = +m[2] + 1; return m[1] === "O" ? h + a >= n : h + a < n; }
    if ((m = /^1([OU])(\d)(\d)$/.exec(code))) { var n1 = +m[2] + 1; return m[1] === "O" ? h1 + a1 >= n1 : h1 + a1 < n1; }
    if ((m = /^CS(\d)(\d)$/.exec(code))) return h === +m[1] && a === +m[2];
    return null;
  }
  function cornersWins(code, total) { var line = +code.slice(2) / 10; return code[1] === "O" ? total > line : total < line; }
  var cardsWins = cornersWins;   // KO45: piu' di 4,5 cartellini (gialli + rossi), stessa regola degli angoli
  var TENNIS_SPACE = ["20", "21", "12", "02"];
  function tennisWins(code, s) {
    if (code === "W1") return s === "20" || s === "21";
    if (code === "W2") return s === "02" || s === "12";
    if (code === "TO25") return s === "21" || s === "12";
    if (code === "TU25") return s === "20" || s === "02";
    return code === "S" + s;
  }
  // Ippica (04/10): codici col nome del cavallo, "V:NOME" vincente, "P:NOME" piazzato (primi tre)
  var IPPICA_RE = /^([VP]):([A-Z0-9 ]{1,40})$/;
  function ippicaMarket(code) {
    var m = IPPICA_RE.exec(code || ""); if (!m) return null;
    return m[1] === "V" ? { sport: "ippica", group: "VIN", tab: "Corsa", label: "Vincente", src: "snai" }
      : { sport: "ippica", group: "PIA:" + m[2], tab: "Corsa", label: "Piazzato", src: "snai" };
  }
  function marketOf(markets, sport, code) { return sport === "ippica" ? ippicaMarket(code) : (markets[sport] || {})[code]; }
  function all(arr, f) { for (var i = 0; i < arr.length; i++) if (!f(arr[i])) return false; return true; }

  function compatible(sport, codes) {
    if (sport === "tennis") return TENNIS_SPACE.some(function (s) { return all(codes, function (c) { return tennisWins(c, s); }); });
    if (sport === "ippica") {
      var ms = codes.map(function (c) { return IPPICA_RE.exec(c); });
      if (!all(ms, function (m) { return !!m; })) return false;
      var win = {}, top = {};
      ms.forEach(function (m) { top[m[2]] = 1; if (m[1] === "V") win[m[2]] = 1; });
      return Object.keys(win).length <= 1 && Object.keys(top).length <= 3;
    }
    var dims = {};
    codes.forEach(function (c) { (dims[calcioDim(c)] = dims[calcioDim(c)] || []).push(c); });
    for (var d in dims) {
      var cs = dims[d];
      if (d === "next") { if (new Set(cs).size > 1) return false; continue; }
      if (d === "corners") {
        var okc = false;
        for (var t = 0; t <= 30 && !okc; t++) okc = all(cs, function (c) { return cornersWins(c, t); });
        if (!okc) return false;
        continue;
      }
      if (d === "cards") {
        var okk = false;
        for (var tk = 0; tk <= 20 && !okk; tk++) okk = all(cs, function (c) { return cardsWins(c, tk); });
        if (!okk) return false;
        continue;
      }
      var ok = false;
      for (var h = 0; h < 9 && !ok; h++) for (var a = 0; a < 9 && !ok; a++)
        for (var h1 = 0; h1 <= h && !ok; h1++) for (var a1 = 0; a1 <= a && !ok; a1++)
          ok = all(cs, function (c) { return calcioWins(c, h, a, h1, a1); });
      if (!ok) return false;
    }
    return true;
  }

  function comb(n, k) { var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
  function combinations(arr, k) {
    var out = [];
    (function rec(start, cur) {
      if (cur.length === k) { out.push(cur.slice()); return; }
      for (var i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
    })(0, []);
    return out;
  }
  function prod(xs) { return xs.reduce(function (p, x) { return p * x; }, 1); }

  // markets: catalogo dal Python (dati dell'app: data.regole.markets[sport][code] = {group, tab, label, src})
  function validate(markets, mode, k, legs, now) {
    var err = [];
    function add(e) { if (err.indexOf(e) < 0) err.push(e); }
    if (!legs.length) return ["La schedina è vuota."];
    legs.forEach(function (g) {
      var m = marketOf(markets, g.sport, g.code);
      if (!m) { add("Mercato non disponibile: " + g.code + "."); return; }
      if (!g.odds || g.odds < LIMITS.min_odds) add("Quota non valida su " + (g.event_name || g.event) + ".");
      if (g.live) { if (g.fresh == null || now - g.fresh > LIMITS.live_fresh_s) add("Una quota live non è aggiornata: mercato sospeso, toglila o riprova tra poco."); }
      else if (g.start != null && g.start <= now) add("Una partita pre-partita è già iniziata: la quota pre-partita non vale più.");
    });
    var byEvent = {};
    legs.forEach(function (g) { var key = g.sport + ":" + g.event; (byEvent[key] = byEvent[key] || []).push(g); });
    Object.keys(byEvent).forEach(function (key) {
      var gs = byEvent[key], sport = gs[0].sport;
      var groups = gs.map(function (g) { var m = marketOf(markets, sport, g.code); return m ? m.group : null; }).filter(Boolean);
      if (new Set(groups).size !== groups.length) add("Due esiti dello stesso mercato sulla stessa partita: ne vale uno solo.");
      else if (!compatible(sport, gs.map(function (g) { return g.code; }))) add("Esiti in contraddizione sulla stessa partita (non possono vincere insieme).");
    });
    var n = legs.length, multi = Object.keys(byEvent).some(function (k2) { return byEvent[k2].length > 1; });
    if ((mode === "multipla" || mode === "sistema") && multi) add("In multipla e sistema vale un solo esito per partita.");
    if (mode === "multipla") {
      if (n < 2) add("La multipla vuole almeno 2 partite.");
      if (n > LIMITS.multipla) add("La multipla ha al massimo " + LIMITS.multipla + " partite.");
    } else if (mode === "sistema") {
      if (n < 3) add("Il sistema vuole almeno 3 partite.");
      else if (n > LIMITS.sistema) add("Il sistema ha al massimo " + LIMITS.sistema + " partite.");
      else if (k == null || k < 2 || k >= n) add("Nel sistema scegli quante partite per combinazione (da 2 a " + (n - 1) + ").");
      else if (comb(n, k) > LIMITS.combos) add("Troppe combinazioni (" + comb(n, k) + "): al massimo " + LIMITS.combos + ".");
    } else if (mode !== "singole") add("Tipo di schedina sconosciuto.");
    var seen = {}, dup = false;
    legs.forEach(function (g) { var key = g.sport + ":" + g.event + ":" + g.code; if (seen[key]) dup = true; seen[key] = 1; });
    if (dup) add("Lo stesso esito compare due volte.");
    return err;
  }

  function totalOdds(mode, k, odds) {
    if (mode === "multipla") return Math.round(prod(odds) * 100) / 100;
    if (mode === "sistema" && k) {
      var cs = combinations(odds, k).map(prod);
      return cs.length ? Math.round(cs.reduce(function (s, x) { return s + x; }, 0) / cs.length * 100) / 100 : null;
    }
    return null;
  }

  function settle(mode, k, legs) {
    var pending = legs.some(function (l) { return l[1] == null; });
    if (mode === "multipla") {
      if (legs.some(function (l) { return l[1] === 0; })) return { points: -1, won: false };
      if (pending) return null;
      if (legs.every(function (l) { return l[1] === -1; })) return { points: 0, won: null };
      return { points: Math.round((prod(legs.map(function (l) { return l[1] === -1 ? 1 : l[0]; })) - 1) * 10000) / 10000, won: true };
    }
    if (pending) return null;
    var pts = combinations(legs, k).map(function (c) {
      return c.some(function (l) { return l[1] === 0; }) ? -1 : prod(c.map(function (l) { return l[1] === -1 ? 1 : l[0]; })) - 1;
    });
    var p = pts.reduce(function (s, x) { return s + x; }, 0) / pts.length;
    return { points: Math.round(p * 10000) / 10000, won: p > 0 };
  }

  root.Regole = { compatible: compatible, validate: validate, totalOdds: totalOdds, settle: settle, combos: comb, LIMITS: LIMITS, marketOf: marketOf };
})(typeof window !== "undefined" ? window : this);
