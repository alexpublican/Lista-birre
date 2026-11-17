// Copia offline del gestionale prenotazioni: la pagina si apre anche senza internet.
// La pagina viene presa dalla rete quando c'è (così gli aggiornamenti arrivano subito),
// altrimenti dall'ultima copia salvata. I dati delle prenotazioni li salva la pagina stessa.
const CACHE = "prenotazioni-v10";
const PAGINE = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PAGINE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // le chiamate al database non passano di qui
  if (url.hostname.endsWith("supabase.co")) return;
  const isPage = req.mode === "navigate" || (url.origin === location.origin && url.pathname.startsWith("/prenotazioni/"));
  if (isPage) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }
  // caratteri e icone: prima la copia salvata
  if (url.hostname.includes("fonts.g") || url.pathname.match(/\.(png|svg|ico)$/)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
      }))
    );
  }
});
