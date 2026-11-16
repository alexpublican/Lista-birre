import { QueryClient } from "@tanstack/react-query";

// Exported so lib/session can wipe it at session boundaries — cached data outlives logout.
export const queryClient = new QueryClient();

// ------------------------------------------------------------------ memoria sul telefono
// Birre, menù, info locale e galleria vengono ricordati sul dispositivo: chi riapre il menù
// (o lo apre di nuovo dal QR) lo vede subito, mentre in sottofondo arrivano i dati aggiornati.
const STORE = "cassina-cache-v1";
const KEYS = ["beers", "menu", "settings", "locale"];
const MAX_AGE = 3 * 24 * 60 * 60 * 1000; // dati più vecchi di 3 giorni: meglio aspettare quelli nuovi

type Saved = Record<string, { at: number; data: unknown }>;

function read(): Saved {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

// All'apertura: rimette in memoria i dati salvati (vengono comunque riscaricati subito).
const now = Date.now();
for (const [key, e] of Object.entries(read()))
  if (KEYS.includes(key) && e && now - e.at < MAX_AGE && e.data != null)
    queryClient.setQueryData([key], e.data, { updatedAt: e.at });

// A ogni dato nuovo: salvataggio (raggruppato, per non scrivere di continuo).
let timer: ReturnType<typeof setTimeout> | undefined;
queryClient.getQueryCache().subscribe((ev) => {
  if (ev.type !== "updated" || ev.action.type !== "success") return;
  const key = ev.query.queryKey;
  if (key.length !== 1 || !KEYS.includes(String(key[0]))) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const out: Saved = {};
    for (const k of KEYS) {
      const st = queryClient.getQueryState([k]);
      if (st?.status === "success" && st.data != null) out[k] = { at: st.dataUpdatedAt, data: st.data };
    }
    try {
      localStorage.setItem(STORE, JSON.stringify(out));
    } catch {
      // spazio pieno o navigazione privata: pazienza, si scarica ogni volta
    }
  }, 1000);
});

/** Cancella i dati ricordati (all'entrata/uscita dalla gestione). */
export function clearSaved(): void {
  clearTimeout(timer);
  try {
    localStorage.removeItem(STORE);
  } catch {
    // niente da fare
  }
  // anche la copia offline (public/sw.js)
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "clear-data" });
  } catch {
    // niente copia offline: niente da cancellare
  }
}
