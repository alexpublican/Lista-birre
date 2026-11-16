// Copia offline del menù: il sito si apre e si consulta anche senza internet.
//
// - Pagine e codice del sito: salvati sul dispositivo alla prima visita (l'elenco dei file
//   lo scrive vite.config.ts a ogni pubblicazione, nelle righe VERSION e PRECACHE qui sotto).
// - Birre, menù, info e galleria: presi da internet quando c'è; se la rete manca o è troppo
//   lenta si usa l'ultima copia salvata e la pagina mostra "Senza connessione".
// - Foto e loghi: salvati man mano che si vedono.
// Il gestionale prenotazioni (/prenotazioni/) ha la sua copia offline e qui non passa.
const VERSION = "dev";
const PRECACHE = [];

const SHELL = "cassina-sito-" + VERSION;
const DATA = "cassina-dati";
const FOTO = "cassina-foto";
const FONT = "cassina-font";
const MAX_FOTO = 400;

const DATA_PATHS = ["/api/beers", "/api/menu", "/api/settings", "/api/locale"];
const FOTO_RE = /^\/api\/(logo|icon\/|beers\/[^/]+\/photo|menu\/photo\/|locale\/photo\/)/;

const PAGE_TIMEOUT = 4000; // oltre: si apre la copia salvata (e intanto si aggiorna)
const DATA_TIMEOUT = 5000;

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(SHELL);
      // la pagina è indispensabile; il resto si salva al meglio
      await c.add(new Request("/", { cache: "reload" }));
      await Promise.allSettled(
        ["/manifest.webmanifest", ...PRECACHE].map((u) => c.add(new Request(u, { cache: "reload" }))),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("cassina-sito-") && k !== SHELL).map((k) => caches.delete(k)));
      await self.clients.claim();
      // anche chi ha visto solo la prima pagina si porta a casa tutto il menù
      const d = await caches.open(DATA);
      await Promise.allSettled(
        DATA_PATHS.map(async (p) => {
          const res = await fetch(p);
          if (res.ok) await d.put(p, res);
        }),
      );
    })(),
  );
});

self.addEventListener("message", (e) => {
  // entrata/uscita dalla gestione: via i dati salvati (come fa la pagina con i suoi)
  if (e.data && e.data.type === "clear-data") e.waitUntil(caches.delete(DATA));
});

/** Risposta dalla rete entro `ms`; se non arriva in tempo o fallisce: null (la rete continua in sottofondo). */
function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (r) => { clearTimeout(timer); resolve(r); },
      () => { clearTimeout(timer); resolve(null); },
    );
  });
}

async function tell(msg) {
  const list = await self.clients.matchAll({ type: "window" });
  for (const c of list) c.postMessage(msg);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Caratteri di Google (lavagna)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, FONT));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/prenotazioni")) return;

  // Pagine del sito (è sempre la stessa pagina: il resto lo fa React)
  if (req.mode === "navigate") {
    if (url.pathname.startsWith("/api/")) return;
    e.respondWith(page(e));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (DATA_PATHS.includes(url.pathname)) e.respondWith(data(e, url.pathname));
    else if (FOTO_RE.test(url.pathname)) e.respondWith(foto(req));
    // tutto il resto (gestione, voti, avvisi…) solo da internet
    return;
  }

  // Codice del sito: i file in /assets/ hanno un nome che cambia a ogni versione
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(cacheFirst(req, SHELL));
    return;
  }

  // Altri file (icone, manifest…): copia salvata subito, aggiornata in sottofondo
  e.respondWith(staleWhileRevalidate(e, SHELL));
});

async function page(e) {
  const c = await caches.open(SHELL);
  const net = fetch(e.request).then((res) => {
    if (res.ok && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) {
      const copy = res.clone();
      e.waitUntil(c.put("/", copy));
    }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  const res = await withTimeout(net, PAGE_TIMEOUT);
  if (res) return res;
  const saved = await c.match("/");
  if (saved) return saved;
  return net; // niente copia: si aspetta la rete (o l'errore del browser)
}

async function data(e, path) {
  const c = await caches.open(DATA);
  const net = fetch(e.request).then((res) => {
    if (res.ok) e.waitUntil(c.put(path, res.clone()));
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  const res = await withTimeout(net, DATA_TIMEOUT);
  if (res && res.ok) {
    e.waitUntil(tell({ type: "online" }));
    return res;
  }
  const saved = await c.match(path);
  if (saved) {
    e.waitUntil(tell({ type: "offline-copy", at: saved.headers.get("date") }));
    return saved;
  }
  if (res) return res;
  return net;
}

async function foto(req) {
  const c = await caches.open(FOTO);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await c.put(req, res.clone());
    trim(c);
  }
  return res;
}

/** Tiene al massimo MAX_FOTO immagini (toglie le più vecchie). */
async function trim(c) {
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_FOTO; i++) await c.delete(keys[i]);
}

async function cacheFirst(req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") await c.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(e, name) {
  const c = await caches.open(name);
  const hit = await c.match(e.request);
  const net = fetch(e.request).then(async (res) => {
    if (res.ok && !res.redirected) await c.put(e.request, res.clone());
    return res;
  });
  if (hit) {
    e.waitUntil(net.catch(() => {}));
    return hit;
  }
  return net;
}
