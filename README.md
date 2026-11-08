# Lista Birre — menu della Birreria Cassina

Copia del sito "lista-emergent" senza la parte Emergent. Aspetto e funzioni sono gli stessi:
menu pubblico (porte Spina / Frigo / Cantina, `/classico`), area gestione con PIN (`/admin`),
poster QR (`/poster`), schermo TV (`/tv`), avvisi email, voti, foto, logo, backup, traduzioni AI.

## Com'è fatto

| Parte | Dove | Cosa fa |
|---|---|---|
| Sito (React) | `src/`, `public/`, `index.html` | Le pagine che vedono clienti e gestore |
| Server | `worker/` | Le API `/api/...` su Cloudflare Workers |
| Database | Supabase (`supabase/schema.sql`) | Birre, info locale, voti, backup; foto e logo nello Storage |

Il server non usa librerie esterne: parla con Supabase, Gemini (traduzioni) e Resend (email)
via internet. Le foto vengono ridimensionate dal browser prima dell'invio.

Lavori automatici (in `wrangler.jsonc`):
- **ogni notte alle 04:00** (ora italiana d'inverno): backup completo; i backup più vecchi di 30 giorni vengono cancellati
- **ogni ora**: completa le traduzioni mancanti e ritenta le email "è arrivata" non partite

## Pubblicazione su Cloudflare (una volta sola)

1. Cloudflare → **Workers & Pages** → **Create** → **Import a repository** → scegli `lista-birre`.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
2. Worker → **Settings → Variables and Secrets**, aggiungi come *Secret*:
   - `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys → chiave **secret** (`sb_secret_…`)
   - `ADMIN_PIN`: il PIN iniziale dell'area gestione (poi lo puoi cambiare dalla dashboard)
   - `GEMINI_API_KEY`: la tua chiave Google AI Studio (traduzioni e testi AI)
   - `RESEND_API_KEY` ed `EMAIL_FROM` (es. `Birreria Cassina <menu@tuodominio.it>`): per le email "avvisami"
   - `APP_URL`: l'indirizzo del sito (es. `https://lista-birre.tuonome.workers.dev`)
3. Rilancia il deploy. Fatto.

Senza Gemini il sito funziona lo stesso: mancano solo traduzioni automatiche e testi AI.
Senza Resend le iscrizioni "avvisami" restano salvate e partono quando lo configuri.

## Portare i dati dal vecchio sito

Vecchio sito → Dashboard → **Backup** → **Esporta file**. Nuovo sito → Dashboard → **Backup** →
**Importa file**. Arrivano birre, info locale, voti, logo e foto.

## Lavorare sul computer (facoltativo)

```bash
npm install
cp .dev.vars.example .dev.vars   # inserisci le chiavi
npm run dev:api                  # server su :8787
npm run dev                      # sito su http://localhost:3000
```
