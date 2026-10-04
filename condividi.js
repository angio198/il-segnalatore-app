// Schedina condivisa (03/10): un codice corto (anche in un link "#s=<codice>") che contiene partite, esiti, quote,
// tipo e puntata. Funziona SENZA server: chi lo riceve vede la scheda e la puo' copiare (stesse regole di "Copia").
// Funzione pura, la stessa per l'app e per il server (server/chat/chat.js la usa per i messaggi con schedina).
//   SS1.<base64url di JSON compatto>.<controllo>
(function (root) {
  "use strict";
  var PREFIX = "SS1.";
  function b64e(s) {
    var b = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, "utf8").toString("base64");
    return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64d(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    return typeof atob === "function" ? decodeURIComponent(escape(atob(s))) : Buffer.from(s, "base64").toString("utf8");
  }
  function sum(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1679616; return h.toString(36); }
  // slip: { mode, k, stake, legs: [{ event, sport, code, odds, ename, label }], by (nome di chi condivide, facoltativo),
  //         text (facoltativo, 04/10: un beet inoltrato, al massimo 280 caratteri; senza partite basta il testo) }
  function encode(slip) {
    var o = { m: slip.mode === "multipla" ? "m" : slip.mode === "sistema" ? "s" : "1", k: slip.k || 0, p: slip.stake || 0, b: (slip.by || "").slice(0, 24),
              l: (slip.legs || []).slice(0, 20).map(function (l) { return [l.event, l.sport, l.code, Math.round(l.odds * 100), (l.ename || "").slice(0, 60), (l.label || "").slice(0, 60)]; }) };
    if (slip.text) o.t = String(slip.text).slice(0, 280);
    var body = b64e(JSON.stringify(o));
    return PREFIX + body + "." + sum(body);
  }
  // null se il codice non e' valido (scritto male, tagliato, cambiato a mano)
  function decode(code) {
    code = String(code || "").trim();
    var m = /(?:#s=)?(SS1\.[A-Za-z0-9_-]+\.[a-z0-9]+)/.exec(code); if (!m) return null;
    var parts = m[1].split("."), body = parts[1];
    if (sum(body) !== parts[2]) return null;
    try {
      var o = JSON.parse(b64d(body));
      if (!o || !Array.isArray(o.l) || (!o.l.length && !o.t)) return null;
      var out = { mode: o.m === "m" ? "multipla" : o.m === "s" ? "sistema" : "singole", k: o.k || null, stake: o.p || null, by: o.b || "",
               legs: o.l.map(function (x) { return { event: x[0], sport: x[1], code: x[2], odds: x[3] / 100, ename: x[4], label: x[5] }; }) };
      if (o.t) out.text = String(o.t).slice(0, 280);
      return out;
    } catch (e) { return null; }
  }
  var API = { encode: encode, decode: decode };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CONDIVIDI = API;
})(typeof window !== "undefined" ? window : this);
