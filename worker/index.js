// Punto di ingresso del server su Cloudflare:
// - /api/*  → le API (Supabase dietro)
// - tutto il resto → il sito (file statici della cartella dist, con fallback alla app React)
// - lavori programmati: backup notturno e traduzioni mancanti ogni ora
import { dailyJob, fillMissingTranslations, handleApi, sendPendingNotifications } from "./api";
import { Db } from "./db";
export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);
        if (url.pathname === "/api" || url.pathname.startsWith("/api/"))
            return handleApi(req, env, ctx);
        return env.ASSETS.fetch(req);
    },
    async scheduled(event, env, ctx) {
        const db = new Db(env);
        if (event.cron === "0 3 * * *") {
            // 04:00 ora italiana (03:00 UTC in inverno)
            ctx.waitUntil(dailyJob(db).catch((e) => console.error("daily backup failed", e)));
        }
        else {
            ctx.waitUntil((async () => {
                await fillMissingTranslations(env, db).catch((e) => console.error("translate-missing failed", e));
                await sendPendingNotifications(env, db).catch((e) => console.error("pending notifications failed", e));
            })());
        }
    },
};
