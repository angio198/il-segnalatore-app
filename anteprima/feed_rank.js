// Ordine del feed del Diario (docs/specifiche_social/social_v1.txt, sezione 5.2). Funzione PURA: la stessa usata
// dall'app (oggi il calcolo e' sul telefono) e dal server (server/feed/, test in server/test_feed_rank.js).
//
//   score = affinita' x decadimento per l'eta' x spinta dell'engagement
//
// - affinita': accumulata per utente-autore (Segui +1, Salva +0,8, Commento +0,5, Reazione +0,3, letto +0,1,
//   saltato in meno di 2 s -0,15) e per utente-argomento (stessi pesi, per ogni argomento del post); l'argomento
//   pesa il 40% dell'autore. Base 1, mai sotto 0,1: anche un autore nuovo si vede.
// - eta': 0,5 ^ (ore / emivita); emivita 6 h pronostico, 24 h analisi e statistica, 12 h notizia.
// - engagement: reazioni, commenti e salvataggi dell'ultima ora (log, cosi' un post virale non schiaccia tutto)
//   e, se l'autore ha piu' di 20 pronostici chiusi, una spinta proporzionale alla percentuale di vinti.
// Paginazione a cursore (mai offset): il cursore e' "score:id" dell'ultimo post della pagina.
(function (root) {
  "use strict";
  var HALF_LIFE_H = { pronostico: 6, analisi: 24, statistica: 24, notizia: 12 };
  var WEIGHTS = { follow: 1.0, save: 0.8, comment: 0.5, like: 0.3, view: 0.1, skip: -0.15 };
  var TOPIC_SHARE = 0.4, MIN_AFF = 0.1, MIN_RESOLVED = 20;

  function emptyState() { return { a: {}, t: {} }; }
  // un'interazione: aggiorna l'affinita' con l'autore e con ogni argomento del post (restituisce lo stato)
  function interact(state, kind, author, topics) {
    var w = WEIGHTS[kind]; if (w == null) return state;
    state = state || emptyState(); state.a = state.a || {}; state.t = state.t || {};
    if (author != null) state.a[author] = round4((state.a[author] || 0) + w);
    (topics || []).forEach(function (t) { state.t[t] = round4((state.t[t] || 0) + w); });
    return state;
  }
  function round4(x) { return Math.round(x * 10000) / 10000; }
  function affinity(post, state) {
    state = state || emptyState();
    var a = (state.a || {})[post.author] || 0, t = 0;
    (post.topics || []).forEach(function (k) { t += (state.t || {})[k] || 0; });
    return Math.max(MIN_AFF, 1 + a + TOPIC_SHARE * t);
  }
  function recency(type, ageH) {
    var h = HALF_LIFE_H[type] || HALF_LIFE_H.pronostico;
    return Math.pow(0.5, Math.max(0, ageH) / h);
  }
  function engagement(post) {
    var e = 1 + 0.25 * Math.log(1 + (post.likes_1h || 0) + 2 * (post.comments_1h || 0) + 1.5 * (post.saves_1h || 0));
    var n = post.author_n || 0;
    if (n > MIN_RESOLVED) e *= 0.5 + (post.author_w || 0) / n;   // 50% vinti = nessuna spinta, 70% = x1,2
    return e;
  }
  function score(post, state, now) {
    return affinity(post, state) * recency(post.type, (now - post.ts) / 3600) * engagement(post);
  }
  // posts: [{id, author, type, ts, topics, likes_1h, comments_1h, saves_1h, author_n, author_w}]
  function rank(posts, state, now) {
    return posts.map(function (p) { return { p: p, s: score(p, state, now) }; })
      .sort(function (x, y) { return y.s - x.s || (String(x.p.id) < String(y.p.id) ? -1 : String(x.p.id) > String(y.p.id) ? 1 : 0); })
      .map(function (x) { x.p._score = x.s; return x.p; });
  }
  function cursorOf(p) { return p._score.toFixed(9) + ":" + p.id; }
  // una pagina dopo il cursore: { items, next } (next = null se finito)
  function page(posts, state, now, cursor, limit) {
    var all = rank(posts, state, now), start = 0;
    limit = limit || 20;
    if (cursor) {
      var i = cursor.indexOf(":"), cs = Number(cursor.slice(0, i)), cid = cursor.slice(i + 1);
      start = all.length;
      for (var k = 0; k < all.length; k++) {
        var s = Number(all[k]._score.toFixed(9));
        if (s < cs || (s === cs && String(all[k].id) > cid)) { start = k; break; }
      }
    }
    var items = all.slice(start, start + limit);
    return { items: items, next: start + limit < all.length && items.length ? cursorOf(items[items.length - 1]) : null };
  }
  var API = { HALF_LIFE_H: HALF_LIFE_H, WEIGHTS: WEIGHTS, TOPIC_SHARE: TOPIC_SHARE, emptyState: emptyState, interact: interact,
              affinity: affinity, recency: recency, engagement: engagement, score: score, rank: rank, page: page };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.FEEDRANK = API;
})(typeof window !== "undefined" ? window : this);
