export class DbError extends Error {
    status;
    body;
    constructor(status, body) {
        super(`Supabase ${status}: ${body.slice(0, 300)}`);
        this.status = status;
        this.body = body;
    }
}
export const enc = encodeURIComponent;
export class Db {
    url;
    key;
    constructor(env) {
        if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
            throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY non configurati");
        }
        this.url = env.SUPABASE_URL.replace(/\/+$/, "");
        this.key = env.SUPABASE_SECRET_KEY;
    }
    headers(extra = {}) {
        const h = { apikey: this.key, ...extra };
        // Le vecchie chiavi (JWT) vanno anche in Authorization; le nuove sb_secret_ no.
        if (!this.key.startsWith("sb_"))
            h.Authorization = `Bearer ${this.key}`;
        return h;
    }
    async rest(method, path, body, prefer) {
        const headers = this.headers({ "Content-Type": "application/json" });
        if (prefer)
            headers.Prefer = prefer;
        const res = await fetch(`${this.url}/rest/v1/${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await res.text();
        if (!res.ok)
            throw new DbError(res.status, text);
        return (text ? JSON.parse(text) : null);
    }
    /** GET /table?query → rows */
    select(table, query = "") {
        return this.rest("GET", `${table}?${query}`);
    }
    async one(table, query) {
        const rows = await this.select(table, `${query}&limit=1`);
        return rows[0] ?? null;
    }
    insert(table, rows, opts = {}) {
        const q = opts.onConflict ? `?on_conflict=${opts.onConflict}` : "";
        const prefer = opts.onConflict ? "return=representation,resolution=merge-duplicates" : "return=representation";
        return this.rest("POST", `${table}${q}`, rows, prefer);
    }
    update(table, filter, patch) {
        return this.rest("PATCH", `${table}?${filter}`, patch, "return=representation");
    }
    delete(table, filter) {
        return this.rest("DELETE", `${table}?${filter}`, undefined, "return=representation");
    }
    rpc(fn, args = {}) {
        return this.rest("POST", `rpc/${fn}`, args);
    }
    // ---- Storage (bucket pubblico "images") ----
    storageUrl(path) {
        return `${this.url}/storage/v1/object/public/images/${path}`;
    }
    async putFile(path, data, contentType) {
        const res = await fetch(`${this.url}/storage/v1/object/images/${path}`, {
            method: "POST",
            headers: this.headers({ "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "max-age=3600" }),
            body: data,
        });
        if (!res.ok)
            throw new DbError(res.status, await res.text());
    }
    async removeFiles(paths) {
        if (!paths.length)
            return;
        const res = await fetch(`${this.url}/storage/v1/object/images`, {
            method: "DELETE",
            headers: this.headers({ "Content-Type": "application/json" }),
            body: JSON.stringify({ prefixes: paths }),
        });
        if (!res.ok)
            throw new DbError(res.status, await res.text());
    }
    /** Scarica un file dallo storage (null se non esiste). */
    async getFile(path) {
        const res = await fetch(`${this.url}/storage/v1/object/images/${path}`, { headers: this.headers() });
        if (res.status === 400 || res.status === 404)
            return null;
        if (!res.ok)
            throw new DbError(res.status, await res.text());
        return res;
    }
}
