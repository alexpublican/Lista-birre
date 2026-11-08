// Utilità HTTP: risposte JSON, errori nello stesso formato del vecchio backend, cookie.
export class HttpError extends Error {
    status;
    detail;
    constructor(status, detail) {
        super(typeof detail === "string" ? detail : `HTTP ${status}`);
        this.status = status;
        this.detail = detail;
    }
}
export function json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
    });
}
export function noContent() {
    return new Response(null, { status: 204 });
}
export function getCookie(req, name) {
    const raw = req.headers.get("cookie");
    if (!raw)
        return null;
    for (const part of raw.split(";")) {
        const i = part.indexOf("=");
        if (i < 0)
            continue;
        if (part.slice(0, i).trim() === name)
            return decodeURIComponent(part.slice(i + 1).trim());
    }
    return null;
}
export function cookie(name, value, maxAge) {
    return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
export function clearCookie(name) {
    return `${name}=""; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
export async function readJson(req) {
    let body;
    try {
        body = await req.json();
    }
    catch {
        throw new HttpError(422, [{ loc: ["body"], msg: "JSON non valido", type: "json_invalid" }]);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(422, [{ loc: ["body"], msg: "Oggetto atteso", type: "model_type" }]);
    }
    return body;
}
export function clientIp(req) {
    return req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "?";
}
export function randomToken(bytes = 32) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    let s = "";
    for (const b of arr)
        s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export const nowIso = () => new Date().toISOString();
/** Data/ora compatta, usata come "versione" delle immagini (cache-buster). */
export function stamp(withMs = false) {
    const d = new Date();
    const p = (n, l = 2) => String(n).padStart(l, "0");
    const base = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
    return withMs ? `${base}${p(d.getUTCMilliseconds(), 3)}000` : base;
}
