// Impostazioni del server. Le chiavi segrete si inseriscono nel pannello Cloudflare
// (Worker → Settings → Variables and Secrets), mai nel codice.
export interface Env {
  ASSETS: { fetch(req: Request | string): Promise<Response> };
  SUPABASE_URL: string;
  /** Chiave segreta Supabase (sb_secret_… oppure la vecchia service_role). SEGRETO */
  SUPABASE_SECRET_KEY: string;
  /** PIN iniziale dell'area gestione, usato finché non lo cambi dalla dashboard. SEGRETO */
  ADMIN_PIN?: string;
  /** Chiave Google Gemini per traduzioni e testi AI. SEGRETO (facoltativo) */
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  /** Chiave Resend per le email "avvisami quando arriva". SEGRETO (facoltativo) */
  RESEND_API_KEY?: string;
  /** Mittente email, es. "Birreria Cassina <menu@tuodominio.it>" */
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  /** Indirizzo pubblico del sito, es. https://lista-birre.tuonome.workers.dev */
  APP_URL?: string;
}

export interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}
