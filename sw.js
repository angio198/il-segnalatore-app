// Service worker di StatSight: prima la rete (dati sempre freschi
// quando c'e' connessione), poi la copia salvata (l'app si apre anche offline
// con gli ultimi dati visti). Tutto quello che mette in cache e' gia'
// pubblico sul sito: codice e dati restano cifrati anche qui (dal 10/10 il
// sito ha solo la porta con la password e il codice cifrato app.enc.json).
const CACHE = "statsight-v26";
const CDN = "https://live.seaodds.live";        // 16/10: dati e partite in corso dalla cache di Cloudflare
const SHELL = ["./", "./index.html", "./app.enc.json", "./moderazione.json", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || (url.origin !== self.location.origin && url.origin !== CDN)) return;
  // I dati (sito o Cloudflare) arrivano con un parametro (versione, quarto di minuto): in cache si salvano sotto
  // un'unica chiave, senza il parametro, cosi' senza rete l'app si apre con gli ultimi dati visti.
  const key = url.origin === CDN || url.pathname.endsWith("data.enc.json") ? new Request(url.origin + url.pathname) : event.request;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(key, copy));
        }
        return response;
      })
      .catch(() => caches.match(key))
  );
});

// 17/10 (passo 4): i segnali delle strategie accese arrivano anche con l'app chiusa. Il server
// (server/motore_strategie.js) manda una notifica web cifrata: qui si mostra. Il testo e' quello del server
// (nome della strategia, partita, minuto, giocata e quota); toccandola si apre l'app.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  const title = String(d.t || "SeaOdds").slice(0, 120), body = String(d.b || "").slice(0, 300);
  event.waitUntil(self.registration.showNotification(title, { body, tag: String(d.tag || "seaodds").slice(0, 60), icon: "icon-192.png", badge: "badge-96.png", data: { u: "./#strategie" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
