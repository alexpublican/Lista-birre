// Menù cucina, vini, distillati e caffetteria: tipi, lettura dal server e piccole utilità.
// I dati stanno in un unico documento JSON (worker/api.ts → GET/PUT /api/menu).
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export type SettoreKey = "cibo" | "vini" | "distillati" | "bar";
export const SETTORI: SettoreKey[] = ["cibo", "vini", "distillati", "bar"];
export const SETTORI_BERE: SettoreKey[] = ["vini", "distillati", "bar"];

export interface Voce {
  id: string;
  nome: string;
  descrizione?: string;
  cantina?: string;
  prezzo?: number;
  calice?: number;
  bottiglia?: number;
  abbinamento?: string;
  nota?: string;
  /** Note libere sugli allergeni (es. "può contenere tracce di frutta a guscio"). */
  allergeni?: string;
  /** Allergeni presenti, tra i 14 di legge (chiavi di ALLERGENI). */
  allergeni_lista?: AllergeneKey[];
  /** Confermato: non contiene nessuno dei 14 allergeni. */
  senza_allergeni?: boolean;
  disponibile?: boolean;
  evidenza?: boolean;
  novita?: boolean;
  vegano?: boolean;
  piccante?: boolean;
  /** Versione del logo/foto caricato (file "menu/<id>" nello storage); assente = nessuna immagine. */
  foto?: string;
  /** Link di un'immagine da scaricare: ci pensa il server (subito dopo il salvataggio e ogni ora). */
  foto_src?: string;
  foto_err?: number;
}

// I 14 allergeni del Reg. UE 1169/2011 (Allegato II), nell'ordine e con la numerazione ufficiale.
export const ALLERGENI = [
  { k: "glutine", n: 1, it: "Cereali contenenti glutine", en: "Gluten" },
  { k: "crostacei", n: 2, it: "Crostacei", en: "Crustaceans" },
  { k: "uova", n: 3, it: "Uova", en: "Eggs" },
  { k: "pesce", n: 4, it: "Pesce", en: "Fish" },
  { k: "arachidi", n: 5, it: "Arachidi", en: "Peanuts" },
  { k: "soia", n: 6, it: "Soia", en: "Soy" },
  { k: "latte", n: 7, it: "Latte e lattosio", en: "Milk" },
  { k: "frutta_guscio", n: 8, it: "Frutta a guscio", en: "Tree nuts" },
  { k: "sedano", n: 9, it: "Sedano", en: "Celery" },
  { k: "senape", n: 10, it: "Senape", en: "Mustard" },
  { k: "sesamo", n: 11, it: "Semi di sesamo", en: "Sesame" },
  { k: "solfiti", n: 12, it: "Anidride solforosa e solfiti", en: "Sulphites" },
  { k: "lupini", n: 13, it: "Lupini", en: "Lupin" },
  { k: "molluschi", n: 14, it: "Molluschi", en: "Molluscs" },
] as const;
export type AllergeneKey = (typeof ALLERGENI)[number]["k"];

/** Allergeni della voce, sempre in ordine ufficiale (ignora chiavi sconosciute). */
export const allergeniOf = (v: Voce) => ALLERGENI.filter((a) => v.allergeni_lista?.includes(a.k));

export interface Sezione {
  id: string;
  titolo: string;
  voci?: Voce[];
  testo?: string;
  nota?: string;
  lavagna?: boolean;
  aggiornata?: string;
}

/** Voce tolta dal menu e messa nello storico: si ricorda da quale sezione veniva. */
export interface VoceArchiviata extends Voce {
  /** id della sezione di provenienza (per rimetterla al suo posto). */
  sez: string;
  /** Titolo della sezione al momento dell'archiviazione (se la sezione non c'è più). */
  sez_titolo: string;
  /** Data in cui è stata tolta dal menu (AAAA-MM-GG). */
  archiviata_il: string;
}

export interface MenuData {
  versione?: number;
  settori: Record<SettoreKey, Sezione[]>;
  note_finali?: string[];
  /** Storico per reparto: voci tolte dal menu, pronte da rimettere. Lo vede solo il gestore. */
  archivio?: Record<SettoreKey, VoceArchiviata[]>;
}

export const SET: Record<SettoreKey, { label: string; short?: string; sub: string; word: [string, string] }> = {
  cibo: { label: "Cosa mangiare", short: "Cibo", sub: "Stuzzichini, piatti, panini e dolci fatti in casa", word: ["piatto", "piatti"] },
  vini: { label: "Vini", sub: "Bianchi, rossi e bollicine al calice o in bottiglia", word: ["vino", "vini"] },
  distillati: { label: "Distillati", sub: "Amari, grappe, rum, cognac e whisky", word: ["proposta", "proposte"] },
  bar: { label: "Caffetteria e bibite", short: "Caffè e bibite", sub: "Caffè, tè e tisane, aperitivi, bibite e succhi", word: ["proposta", "proposte"] },
};

