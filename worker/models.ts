// Regole dei dati (birre, info locale) — stesse regole del vecchio backend.
import { HttpError } from "./http";

export const TAP_COUNT = 12; // spine 1..11 + 12 = "Botte a caduta"
export const GRAVITY_TAP = 12;
export const LANGS = ["en", "de", "fr", "es"] as const;
export const TR_FIELDS = LANGS.flatMap((l) => [`descrizione_${l}`, `abbinamento_${l}`]);

export type Row = Record<string, unknown>;

type Issue = { loc: (string | number)[]; msg: string; type: string };

class Checker {
  issues: Issue[] = [];
  constructor(public src: Row) {}

  fail(field: string, msg: string, type = "value_error") {
    this.issues.push({ loc: ["body", field], msg, type });
  }

  has(f: string) {
    return this.src[f] !== undefined && this.src[f] !== null;
  }

  str(f: string, { min = 0, max }: { min?: number; max: number }, def?: string): string | undefined {
    const v = this.src[f];
    if (v === undefined || v === null) {
      if (def === undefined && min > 0) this.fail(f, "Campo obbligatorio", "missing");
      return def;
    }
    if (typeof v !== "string") {
      this.fail(f, "Deve essere un testo", "string_type");
      return def;
    }
    if (v.length < min) this.fail(f, `Almeno ${min} caratteri`, "string_too_short");
    if (v.length > max) this.fail(f, `Al massimo ${max} caratteri`, "string_too_long");
    return v;
  }

  num(f: string, ge: number, le: number, required: boolean): number | undefined {
    const raw = this.src[f];
    if (raw === undefined || raw === null) {
      if (required) this.fail(f, "Campo obbligatorio", "missing");
      return undefined;
    }
    const v = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      this.fail(f, "Deve essere un numero", "float_type");
      return undefined;
    }
    if (v < ge || v > le) this.fail(f, `Deve essere tra ${ge} e ${le}`, "range");
    return v;
  }

  int(f: string, ge?: number, le?: number): number | null | undefined {
    const raw = this.src[f];
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    const v = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
    if (typeof v !== "number" || !Number.isInteger(v)) {
      this.fail(f, "Deve essere un numero intero", "int_type");
      return undefined;
    }
    if ((ge !== undefined && v < ge) || (le !== undefined && v > le)) this.fail(f, `Deve essere tra ${ge} e ${le}`, "range");
    return v;
  }

  bool(f: string): boolean | undefined {
    const v = this.src[f];
    if (v === undefined || v === null) return undefined;
    if (typeof v !== "boolean") {
      this.fail(f, "Deve essere vero/falso", "bool_type");
      return undefined;
    }
    return v;
  }

  done() {
    if (this.issues.length) throw new HttpError(422, this.issues);
  }
}

const STR_FIELDS: [string, number, number][] = [
  ["nome", 1, 120],
  ["birrificio", 0, 120],
  ["stile", 0, 80],
  ["descrizione", 0, 1000],
  ...LANGS.map((l) => [`descrizione_${l}`, 0, 1000] as [string, number, number]),
  ["abbinamento", 0, 300],
  ...LANGS.map((l) => [`abbinamento_${l}`, 0, 300] as [string, number, number]),
];
const BOOL_FIELDS: [string, boolean][] = [
  ["disponibile", true],
  ["in_evidenza", false],
  ["in_arrivo", false],
  ["senza_glutine", false],
  ["analcolica", false],
  ["cask", false],
];

function formati(c: Checker): Row[] | undefined {
  const v = c.src.formati;
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) {
    c.fail("formati", "Deve essere una lista", "list_type");
    return undefined;
  }
  if (v.length > 8) c.fail("formati", "Al massimo 8 formati", "too_long");
  return v.map((f, i) => {
    const fc = new Checker((f ?? {}) as Row);
    const nome = fc.str("nome", { min: 1, max: 40 });
    const prezzo = fc.num("prezzo", 0, 10000, true);
    const tipo = (f as Row)?.tipo ?? null;
    if (tipo !== null && tipo !== "bottiglia" && tipo !== "lattina") fc.fail("tipo", "bottiglia o lattina");
    for (const iss of fc.issues) c.issues.push({ ...iss, loc: ["body", "formati", i, ...iss.loc.slice(1)] });
    return { nome, prezzo, tipo };
  });
}

function posizione(c: Checker, required: boolean): string | undefined {
  const v = c.src.posizione;
  if (v === undefined || v === null) {
    if (required) c.fail("posizione", "Campo obbligatorio", "missing");
    return undefined;
  }
  if (v !== "spina" && v !== "frigo" && v !== "cantina") c.fail("posizione", "spina, frigo o cantina", "literal_error");
  return v as string;
}

/** Corpo di POST /beers (BeerCreate) → riga completa (senza id/date). */
export function parseBeerCreate(src: Row): Row {
  const c = new Checker(src);
  const out: Row = {};
  for (const [f, min, max] of STR_FIELDS) out[f] = c.str(f, { min, max }, min > 0 ? undefined : "");
  out.abv = c.num("abv", 0, 70, true);
  out.prezzo = c.num("prezzo", 0, 10000, true);
  out.formati = formati(c) ?? [];
  out.posizione = posizione(c, true);
  for (const [f, def] of BOOL_FIELDS) out[f] = c.bool(f) ?? def;
  out.annata = c.int("annata") ?? null;
  out.spina_n = c.int("spina_n", 0, TAP_COUNT) ?? null;
  out.quantita = c.int("quantita", 0, 9999) ?? null;
  out.archiviata = c.bool("archiviata") ?? false;
  out.archiviata_il = typeof src.archiviata_il === "string" ? src.archiviata_il : null;
  c.done();
  return out;
}

