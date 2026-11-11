// Google Gemini (chiave del proprietario): traduzioni dall'italiano e testi suggeriti.
import type { Env } from "./env";
import { LANGS, TR_BASES, TR_MAX, type Row, type TrBase } from "./models";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const TIMEOUT_MS = 25_000;
const BATCH_SIZE = 8; // il piano gratuito di Gemini consente ~5 richieste al minuto

const TRANSLATE_SYSTEM =
  "You translate texts for the beer menu of Birreria Cassina, a historic Italian pub. " +
  "Translate the Italian fields of a beer (descrizione = description, abbinamento = food pairing, " +
  "stile = beer style) into English, German, French and Spanish (Spain). " +
  "Keep a natural, appetising menu tone, keep brewery names and units as they are, and do not add information. " +
  "For stile: keep internationally used style names unchanged (IPA, Session IPA, Gueuze, Lambic, Kriek, Saison, " +
  "Stout, Porter, Pils, Weizen, Doppelbock, Rauchbier, Barley Wine, Sour…) and translate only the Italian words " +
  "around them, in the word order natural for each language " +
  '(e.g. "Gueuze al rabarbaro" → en "Rhubarb Gueuze", de "Rhabarber-Gueuze", fr "Gueuze à la rhubarbe", ' +
  'es "Gueuze con ruibarbo"; "Lambic invecchiato in botte" → en "Barrel-aged Lambic"). ' +
  "If stile has no Italian words, return it unchanged. Reply with JSON only, no markdown, exactly in this shape: " +
  '{"en":{"descrizione":"...","abbinamento":"...","stile":"..."},"de":{...},"fr":{...},"es":{...}}. ' +
  'Translate only the fields you receive; if an Italian field is empty, return "" for it in every language.';

const BATCH_SYSTEM = TRANSLATE_SYSTEM.replace(
  "Reply with JSON only, no markdown, exactly in this shape: ",
  "You receive a JSON object of beers keyed by id. Reply with JSON only, no markdown: an object with the same ids, " +
    "each value exactly in this shape: ",
);

const DESCRIBE_SYSTEM =
  "Sei il sommelier della Birreria Cassina, birreria storica italiana. Scrivi in italiano la descrizione " +
  "di una birra per il menu: 2 frasi, massimo 260 caratteri, tono caldo e invitante, concreta su aspetto, " +
  "aroma e gusto. Usa solo le informazioni date (stile e parole chiave) e le caratteristiche tipiche dello stile; " +
  "non inventare premi, storia o dati del birrificio, non ripetere il nome della birra all'inizio. " +
  "Rispondi solo con il testo della descrizione, senza virgolette.";

const PAIRING_SYSTEM =
  "Sei il sommelier della Birreria Cassina, birreria storica italiana. Suggerisci in italiano un abbinamento " +
  "gastronomico per una birra del menu: 2-4 piatti o ingredienti concreti separati da virgole, massimo 120 caratteri, " +
  "adatti allo stile e alla descrizione. Niente frasi introduttive. Rispondi solo con il testo, senza virgolette.";

export class AiUnavailable extends Error {}

async function ask(env: Env, system: string, prompt: string, opts: { json?: boolean; timeout?: number } = {}): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new AiUnavailable("GEMINI_API_KEY non configurata");
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(opts.json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
    }),
    signal: AbortSignal.timeout(opts.timeout ?? TIMEOUT_MS),
  });
  if (!res.ok) throw new AiUnavailable(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

function parseJson(raw: string): Row {
  return JSON.parse(raw.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim());
}

/** Testi italiani da tradurre: solo i campi presenti vengono tradotti (e restituiti). */
export type TrSource = Partial<Record<TrBase, string>>;

const hasText = (src: TrSource) => TR_BASES.some((b) => (src[b] ?? "").trim());

export function emptyTranslations(src: TrSource): Row {
  const out: Row = {};
  for (const l of LANGS) for (const b of TR_BASES) if (b in src) out[`${b}_${l}`] = "";
  return out;
}

function fieldsFrom(data: Row, src: TrSource): Row {
  const out: Row = {};
  for (const l of LANGS) {
    const tr = (data[l] ?? {}) as Row;
    if (!data[l]) throw new Error(`lingua ${l} mancante`);
    for (const b of TR_BASES) {
      if (!(b in src)) continue;
      out[`${b}_${l}`] = (src[b] ?? "").trim() ? String(tr[b] ?? "").trim().slice(0, TR_MAX[b]) : "";
    }
  }
  return out;
}

/** Traduzioni di una birra, oppure null se il servizio non risponde (il salvataggio prosegue). */
export async function translateFields(env: Env, src: TrSource): Promise<Row | null> {
  if (!hasText(src)) return emptyTranslations(src);
  try {
    const raw = await ask(env, TRANSLATE_SYSTEM, JSON.stringify(src), { json: true });
    return fieldsFrom(parseJson(raw), src);
  } catch (e) {
    console.warn("auto-translation failed:", String(e).slice(0, 300));
    return null;
  }
}

/** items: [{id, src}] → {id: campi tradotti}; le birre fallite mancano. */
export async function translateMany(env: Env, items: { id: string; src: TrSource }[]): Promise<Record<string, Row>> {
  const out: Record<string, Row> = {};
  const todo = items.filter((it) => hasText(it.src));
  for (const it of items) if (!hasText(it.src)) out[it.id] = emptyTranslations(it.src);
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const payload: Row = {};
    for (const b of batch) payload[b.id] = b.src;
    try {
      const data = parseJson(await ask(env, BATCH_SYSTEM, JSON.stringify(payload), { json: true, timeout: 90_000 }));
      for (const b of batch) {
        try {
          out[b.id] = fieldsFrom(data[b.id] as Row, b.src);
        } catch (e) {
          console.warn("batch translation missing", b.id, String(e));
        }
      }
    } catch (e) {
      console.warn("batch translation failed:", String(e).slice(0, 300));
    }
  }
  return out;
}

