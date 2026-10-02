// Service worker di StatSight: prima la rete (dati sempre freschi
// quando c'e' connessione), poi la copia salvata (l'app si apre anche offline
// con gli ultimi dati visti). Tutto quello che mette in cache e' gia'
// pubblico sul sito: i dati restano cifrati anche qui.
const CACHE = "statsight-v7";
const SHELL = ["./", "./index.html", "./regole.js", "./i18n.js", "./i18n_en.js", "./moderazione.json", "./moderazione.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

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
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // I dati arrivano con ?t=<ora> per saltare la cache del CDN: in cache si
  // salvano sotto un'unica chiave, senza il parametro.
  const key = url.pathname.endsWith("data.enc.json") ? new Request(url.origin + url.pathname) : event.request;
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
