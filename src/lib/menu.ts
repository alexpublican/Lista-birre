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
  allergeni?: string;
  disponibile?: boolean;
  evidenza?: boolean;
  novita?: boolean;
  vegano?: boolean;
  piccante?: boolean;
}

export interface Sezione {
  id: string;
  titolo: string;
  voci?: Voce[];
  testo?: string;
  nota?: string;
  lavagna?: boolean;
  aggiornata?: string;
}

export interface MenuData {
  versione?: number;
  settori: Record<SettoreKey, Sezione[]>;
  note_finali?: string[];
}

export const SET: Record<SettoreKey, { label: string; short?: string; sub: string; word: [string, string] }> = {
  cibo: { label: "Cosa mangiare", short: "Cibo", sub: "Stuzzichini, piatti, panini e dolci fatti in casa", word: ["piatto", "piatti"] },
  vini: { label: "Vini", sub: "Bianchi, rossi e bollicine al calice o in bottiglia", word: ["vino", "vini"] },
  distillati: { label: "Distillati", sub: "Amari, grappe, rum, cognac e whisky", word: ["proposta", "proposte"] },
  bar: { label: "Caffetteria e bibite", short: "Caffè e bibite", sub: "Caffè, tè e tisane, bibite e succhi", word: ["proposta", "proposte"] },
};

export const MENU_KEY = ["menu"] as const;

export const isSettore = (v: string | undefined): v is SettoreKey => SETTORI.includes(v as SettoreKey);

/** Rende il documento sempre completo (anche se arriva vuoto o da una versione vecchia). */
export function normalizeMenu(d: MenuData | null | undefined): MenuData {
  const settori = { cibo: [], vini: [], distillati: [], bar: [] } as Record<SettoreKey, Sezione[]>;
  for (const k of SETTORI) if (d && d.settori && Array.isArray(d.settori[k])) settori[k] = d.settori[k];
  if (!settori.cibo.some((s) => s.lavagna)) settori.cibo = [{ id: "s-lavagna", titolo: "Speciali del giorno", lavagna: true, voci: [] }, ...settori.cibo];
  return { versione: 1, settori, note_finali: d?.note_finali ?? [] };
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
  const used = new Set<string>([...allItems(m).map((x) => x.v.id), ...SETTORI.flatMap((k) => m.settori[k].map((s) => s.id))]);
  const base = slug(name) || "voce";
  let id = base;
  let i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  return id;
}

export const hasSizes = (v: Voce) => v.calice != null || v.bottiglia != null;