const clean = (t: string) => t.trim().replace(/^["«»“”]+|["«»“”]+$/g, "").trim();

export async function describeBeer(env: Env, nome: string, stile: string, parole: string[]): Promise<string> {
  const prompt = `Birra: ${nome || "(senza nome)"}\nStile: ${stile || "(non indicato)"}\nParole chiave: ${parole.join(", ")}`;
  let text: string;
  try {
    text = clean(await ask(env, DESCRIBE_SYSTEM, prompt));
  } catch (e) {
    throw e instanceof AiUnavailable ? e : new AiUnavailable(String(e));
  }
  if (!text) throw new AiUnavailable("risposta vuota");
  return text.slice(0, 1000);
}

export async function suggestPairing(env: Env, nome: string, stile: string, descrizione: string, parole: string[]): Promise<string> {
  const prompt =
    `Birra: ${nome || "(senza nome)"}\nStile: ${stile || "(non indicato)"}\n` +
    `Descrizione: ${descrizione || "(nessuna)"}\nParole chiave: ${parole.join(", ") || "(nessuna)"}`;
  let text: string;
  try {
    text = clean(await ask(env, PAIRING_SYSTEM, prompt)).replace(/\.+$/, "");
  } catch (e) {
    throw e instanceof AiUnavailable ? e : new AiUnavailable(String(e));
  }
  if (!text) throw new AiUnavailable("risposta vuota");
  return text.slice(0, 300);
}

// ------------------------------------------------------------------ menù cucina, vini, distillati, caffetteria
const MENU_SYSTEM =
  "You translate the menu (food, wines, spirits, coffee bar and soft drinks) of Birreria Cassina, a historic Italian pub. " +
  "You receive a JSON object of items keyed by id; each item has some Italian fields: nome = name of a dish or drink, " +
  "descrizione = description or ingredients, abbinamento = suggested beer pairing, nota = short note for guests, " +
  "allergeni = allergen notes, titolo = menu section title, testo = section text, nota_finale = general note of the menu. " +
  "Translate every field into English, German, French and Spanish (Spain). " +
  "For nome: translate generic names a foreign guest would not understand (e.g. \"Spremuta d'arancia\" → en \"Fresh orange juice\", " +
  "\"Tagliere di salumi\" → en \"Cured meats board\"); keep unchanged proper names, wine labels, brands, producers and " +
  "Italian names famous abroad (Tiramisù, Bruschetta, Espresso, Cappuccino, Prosecco, Grappa, Amaro, Spritz…). " +
  "Keep a natural, appetising menu tone, keep brand names, numbers and units as they are, and do not add information. " +
  "Allergen notes must stay precise and literal. Reply with JSON only, no markdown: an object with the same ids, " +
  'each value exactly in this shape: {"en":{"<field>":"..."},"de":{...},"fr":{...},"es":{...}} with exactly the fields received.';

const MENU_BATCH = 15;

export type MenuTr = Record<(typeof LANGS)[number], Record<string, string>>;

/**
 * items: [{id, src: {campo: testo italiano}}] → {id: {en: {...}, de, fr, es}}.
 * Si ferma al primo errore (es. troppe richieste a Gemini): quello che manca lo riprende il giro successivo.
 */
export async function translateMenuItems(
  env: Env,
  items: { id: string; src: Record<string, string> }[],
  maxBatches: number,
): Promise<{ done: Record<string, MenuTr>; error?: string }> {
  const done: Record<string, MenuTr> = {};
  for (let i = 0, n = 0; i < items.length && n < maxBatches; i += MENU_BATCH, n++) {
    const batch = items.slice(i, i + MENU_BATCH);
    const payload: Row = {};
    for (const b of batch) payload[b.id] = b.src;
    try {
      const data = parseJson(await ask(env, MENU_SYSTEM, JSON.stringify(payload), { json: true, timeout: 90_000 }));
      for (const b of batch) {
        const got = data[b.id] as Row | undefined;
        if (!got) continue;
        const out = {} as MenuTr;
        let ok = true;
        for (const l of LANGS) {
          const tr = got[l] as Row | undefined;
          if (!tr) {
            ok = false;
            break;
          }
          out[l] = {};
          for (const f of Object.keys(b.src)) {
            const t = String(tr[f] ?? "").trim().slice(0, 1000);
            if (t) out[l][f] = t;
          }
        }
        if (ok) done[b.id] = out;
      }
    } catch (e) {
      const msg = e instanceof AiUnavailable ? e.message : String(e);
      console.warn("menu translation failed:", msg.slice(0, 300));
      return { done, error: msg.slice(0, 200) };
    }
  }
  return { done };
}
