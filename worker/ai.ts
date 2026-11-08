// Google Gemini (chiave del proprietario): traduzioni dall'italiano e testi suggeriti.
import type { Env } from "./env";
import { LANGS, type Row } from "./models";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const TIMEOUT_MS = 25_000;
const BATCH_SIZE = 8; // il piano gratuito di Gemini consente ~5 richieste al minuto

const TRANSLATE_SYSTEM =
  "You translate texts for the beer menu of Birreria Cassina, a historic Italian pub. " +
  "Translate the Italian beer description and food pairing into English, German, French and Spanish (Spain). " +
  "Keep a natural, appetising menu tone, keep beer style names, brewery names and units as they are, " +
  "and do not add information. Reply with JSON only, no markdown, exactly in this shape: " +
  '{"en":{"descrizione":"...","abbinamento":"..."},"de":{...},"fr":{...},"es":{...}}. ' +
  'If an Italian field is empty, return "" for it in every language.';

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

export function emptyTranslations(): Row {
  const out: Row = {};
  for (const l of LANGS) {
    out[`descrizione_${l}`] = "";
    out[`abbinamento_${l}`] = "";
  }
  return out;
}

function fieldsFrom(data: Row, descrizione: string, abbinamento: string): Row {
  const out: Row = {};
  for (const l of LANGS) {
    const tr = (data[l] ?? {}) as Row;
    if (!data[l]) throw new Error(`lingua ${l} mancante`);
    out[`descrizione_${l}`] = descrizione.trim() ? String(tr.descrizione ?? "").trim().slice(0, 1000) : "";
    out[`abbinamento_${l}`] = abbinamento.trim() ? String(tr.abbinamento ?? "").trim().slice(0, 300) : "";
  }
  return out;
}

/** Traduzioni di una birra, oppure null se il servizio non risponde (il salvataggio prosegue). */
export async function translateFields(env: Env, descrizione: string, abbinamento: string): Promise<Row | null> {
  if (!descrizione.trim() && !abbinamento.trim()) return emptyTranslations();
  try {
    const raw = await ask(env, TRANSLATE_SYSTEM, JSON.stringify({ descrizione, abbinamento }), { json: true });
    return fieldsFrom(parseJson(raw), descrizione, abbinamento);
  } catch (e) {
    console.warn("auto-translation failed:", String(e).slice(0, 300));
    return null;
  }
}

/** items: [{id, descrizione, abbinamento}] → {id: campi tradotti}; le birre fallite mancano. */
export async function translateMany(
  env: Env,
  items: { id: string; descrizione: string; abbinamento: string }[],
): Promise<Record<string, Row>> {
  const out: Record<string, Row> = {};
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const payload: Row = {};
    for (const b of batch) payload[b.id] = { descrizione: b.descrizione, abbinamento: b.abbinamento };
    try {
      const data = parseJson(await ask(env, BATCH_SYSTEM, JSON.stringify(payload), { json: true, timeout: 90_000 }));
      for (const b of batch) {
        try {
          out[b.id] = fieldsFrom(data[b.id] as Row, b.descrizione, b.abbinamento);
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