/** Corpo di PATCH /beers/{id} (BeerUpdate) → solo i campi presenti (null = invariato). */
export function parseBeerUpdate(src: Row): Row {
  const c = new Checker(src);
  const out: Row = {};
  for (const [f, min, max] of STR_FIELDS) {
    if (c.has(f)) out[f] = c.str(f, { min, max });
  }
  if (c.has("abv")) out.abv = c.num("abv", 0, 70, false);
  if (c.has("prezzo")) out.prezzo = c.num("prezzo", 0, 10000, false);
  if (c.has("formati")) out.formati = formati(c);
  if (c.has("posizione")) out.posizione = posizione(c, false);
  for (const [f] of BOOL_FIELDS) if (c.has(f)) out[f] = c.bool(f);
  if (c.has("annata")) out.annata = c.int("annata");
  if (c.has("spina_n")) out.spina_n = c.int("spina_n", 0, TAP_COUNT);
  // quantita: null = non contata (va mandato esplicitamente per azzerare il conteggio)
  if ("quantita" in src) out.quantita = src.quantita === null ? null : c.int("quantita", 0, 9999);
  c.done();
  return out;
}

/** Per i clienti: il numero di bottiglie resta privato, si dice solo se è l'ultima. */
export function publicBeer(b: Row): Row {
  const { quantita, ...rest } = b;
  return { ...rest, quantita: null, ultima_bottiglia: quantita === 1 };
}

/** 0/null = nessuna annata; altrimenti un anno plausibile. */
export function vintage(year: unknown): number | null {
  if (!year) return null;
  const y = Number(year);
  if (!(y >= 1800 && y <= 2100)) throw new HttpError(422, "Annata non valida");
  return y;
}

/** Normalizza una birra importata da un file di backup (riempie i campi mancanti). */
export function normalizeImportedBeer(b: Row): Row {
  const row = parseBeerCreate({ ...b, annata: b.annata ?? null, spina_n: b.spina_n ?? null });
  if (typeof b.id !== "string" || !b.id) throw new HttpError(400, "File di backup non valido");
  row.annata = row.annata === null ? null : vintage(row.annata);
  if (row.spina_n === 0) row.spina_n = null;
  const now = new Date().toISOString();
  return {
    id: b.id,
    ...row,
    foto_version: typeof b.foto_version === "string" ? b.foto_version : null,
    created_at: typeof b.created_at === "string" ? b.created_at : now,
    updated_at: typeof b.updated_at === "string" ? b.updated_at : now,
  };
}

// ---------------- Info locale ----------------
export const DEFAULT_SETTINGS = {
  orari: "Mar–Dom 18:00–01:00\nLunedì chiuso",
  orari_en: "Tue–Sun 6pm–1am\nClosed on Mondays",
  orari_de: "",
  orari_fr: "",
  orari_es: "",
  indirizzo: "Via Esempio 1, 20100 Milano",
  telefono: "+39 02 1234567",
  logo_version: null as string | null,
  stili_filtro: ["IPA", "Pils", "Stout", "Lambic", "Tripel", "Helles"],
  handpump_taps: [9, 10],
};
export type Settings = typeof DEFAULT_SETTINGS;

export function withDefaults(data: Row | null | undefined): Settings {
  const out = { ...DEFAULT_SETTINGS, ...(data ?? {}) } as Settings & { id?: string };
  delete out.id;
  return out;
}

/** Corpo di PUT /settings → impostazioni pulite (logo_version escluso). */
export function parseSettings(src: Row): Omit<Settings, "logo_version"> {
  const c = new Checker(src);
  const s = (f: string, max: number) => (c.str(f, { max }, (DEFAULT_SETTINGS as Row)[f] as string) ?? "").trim();
  const out = {
    orari: s("orari", 500),
    orari_en: s("orari_en", 500),
    orari_de: s("orari_de", 500),
    orari_fr: s("orari_fr", 500),
    orari_es: s("orari_es", 500),
    indirizzo: s("indirizzo", 200),
    telefono: s("telefono", 40),
    stili_filtro: [...DEFAULT_SETTINGS.stili_filtro],
    handpump_taps: [...DEFAULT_SETTINGS.handpump_taps],
  };
  if (src.stili_filtro !== undefined) {
    const v = src.stili_filtro;
    if (!Array.isArray(v) || v.length > 20 || v.some((x) => typeof x !== "string")) {
      c.fail("stili_filtro", "Lista di massimo 20 testi");
    } else {
      const seen = new Set<string>();
      out.stili_filtro = [];
      for (const raw of v as string[]) {
        const st = raw.trim().slice(0, 40);
        if (st && !seen.has(st.toLowerCase())) {
          seen.add(st.toLowerCase());
          out.stili_filtro.push(st);
        }
      }
    }
  }
  if (src.handpump_taps !== undefined) {
    const v = src.handpump_taps;
    if (!Array.isArray(v) || v.length > 12 || v.some((x) => !Number.isInteger(x))) {
      c.fail("handpump_taps", "Lista di numeri di spina");
    } else {
      out.handpump_taps = [...new Set(v as number[])].filter((n) => n >= 1 && n < GRAVITY_TAP).sort((a, b) => a - b);
    }
  }
  c.done();
  return out;
}
