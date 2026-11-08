// Tutte le API del sito sotto /api — stesso comportamento del vecchio backend FastAPI.
import { AiUnavailable, describeBeer, suggestPairing, translateFields, translateMany } from "./ai";
import { Db, enc } from "./db";
import { arrivalEmail, sendEmail } from "./email";
import { HttpError, clearCookie, clientIp, cookie, getCookie, json, noContent, nowIso, randomToken, readJson, stamp, } from "./http";
import { GRAVITY_TAP, TAP_COUNT, TR_FIELDS, normalizeImportedBeer, parseBeerCreate, parseBeerUpdate, parseSettings, vintage, withDefaults, } from "./models";
const ADMIN_COOKIE = "cassina_admin";
const DEVICE_COOKIE = "cassina_device";
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const FAIL_WINDOW_S = 300;
const MAX_IMAGE = 5 * 1024 * 1024;
const EXPORT_FORMAT = "birreria-cassina-backup";
// ------------------------------------------------------------------ auth
async function isAdmin(c) {
    const token = getCookie(c.req, ADMIN_COOKIE);
    if (!token)
        return false;
    const s = await c.db.one("sessions", `select=token&token=eq.${enc(token)}&expires_at=gt.${enc(nowIso())}`);
    return !!s;
}
const admin = (h) => async (c) => {
    if (!(await isAdmin(c)))
        throw new HttpError(401, "PIN richiesto");
    return h(c);
};
const PBKDF2_ITERATIONS = 100_000; // massimo consentito da Cloudflare Workers
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (s) => new Uint8Array((s.match(/../g) ?? []).map((h) => parseInt(h, 16)));
async function pbkdf2(pin, salt) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, 256);
    return hex(bits);
}
function safeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    let r = 0;
    for (let i = 0; i < a.length; i++)
        r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
}
async function verifyPin(c, pin) {
    const doc = await c.db.one("admin", "select=hash,salt&id=eq.pin");
    if (doc)
        return safeEqual(await pbkdf2(pin, unhex(doc.salt)), doc.hash);
    return safeEqual(pin, c.env.ADMIN_PIN || "1234");
}
async function recentFails(c, ip) {
    const since = new Date(Date.now() - FAIL_WINDOW_S * 1000).toISOString();
    const rows = await c.db.select("rate_hits", `select=id&kind=eq.pin&ip=eq.${enc(ip)}&at=gt.${enc(since)}`);
    return rows.length;
}
async function addHit(c, kind, ip) {
    await c.db.insert("rate_hits", { kind, ip });
}
const routes = [];
const on = (method, path, h) => routes.push([method, new RegExp(`^/api${path.replace(/:[a-z]+/g, "([^/]+)")}/?$`), h]);
on("POST", "/auth/pin", async (c) => {
    const body = await readJson(c.req);
    const pin = body.pin;
    if (typeof pin !== "string" || pin.length < 1 || pin.length > 32) {
        throw new HttpError(422, [{ loc: ["body", "pin"], msg: "PIN non valido", type: "string_type" }]);
    }
    const ip = clientIp(c.req);
    if ((await recentFails(c, ip)) >= MAX_FAILS)
        throw new HttpError(429, "Troppi tentativi, riprova tra qualche minuto");
    if (!(await verifyPin(c, pin))) {
        await addHit(c, "pin", ip);
        throw new HttpError(401, "PIN non corretto");
    }
    await c.db.delete("rate_hits", `kind=eq.pin&ip=eq.${enc(ip)}`);
    const token = randomToken(32);
    const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
    await c.db.insert("sessions", { token, expires_at: expires });
    return json({ admin: true }, 200, { "Set-Cookie": cookie(ADMIN_COOKIE, token, SESSION_DAYS * 86400) });
});
on("GET", "/auth/me", async (c) => json({ admin: await isAdmin(c) }));
on("POST", "/auth/logout", async (c) => {
    const token = getCookie(c.req, ADMIN_COOKIE);
    if (token)
        await c.db.delete("sessions", `token=eq.${enc(token)}`);
    return json({ admin: false }, 200, { "Set-Cookie": clearCookie(ADMIN_COOKIE) });
});
on("POST", "/auth/change-pin", admin(async (c) => {
    const body = await readJson(c.req);
    const cur = body.current_pin;
    const next = body.new_pin;
    const issues = [];
    if (typeof cur !== "string" || cur.length < 1 || cur.length > 32)
        issues.push({ loc: ["body", "current_pin"], msg: "PIN non valido", type: "string_type" });
    if (typeof next !== "string" || !/^\d{4,12}$/.test(next))
        issues.push({ loc: ["body", "new_pin"], msg: "Da 4 a 12 cifre", type: "string_pattern_mismatch" });
    if (issues.length)
        throw new HttpError(422, issues);
    const ip = clientIp(c.req);
    if ((await recentFails(c, ip)) >= MAX_FAILS)
        throw new HttpError(429, "Troppi tentativi, riprova tra qualche minuto");
    if (!(await verifyPin(c, cur))) {
        await addHit(c, "pin", ip);
        throw new HttpError(400, "PIN attuale non corretto");
    }
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    await c.db.insert("admin", { id: "pin", hash: await pbkdf2(next, salt), salt: hex(salt) }, { onConflict: "id" });
    // Esce da tutti gli altri dispositivi; resta attiva la sessione che ha cambiato il PIN.
    const mine = getCookie(c.req, ADMIN_COOKIE) ?? "";
    await c.db.delete("sessions", `token=neq.${enc(mine)}`);
    return json({ ok: true });
}));
// ------------------------------------------------------------------ beers
async function getBeer(c, id) {
    const doc = await c.db.one("beers", `select=*&id=eq.${enc(id)}`);
    if (!doc)
        throw new HttpError(404, "Birra non trovata");
    return doc;
}
async function updateBeer(c, id, patch) {
    const rows = await c.db.update("beers", `id=eq.${enc(id)}`, patch);
    if (!rows[0])
        throw new HttpError(404, "Birra non trovata");
    return rows[0];
}
/** Una spina ospita una birra in mescita E, separatamente, una birra "in arrivo" per quella spina. */
async function assertTapFree(c, n, waiting, excludeId) {
    if (n === null || n === undefined)
        return;
    let q = `select=nome&spina_n=eq.${n}&archiviata=is.false&in_arrivo=is.${waiting}`;
    if (excludeId)
        q += `&id=neq.${enc(excludeId)}`;
    const other = await c.db.one("beers", q);
    if (other) {
        const what = waiting ? "ha già una birra in attesa" : "è già occupata da";
        throw new HttpError(409, `Spina ${n} ${what}: ${other.nome}`);
    }
}
async function firstFreeTap(c) {
    const rows = await c.db.select("beers", "select=spina_n&spina_n=not.is.null&archiviata=is.false&in_arrivo=is.false");
    const used = new Set(rows.map((r) => r.spina_n));
    for (let n = 1; n <= TAP_COUNT; n++)
        if (!used.has(n) && n !== GRAVITY_TAP)
            return n;
    return null;
}
function publicBase(c) {
    for (const cand of [c.req?.headers.get("origin"), c.env.APP_URL]) {
        if (!cand)
            continue;
        try {
            const u = new URL(cand);
            if (u.protocol === "https:" && u.hostname)
                return `https://${u.host}`;
        }
        catch {
            /* ignore */
        }
    }
    return null;
}
export async function notifyArrival(env, db, beer, base) {
    const subs = await db.select("subscriptions", `select=token,email,lang&beer_id=eq.${enc(String(beer.id))}`);
    let sent = 0;
    for (const s of subs) {
        const unsub = base ? `${base}/disiscriviti?token=${s.token}` : null;
        const { subject, html } = arrivalEmail(s.lang || "it", String(beer.nome), String(beer.birrificio ?? ""), base ? `${base}/` : null, unsub);
        try {
            await sendEmail(env, s.email, subject, html);
        }
        catch (e) {
            console.warn(`arrival email for ${beer.id} not sent:`, String(e));
            continue;
        }
        await db.delete("subscriptions", `token=eq.${enc(s.token)}`);
        sent++;
    }
    console.log(`arrival notifications for ${beer.nome}: ${sent}/${subs.length} sent`);
}
/** Avvisi rimasti in sospeso (es. email non partita): li ritenta il controllo orario. */
export async function sendPendingNotifications(env, db) {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
        return;
    const subs = await db.select("subscriptions", "select=beer_id");
    const ids = [...new Set(subs.map((s) => s.beer_id))];
    if (!ids.length)
        return;
    const beers = await db.select("beers", `select=*&id=in.(${ids.map((i) => `"${i}"`).join(",")})&in_arrivo=is.false&archiviata=is.false`);
    const base = publicBase({ env });
    for (const b of beers)
        await notifyArrival(env, db, b, base);
}
on("GET", "/beers", async (c) => json(await c.db.select("beers", "select=*&order=posizione.asc,nome.asc&limit=1000")));
let filling = false;
/** Riempie solo le traduzioni VUOTE delle birre con testo italiano (non sovrascrive mai quelle scritte a mano). */
export async function fillMissingTranslations(env, db) {
    if (filling)
        return 0;
    filling = true;
    try {
        const docs = await db.select("beers", `select=id,descrizione,abbinamento,${TR_FIELDS.join(",")}&limit=1000`);
        const missing = (d) => TR_FIELDS.filter((f) => {
            const base = f.slice(0, f.lastIndexOf("_"));
            return String(d[base] ?? "").trim() && !String(d[f] ?? "").trim();
        });
        const todo = docs.filter((d) => missing(d).length);
        if (!todo.length)
            return 0;
        const done = await translateMany(env, todo.map((d) => ({ id: String(d.id), descrizione: String(d.descrizione ?? ""), abbinamento: String(d.abbinamento ?? "") })));
        let n = 0;
        for (const d of todo) {
            const tr = done[String(d.id)];
            if (!tr)
                continue;
            const upd = {};
            for (const f of missing(d))
                if (tr[f])
                    upd[f] = tr[f];
            if (Object.keys(upd).length) {
                await db.update("beers", `id=eq.${enc(String(d.id))}`, upd);
                n++;
            }
        }
        console.log(`filled missing translations for ${n} beers`);
        return n;
    }
    finally {
        filling = false;
    }
}
on("POST", "/beers/translate-missing", admin(async (c) => json({ translated: await fillMissingTranslations(c.env, c.db), failed: 0 })));
on("POST", "/beers/translate-all", admin(async (c) => {
    const docs = await c.db.select("beers", "select=id,descrizione,abbinamento&limit=1000");
    const items = docs
        .filter((d) => String(d.descrizione ?? "").trim() || String(d.abbinamento ?? "").trim())
        .map((d) => ({ id: String(d.id), descrizione: String(d.descrizione ?? ""), abbinamento: String(d.abbinamento ?? "") }));
    const done = await translateMany(c.env, items);
    const now = nowIso();
    for (const [bid, tr] of Object.entries(done))
        await c.db.update("beers", `id=eq.${enc(bid)}`, { ...tr, updated_at: now });
    return json({ translated: Object.keys(done).length, failed: items.length - Object.keys(done).length });
}));
function strField(body, f, max) {
    const v = body[f] ?? "";
    if (typeof v !== "string" || v.length > max) {
        throw new HttpError(422, [{ loc: ["body", f], msg: `Testo di massimo ${max} caratteri`, type: "string_type" }]);
    }
    return v;
}
function wordList(body, min) {
    const v = body.parole ?? [];
    if (!Array.isArray(v) || v.length < min || v.length > 6 || v.some((x) => typeof x !== "string")) {
        throw new HttpError(422, [{ loc: ["body", "parole"], msg: "Da 1 a 6 parole chiave", type: "list_type" }]);
    }
    return v.map((p) => p.trim().slice(0, 40)).filter(Boolean);
}
on("POST", "/beers/ai-description", admin(async (c) => {
    const body = await readJson(c.req);
    const nome = strField(body, "nome", 120);
    const stile = strField(body, "stile", 80);
    const parole = wordList(body, 1);
    if (!parole.length)
        throw new HttpError(422, "Scrivi almeno una parola chiave");
    try {
        return json({ descrizione: await describeBeer(c.env, nome.trim(), stile.trim(), parole) });
    }
    catch (e) {
        if (e instanceof AiUnavailable) {
            console.warn("AI description failed:", e.message);
            throw new HttpError(503, "Servizio AI non disponibile, riprova tra poco");
        }
        throw e;
    }
}));
on("POST", "/beers/ai-pairing", admin(async (c) => {
    const body = await readJson(c.req);
    const nome = strField(body, "nome", 120);
    const stile = strField(body, "stile", 80);
    const descrizione = strField(body, "descrizione", 1000);
    const parole = wordList(body, 0);
    if (!(stile.trim() || descrizione.trim() || parole.length))
        throw new HttpError(422, "Scrivi almeno lo stile della birra");
    try {
        return json({ abbinamento: await suggestPairing(c.env, nome.trim(), stile.trim(), descrizione.trim(), parole) });
    }
    catch (e) {
        if (e instanceof AiUnavailable) {
            console.warn("AI pairing failed:", e.message);
            throw new HttpError(503, "Servizio AI non disponibile, riprova tra poco");
        }
        throw e;
    }
}));
on("POST", "/beers", admin(async (c) => {
    const row = parseBeerCreate(await readJson(c.req));
    row.spina_n = row.spina_n || null;
    row.annata = vintage(row.annata);
    if (row.posizione !== "spina")
        row.spina_n = null;
    await assertTapFree(c, row.spina_n, row.in_arrivo);
    if (String(row.descrizione).trim() || String(row.abbinamento).trim()) {
        const tr = await translateFields(c.env, String(row.descrizione), String(row.abbinamento));
        if (tr)
            Object.assign(row, tr);
        // se fallisce, il controllo orario riempirà le traduzioni mancanti
    }
    const now = nowIso();
    const [beer] = await c.db.insert("beers", { ...row, id: crypto.randomUUID(), foto_version: null, created_at: now, updated_at: now });
    return json(beer);
}));
on("PATCH", "/beers/:id", admin(async (c) => {
    const id = c.params[0];
    const old = await getBeer(c, id);
    const changes = parseBeerUpdate(await readJson(c.req));
    if ("annata" in changes)
        changes.annata = vintage(changes.annata);
    if (changes.spina_n === 0)
        changes.spina_n = null;
    if ((changes.posizione ?? old.posizione) !== "spina")
        changes.spina_n = null;
    const waiting = (changes.in_arrivo ?? !!old.in_arrivo);
    const tap = ("spina_n" in changes ? changes.spina_n : old.spina_n);
    const arriving = !!old.in_arrivo && !waiting;
    if (arriving && tap !== null && tap !== undefined) {
        // La birra in attesa prende la sua spina: quella che stava spillando va nello storico.
        const now = nowIso();
        await c.db.update("beers", `spina_n=eq.${tap}&id=neq.${enc(id)}&archiviata=is.false&in_arrivo=is.false`, {
            archiviata: true,
            archiviata_il: now,
            spina_n: null,
            in_evidenza: false,
            updated_at: now,
        });
    }
    else if (tap !== null && tap !== undefined && ("spina_n" in changes || "in_arrivo" in changes)) {
        await assertTapFree(c, tap, waiting, id);
    }
    // Testo italiano cambiato → EN/DE/FR/ES vengono riscritte (sostituiscono quelle manuali).
    const newDesc = String(changes.descrizione ?? old.descrizione ?? "");
    const newPair = String(changes.abbinamento ?? old.abbinamento ?? "");
    if (newDesc !== String(old.descrizione ?? "") || newPair !== String(old.abbinamento ?? "")) {
        const tr = await translateFields(c.env, newDesc, newPair);
        if (tr)
            Object.assign(changes, tr);
        else
            for (const f of TR_FIELDS)
                changes[f] = ""; // il controllo orario le riempirà
    }
    changes.updated_at = nowIso();
    const beer = await updateBeer(c, id, changes);
    if (old.in_arrivo && !beer.in_arrivo)
        c.ctx.waitUntil(notifyArrival(c.env, c.db, beer, publicBase(c)));
    return json(beer);
}));
on("POST", "/beers/:id/archive", admin(async (c) => {
    const id = c.params[0];
    await getBeer(c, id);
    const now = nowIso();
    const beer = await updateBeer(c, id, {
        archiviata: true,
        archiviata_il: now,
        spina_n: null,
        in_evidenza: false,
        in_arrivo: false,
        updated_at: now,
    });
    await c.db.delete("subscriptions", `beer_id=eq.${enc(id)}`);
    return json(beer);
}));
on("POST", "/beers/:id/restore", admin(async (c) => {
    const id = c.params[0];
    const old = await getBeer(c, id);
    const tap = old.posizione === "spina" ? await firstFreeTap(c) : null;
    return json(await updateBeer(c, id, { archiviata: false, disponibile: true, spina_n: tap, updated_at: nowIso() }));
}));
on("POST", "/beers/:id/queue", admin(async (c) => {
    const id = c.params[0];
    const body = await readJson(c.req);
    const n = body.spina_n ?? null;
    if (n !== null && !(Number.isInteger(n) && n >= 0 && n <= TAP_COUNT)) {
        throw new HttpError(422, [{ loc: ["body", "spina_n"], msg: `Tra 0 e ${TAP_COUNT}`, type: "range" }]);
    }
    const old = await getBeer(c, id);
    const tap = old.posizione === "spina" ? n || null : null;
    await assertTapFree(c, tap, true, id);
    return json(await updateBeer(c, id, { archiviata: false, in_arrivo: true, disponibile: false, spina_n: tap, updated_at: nowIso() }));
}));
on("DELETE", "/beers/:id", admin(async (c) => {
    const id = c.params[0];
    const rows = await c.db.delete("beers", `id=eq.${enc(id)}`);
    if (!rows.length)
        throw new HttpError(404, "Birra non trovata");
    await c.db.delete("subscriptions", `beer_id=eq.${enc(id)}`);
    await c.db.delete("ratings", `beer_id=eq.${enc(id)}`);
    // La foto resta: ripristinando un backup torna; la pulizia notturna elimina quelle orfane.
    return noContent();
}));
// --- "Avvisami quando arriva"
on("POST", "/beers/:id/subscribe", async (c) => {
    const id = c.params[0];
    const body = await readJson(c.req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
        throw new HttpError(422, [{ loc: ["body", "email"], msg: "Email non valida", type: "value_error" }]);
    }
    const lang = body.lang ?? "it";
    if (!["it", "en", "de", "fr", "es"].includes(lang)) {
        throw new HttpError(422, [{ loc: ["body", "lang"], msg: "Lingua non valida", type: "literal_error" }]);
    }
    const ip = clientIp(c.req);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const hits = await c.db.select("rate_hits", `select=id&kind=eq.subscribe&ip=eq.${enc(ip)}&at=gt.${enc(since)}`);
    if (hits.length >= 10)
        throw new HttpError(429, "Troppe richieste, riprova più tardi");
    await addHit(c, "subscribe", ip);
    const beer = await getBeer(c, id);
    if (!beer.in_arrivo || beer.archiviata)
        throw new HttpError(400, "Questa birra non è in arrivo");
    const existing = await c.db.one("subscriptions", `select=token&beer_id=eq.${enc(id)}&email=eq.${enc(email)}`);
    if (existing)
        await c.db.update("subscriptions", `token=eq.${enc(String(existing.token))}`, { lang });
    else
        await c.db.insert("subscriptions", { token: randomToken(24), beer_id: id, email, lang });
    return json({ ok: true });
});
on("POST", "/subscriptions/unsubscribe", async (c) => {
    const body = await readJson(c.req);
    const token = body.token;
    if (typeof token !== "string" || token.length < 10 || token.length > 100) {
        throw new HttpError(422, [{ loc: ["body", "token"], msg: "Token non valido", type: "string_type" }]);
    }
    const rows = await c.db.delete("subscriptions", `token=eq.${enc(token)}`);
    return json({ ok: rows.length > 0 });
});
// --- Voti
on("POST", "/beers/:id/rate", async (c) => {
    const id = c.params[0];
    const body = await readJson(c.req);
    const stars = body.stars;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        throw new HttpError(422, [{ loc: ["body", "stars"], msg: "Da 1 a 5", type: "range" }]);
    }
    const beer = await c.db.one("beers", `select=in_arrivo,archiviata&id=eq.${enc(id)}`);
    if (!beer || beer.archiviata)
        throw new HttpError(404, "Birra non trovata");
    if (beer.in_arrivo)
        throw new HttpError(400, "Non ancora disponibile");
    let dev = getCookie(c.req, DEVICE_COOKIE);
    const headers = {};
    if (!dev || dev.length > 64) {
        dev = randomToken(18);
        headers["Set-Cookie"] = cookie(DEVICE_COOKIE, dev, 365 * 86400);
    }
    await c.db.insert("ratings", { beer_id: id, device: dev, stars, updated_at: nowIso() }, { onConflict: "beer_id,device" });
    return json({ stars }, 200, headers);
});
on("GET", "/ratings/mine", async (c) => {
    const dev = getCookie(c.req, DEVICE_COOKIE);
    if (!dev)
        return json({});
    const rows = await c.db.select("ratings", `select=beer_id,stars&device=eq.${enc(dev)}`);
    return json(Object.fromEntries(rows.map((r) => [r.beer_id, r.stars])));
});
on("GET", "/admin/stats", admin(async (c) => {
    const ratings = await c.db.rpc("rating_stats");
    const subs = await c.db.select("subscriptions", "select=beer_id");
    const subscribers = {};
    for (const s of subs)
        subscribers[s.beer_id] = (subscribers[s.beer_id] ?? 0) + 1;
    return json({ ratings: ratings.map((r) => ({ ...r, count: Number(r.count) })), subscribers });
}));
// ------------------------------------------------------------------ info locale
async function loadSettings(db) {
    const doc = await db.one("settings", "select=data&id=eq.main");
    return withDefaults(doc?.data);
}
async function patchSettings(db, patch) {
    const cur = await db.one("settings", "select=data&id=eq.main");
    await db.insert("settings", { id: "main", data: { ...(cur?.data ?? {}), ...patch } }, { onConflict: "id" });
}
on("GET", "/settings", async (c) => json(await loadSettings(c.db)));
on("PUT", "/settings", admin(async (c) => {
    const clean = parseSettings(await readJson(c.req));
    await patchSettings(c.db, clean);
    const s = await loadSettings(c.db);
    return json({ ...clean, logo_version: s.logo_version });
}));
// ------------------------------------------------------------------ immagini
function imageType(bytes) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
        return "image/png";
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
        return "image/jpeg";
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
        return "image/webp";
    return null;
}
async function readImage(file) {
    if (!file || typeof file === "string")
        throw new HttpError(422, [{ loc: ["body", "file"], msg: "File mancante", type: "missing" }]);
    const blob = file;
    if (blob.size > MAX_IMAGE)
        throw new HttpError(413, "Immagine troppo grande (max 5 MB)");
    const data = new Uint8Array(await blob.arrayBuffer());
    const type = imageType(data);
    if (!type)
        throw new HttpError(415, "Formato non supportato: usa PNG, JPG o WEBP");
    return { data, type };
}
async function formData(req) {
    try {
        return await req.formData();
    }
    catch {
        throw new HttpError(422, [{ loc: ["body"], msg: "Dati del modulo non validi", type: "value_error" }]);
    }
}
/** Serve un file dello storage, con cache di Cloudflare. */
async function serveFile(c, path, maxAge, fallback) {
    const cache = globalThis.caches?.default;
    const key = new Request(c.url.toString());
    if (cache) {
        const hit = await cache.match(key);
        if (hit)
            return hit;
    }
    const res = await c.db.getFile(path);
    if (!res) {
        if (fallback)
            return c.env.ASSETS.fetch(new URL(fallback, c.url).toString());
        throw new HttpError(404, path === "logo" ? "Nessun logo" : "Nessuna foto");
    }
    const out = new Response(res.body, {
        headers: {
            "Content-Type": res.headers.get("content-type") || "image/png",
            "Cache-Control": maxAge >= 31536000 ? `public, max-age=${maxAge}, immutable` : `public, max-age=${maxAge}`,
            "X-Content-Type-Options": "nosniff",
        },
    });
    if (cache && c.url.searchParams.has("v"))
        c.ctx.waitUntil(cache.put(key, out.clone()));
    return out;
}
on("GET", "/logo", async (c) => serveFile(c, "logo", 31536000));
on("POST", "/logo", admin(async (c) => {
    const fd = await formData(c.req);
    const { data, type } = await readImage(fd.get("file"));
    await c.db.putFile("logo", data, type);
    // Icone dell'app (generate dal browser insieme al logo)
    for (const size of [180, 192, 512]) {
        const icon = fd.get(`icon${size}`);
        if (icon && typeof icon !== "string") {
            const img = await readImage(icon);
            await c.db.putFile(`icons/${size}`, img.data, img.type);
        }
    }
    await patchSettings(c.db, { logo_version: stamp() });
    return json({ ok: true });
}));
on("DELETE", "/logo", admin(async (c) => {
    await c.db.removeFiles(["logo", "icons/180", "icons/192", "icons/512"]);
    await patchSettings(c.db, { logo_version: null });
    return json({ ok: true });
}));
on("GET", "/icon/:size", async (c) => {
    const m = /^(180|192|512)\.png$/.exec(c.params[0]);
    if (!m)
        throw new HttpError(404, "size not available");
    return serveFile(c, `icons/${m[1]}`, 3600, `/icons/default-${m[1]}.png`);
});
on("GET", "/beers/:id/photo", async (c) => serveFile(c, `beers/${c.params[0]}`, 31536000));
on("POST", "/beers/:id/photo", admin(async (c) => {
    const id = c.params[0];
    await getBeer(c, id);
    const fd = await formData(c.req);
    const { data, type } = await readImage(fd.get("file"));
    await c.db.putFile(`beers/${id}`, data, type);
    return json(await updateBeer(c, id, { foto_version: stamp(true) }));
}));
on("DELETE", "/beers/:id/photo", admin(async (c) => {
    const id = c.params[0];
    await c.db.removeFiles([`beers/${id}`]);
    return json(await updateBeer(c, id, { foto_version: null }));
}));
on("GET", "/backups", admin(async (c) => json(await c.db.select("backups", "select=id,created_at,kind,beer_count&order=created_at.desc&limit=500"))));
on("POST", "/backups", admin(async (c) => {
    const [info] = await c.db.rpc("create_backup", { p_kind: "manual" });
    return json(info);
}));
on("GET", "/backups/export", admin(async (c) => {
    // Le immagini le scarica e unisce il browser (vedi BackupsDialog): qui solo dati e indirizzi.
    const beers = await c.db.select("beers", "select=*&limit=5000");
    const settings = await loadSettings(c.db);
    const ratings = await c.db.select("ratings", "select=*&limit=100000");
    const asset_urls = [];
    if (settings.logo_version)
        asset_urls.push({ id: "logo", url: `/api/logo?v=${settings.logo_version}` });
    for (const b of beers)
        if (b.foto_version)
            asset_urls.push({ id: `beer:${b.id}`, url: `/api/beers/${b.id}/photo?v=${b.foto_version}` });
    return json({
        format: EXPORT_FORMAT,
        version: 1,
        exported_at: nowIso(),
        beers,
        settings: { id: "main", ...settings },
        ratings,
        assets: [],
        asset_urls,
    });
}));
/** Carica un'immagine da un file di backup (il browser la decodifica e la invia così com'è). */
on("PUT", "/backups/import-asset", admin(async (c) => {
    const id = c.url.searchParams.get("id") ?? "";
    let path = null;
    if (id === "logo")
        path = "logo";
    else if (/^beer:[A-Za-z0-9-]{1,80}$/.test(id))
        path = `beers/${id.slice(5)}`;
    else if (/^icon:(180|192|512)$/.test(id))
        path = `icons/${id.slice(5)}`;
    if (!path)
        throw new HttpError(400, "File di backup non valido");
    const data = new Uint8Array(await c.req.arrayBuffer());
    if (data.length > MAX_IMAGE)
        throw new HttpError(413, "Immagine troppo grande (max 5 MB)");
    const type = imageType(data);
    if (!type)
        throw new HttpError(400, "File di backup non valido");
    await c.db.putFile(path, data, type);
    return json({ ok: true });
}));
on("POST", "/backups/import", admin(async (c) => {
    const data = await readJson(c.req).catch(() => {
        throw new HttpError(400, "File di backup non valido");
    });
    if (data.format !== EXPORT_FORMAT)
        throw new HttpError(400, "File di backup non valido");
    let beers;
    let settings = null;
    const ratings = [];
    try {
        beers = (data.beers ?? []).map(normalizeImportedBeer);
        if (data.settings && typeof data.settings === "object") {
            const s = data.settings;
            settings = { ...parseSettings(s), logo_version: typeof s.logo_version === "string" ? s.logo_version : null };
            if (data.has_logo)
                settings.logo_version = stamp();
        }
        for (const r of data.ratings ?? []) {
            if (r.beer_id === undefined || r.device === undefined || r.stars === undefined)
                throw new Error("rating");
            const stars = Math.max(1, Math.min(5, Math.trunc(Number(r.stars))));
            if (!Number.isFinite(stars))
                throw new Error("rating");
            ratings.push({
                beer_id: String(r.beer_id),
                device: String(r.device),
                stars,
                updated_at: typeof r.updated_at === "string" ? r.updated_at : nowIso(),
            });
        }
    }
    catch {
        throw new HttpError(400, "File di backup non valido");
    }
    const safety = await c.db.rpc("apply_snapshot", { p_snap: { beers, settings, ratings } });
    const info = { id: "import", created_at: nowIso(), kind: "manual", beer_count: beers.length };
    return json({ restored: info, safety_backup_id: safety });
}));
on("POST", "/backups/:id/restore", admin(async (c) => {
    const id = c.params[0];
    const snap = await c.db.one("backups", `select=id,created_at,kind,beer_count&id=eq.${enc(id)}`);
    if (!snap)
        throw new HttpError(404, "Backup non trovato");
    const safety = await c.db.rpc("restore_backup", { p_id: id });
    return json({ restored: snap, safety_backup_id: safety });
}));
/** Lavoro notturno: backup, pulizia backup > 30 giorni e foto orfane, sessioni scadute. */
export async function dailyJob(db) {
    const [info] = await db.rpc("create_backup", { p_kind: "daily" });
    const orphans = await db.rpc("prune_backups");
    await db.removeFiles(orphans.map((o) => `beers/${o.beer_id}`));
    await db.delete("sessions", `expires_at=lt.${enc(nowIso())}`);
    await db.delete("rate_hits", `at=lt.${enc(new Date(Date.now() - 86400_000).toISOString())}`);
    console.log(`daily backup ${info?.id} (${info?.beer_count} beers), ${orphans.length} orphan photos removed`);
}
// ------------------------------------------------------------------ dispatcher
export async function handleApi(req, env, ctx) {
    const url = new URL(req.url);
    try {
        const db = new Db(env);
        let pathMatched = false;
        for (const [method, re, h] of routes) {
            const m = re.exec(url.pathname);
            if (!m)
                continue;
            pathMatched = true;
            if (method !== req.method && !(method === "GET" && req.method === "HEAD"))
                continue;
            return await h({ req, env, db, ctx, url, params: m.slice(1).map(decodeURIComponent) });
        }
        return json({ detail: pathMatched ? "Method Not Allowed" : "Not Found" }, pathMatched ? 405 : 404);
    }
    catch (e) {
        if (e instanceof HttpError)
            return json({ detail: e.detail }, e.status);
        console.error("API error", url.pathname, e);
        return json({ detail: "Errore interno del server" }, 500);
    }
}
