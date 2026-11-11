// Traduzioni del menù (cucina, vini, distillati, caffetteria) in EN/DE/FR/ES.
//
// Ogni voce/sezione tiene accanto ai testi italiani:
//   tr:  { en: { descrizione: "…" }, de: {…}, … }      le traduzioni
//   trh: { en: { descrizione: "a1b2c3d4" }, … }        "impronta" del testo italiano da cui vengono
// Se il testo italiano cambia, l'impronta non coincide più e quella traduzione viene rifatta.
// Le traduzioni corrette a mano dal gestore hanno l'impronta giusta, quindi restano.
// Le note finali del menù stanno in note_tr: { <impronta>: { en: "…", … } }.
import { translateMenuItems } from "./ai";
import type { Db } from "./db";
import type { Env } from "./env";
import { LANGS, type Row } from "./models";

type Lang = (typeof LANGS)[number];
const KEYS = ["cibo", "vini", "distillati", "bar"] as const;
const VOCE_FIELDS = ["nome", "descrizione", "abbinamento", "nota", "allergeni"];
const SEZ_FIELDS = ["titolo", "testo", "nota"];

/** Impronta corta di un testo (FNV-1a 32 bit): la stessa funzione è in src/lib/menu.ts. */
export function trHash(s: string): string {
  let h = 0x811c9dc5;
  const t = s.trim();
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

type Unit = { id: string; obj: Row; src: Record<string, string> };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const rec = (v: unknown): Row => (v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {});

function units(doc: Row): Unit[] {
  const out: Unit[] = [];
  const settori = rec(doc.settori);
  for (const k of KEYS)
    for (const s of (Array.isArray(settori[k]) ? settori[k] : []) as Row[]) {
      const fields = s.lavagna ? ["nota"] : SEZ_FIELDS; // il titolo della lavagna è fisso nel sito
      const src: Record<string, string> = {};
      for (const f of fields) if (str(s[f])) src[f] = str(s[f]);
      out.push({ id: `s:${s.id}`, obj: s, src });
      for (const v of (Array.isArray(s.voci) ? s.voci : []) as Row[]) {
        const vs: Record<string, string> = {};
        for (const f of VOCE_FIELDS) if (str(v[f])) vs[f] = str(v[f]);
        out.push({ id: `v:${v.id}`, obj: v, src: vs });
      }
    }
  return out;
}

/** Traduzione valida (con impronta giusta) di un campo, se c'è. */
function valid(obj: Row | undefined, l: Lang, f: string, it: string): string | null {
  if (!obj) return null;
  const t = str(rec(rec(obj.tr)[l])[f]);
  return t && rec(rec(obj.trh)[l])[f] === trHash(it) ? t : null;
}

function setTr(obj: Row, l: Lang, f: string, text: string, it: string) {
  const tr = rec(obj.tr);
  const trh = rec(obj.trh);
  tr[l] = { ...rec(tr[l]), [f]: text };
  trh[l] = { ...rec(trh[l]), [f]: trHash(it) };
  obj.tr = tr;
  obj.trh = trh;
}

/**
 * Prima di salvare: per ogni testo tiene la traduzione valida che arriva dal browser
 * (anche corretta a mano), altrimenti quella già salvata, e butta quelle superate.
 */
export function mergeMenuTranslations(prev: Row | null, next: Row): void {
  const old = new Map(prev ? units(prev).map((u) => [u.id, u.obj]) : []);
  for (const u of units(next)) {
    const incoming = { tr: u.obj.tr, trh: u.obj.trh };
    delete u.obj.tr;
    delete u.obj.trh;
    for (const l of LANGS)
      for (const [f, it] of Object.entries(u.src)) {
        const t = valid(incoming, l, f, it) ?? valid(old.get(u.id), l, f, it);
        if (t) setTr(u.obj, l, f, t, it);
      }
  }
  // note finali
  const notes = (Array.isArray(next.note_finali) ? next.note_finali : []).map(str).filter(Boolean);
  const pool = { ...rec(prev?.note_tr), ...rec(next.note_tr) };
  const nt: Row = {};
  for (const n of notes) {
    const h = trHash(n);
    const e = rec(pool[h]);
    const keep: Row = {};
    for (const l of LANGS) if (str(e[l])) keep[l] = str(e[l]);
    if (Object.keys(keep).length) nt[h] = keep;
  }
  if (Object.keys(nt).length) next.note_tr = nt;
  else delete next.note_tr;
}

/** Testi ancora da tradurre: { id, src: solo i campi con almeno una lingua mancante }. */
function todo(doc: Row): { id: string; src: Record<string, string> }[] {
  const out: { id: string; src: Record<string, string> }[] = [];
  for (const u of units(doc)) {
    const src: Record<string, string> = {};
    for (const [f, it] of Object.entries(u.src)) if (LANGS.some((l) => !valid(u.obj, l, f, it))) src[f] = it;
    if (Object.keys(src).length) out.push({ id: u.id, src });
  }
  const nt = rec(doc.note_tr);
  for (const n of (Array.isArray(doc.note_finali) ? doc.note_finali : []).map(str).filter(Boolean)) {
    const h = trHash(n);
    if (LANGS.some((l) => !str(rec(nt[h])[l]))) out.push({ id: `n:${h}`, src: { nota_finale: n } });
  }
  return out;
}

export function menuTodoCount(doc: Row | null): number {
  return doc ? todo(doc).length : 0;
}

/**
 * Un giro di traduzioni: chiede a Gemini al massimo `maxBatches` gruppi di testi, poi rilegge il menù
 * (nel frattempo il gestore potrebbe averlo cambiato) e salva solo le traduzioni ancora attuali.
 */
export async function translateMenu(
  env: Env,
  db: Db,
  load: (db: Db) => Promise<Row | null>,
  maxBatches: number,
): Promise<{ translated: number; remaining: number; error?: string }> {
  const doc = await load(db);
  if (!doc) return { translated: 0, remaining: 0 };
  const items = todo(doc);
  if (!items.length) return { translated: 0, remaining: 0 };
  if (!env.GEMINI_API_KEY) return { translated: 0, remaining: items.length, error: "Traduzioni automatiche non configurate (manca la chiave Gemini)" };
  const { done, error } = await translateMenuItems(env, items, maxBatches);
  const sent = new Map(items.map((i) => [i.id, i.src]));

  let translated = 0;
  if (Object.keys(done).length) {
    const fresh = await load(db);
    if (!fresh) return { translated: 0, remaining: 0, error };
    for (const u of units(fresh)) {
      const got = done[u.id];
      const asked = sent.get(u.id);
      if (!got || !asked) continue;
      let any = false;
      for (const [f, it] of Object.entries(asked)) {
        if (u.src[f] !== it) continue; // testo cambiato nel frattempo: lo traduce il prossimo giro
        for (const l of LANGS) {
          const t = got[l]?.[f];
          if (t && !valid(u.obj, l, f, it)) {
            setTr(u.obj, l, f, t, it);
            any = true;
          }
        }
      }
      if (any) translated++;
    }
    const nt = rec(fresh.note_tr);
    const current = new Set((Array.isArray(fresh.note_finali) ? fresh.note_finali : []).map((n) => trHash(str(n))));
    for (const [id, got] of Object.entries(done)) {
      if (!id.startsWith("n:") || !current.has(id.slice(2))) continue;
      const e: Row = { ...rec(nt[id.slice(2)]) };
      for (const l of LANGS) if (!str(e[l]) && got[l]?.nota_finale) e[l] = got[l].nota_finale;
      nt[id.slice(2)] = e;
      translated++;
    }
    if (Object.keys(nt).length) fresh.note_tr = nt;
    if (translated) await db.insert("settings", { id: "menu", data: fresh }, { onConflict: "id" });
    return { translated, remaining: todo(fresh).length, error };
  }
  return { translated: 0, remaining: items.length, error };
}