export const MENU_KEY = ["menu"] as const;

export const isSettore = (v: string | undefined): v is SettoreKey => SETTORI.includes(v as SettoreKey);

/** Rende il documento sempre completo (anche se arriva vuoto o da una versione vecchia). */
export function normalizeMenu(d: MenuData | null | undefined): MenuData {
  const settori = { cibo: [], vini: [], distillati: [], bar: [] } as Record<SettoreKey, Sezione[]>;
  for (const k of SETTORI) if (d && d.settori && Array.isArray(d.settori[k])) settori[k] = d.settori[k];
  if (!settori.cibo.some((s) => s.lavagna)) settori.cibo = [{ id: "s-lavagna", titolo: "Speciali del giorno", lavagna: true, voci: [] }, ...settori.cibo];
  const archivio = { cibo: [], vini: [], distillati: [], bar: [] } as Record<SettoreKey, VoceArchiviata[]>;
  for (const k of SETTORI) if (d?.archivio && Array.isArray(d.archivio[k])) archivio[k] = d.archivio[k];
  return { versione: 1, settori, note_finali: d?.note_finali ?? [], archivio };
}

export function useMenu() {
  return useQuery({
    queryKey: MENU_KEY,
    queryFn: async () => normalizeMenu(await apiGet<MenuData | null>("/menu")),
    staleTime: 30_000,
  });
}

export const eur = (n: number | null | undefined) =>
  n == null || Number.isNaN(n) ? "" : "€ " + Number(n).toFixed(2).replace(".", ",");

export const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const slug = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(iso?: string): string {
  if (!iso) return "";
  const s = new Date(iso + "T12:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return (iso === today() ? "Oggi, " : "Aggiornata ") + s;
}

export const lavagnaOf = (m: MenuData) => m.settori.cibo.find((s) => s.lavagna);
export const lavagnaLive = (m: MenuData) => (lavagnaOf(m)?.voci ?? []).filter((v) => v.disponibile !== false);

export function allItems(m: MenuData) {
  const out: { k: SettoreKey; s: Sezione; v: Voce }[] = [];
  for (const k of SETTORI) for (const s of m.settori[k]) for (const v of s.voci ?? []) out.push({ k, s, v });
  return out;
}

export function findItem(m: MenuData, id: string) {
  return allItems(m).find((x) => x.v.id === id);
}

export function uniqueId(m: MenuData, name: string): string {
  const used = new Set<string>([
    ...allItems(m).map((x) => x.v.id),
    ...SETTORI.flatMap((k) => m.settori[k].map((s) => s.id)),
    ...SETTORI.flatMap((k) => (m.archivio?.[k] ?? []).map((v) => v.id)),
  ]);
  const base = slug(name) || "voce";
  let id = base;
  let i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  return id;
}

export const fotoUrl = (v: Voce) => (v.foto ? `/api/menu/photo/${encodeURIComponent(v.id)}?v=${encodeURIComponent(v.foto)}` : null);

export const hasSizes = (v: Voce) => v.calice != null || v.bottiglia != null;

/** Toglie la voce dal menu e la mette in cima allo storico del reparto (modifica `m`). */
export function archivia(m: MenuData, k: SettoreKey, si: number, vi: number) {
  const s = m.settori[k][si];
  const [v] = s.voci!.splice(vi, 1);
  if (!v) return;
  const arch: VoceArchiviata = { ...v, sez: s.id, sez_titolo: s.lavagna ? "Speciali del giorno" : s.titolo, archiviata_il: today() };
  m.archivio = m.archivio ?? { cibo: [], vini: [], distillati: [], bar: [] };
  m.archivio[k] = [arch, ...(m.archivio[k] ?? []).filter((x) => x.id !== v.id)];
}

/**
 * Rimette nel menu una voce dello storico, nella sua sezione di sempre (in fondo).
 * Se nel frattempo la sezione è stata eliminata, la ricrea con lo stesso titolo.
 * Restituisce il titolo della sezione in cui è tornata.
 */
export function ripristina(m: MenuData, k: SettoreKey, id: string): string | null {
  const list = m.archivio?.[k] ?? [];
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const [a] = list.splice(i, 1);
  const { sez, sez_titolo, archiviata_il: _d, ...v } = a;
  let s = m.settori[k].find((x) => x.id === sez && x.voci);
  if (!s) {
    s = { id: sez && !m.settori[k].some((x) => x.id === sez) ? sez : uniqueId(m, "s-" + sez_titolo), titolo: sez_titolo || "Altro", voci: [] };
    m.settori[k].push(s);
  }
  s.voci!.push({ ...v, disponibile: true });
  return s.lavagna ? "Lavagna" : s.titolo;
}
