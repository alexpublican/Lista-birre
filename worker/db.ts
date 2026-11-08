// Piccolo client per le API REST di Supabase (PostgREST + Storage), senza dipendenze.
import type { Env } from "./env";

export class DbError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Supabase ${status}: ${body.slice(0, 300)}`);
    this.status = status;
    this.body = body;
  }
}

export const enc = encodeURIComponent;

export class Db {
  private url: string;
  private key: string;

  constructor(env: Env) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY non configurati");
    }
    this.url = env.SUPABASE_URL.replace(/\/+$/, "");
    this.key = env.SUPABASE_SECRET_KEY;
  }

  headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { apikey: this.key, ...extra };
    // Le vecchie chiavi (JWT) vanno anche in Authorization; le nuove sb_secret_ no.
    if (!this.key.startsWith("sb_")) h.Authorization = `Bearer ${this.key}`;
    return h;
  }

  private async rest<T>(method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
    const headers = this.headers({ "Content-Type": "application/json" });
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new DbError(res.status, text);
    return (text ? JSON.parse(text) : null) as T;
  }

  /** GET /table?query → rows */
  select<T = Record<string, unknown>>(table: string, query = ""): Promise<T[]> {
    return this.rest<T[]>("GET", `${table}?${query}`);
  }

  async one<T = Record<string, unknown>>(table: string, query: string): Promise<T | null> {
    const rows = await this.select<T>(table, `${query}&limit=1`);
    return rows[0] ?? null;
  }

  insert<T = Record<string, unknown>>(table: string, rows: unknown, opts: { onConflict?: string } = {}): Promise<T[]> {
    const q = opts.onConflict ? `?on_conflict=${opts.onConflict}` : "";
    const prefer = opts.onConflict ? "return=representation,resolution=merge-duplicates" : "return=representation";
    return this.rest<T[]>("POST", `${table}${q}`, rows, prefer);
  }

  update<T = Record<string, unknown>>(table: string, filter: string, patch: unknown): Promise<T[]> {
    return this.rest<T[]>("PATCH", `${table}?${filter}`, patch, "return=representation");
  }

  delete<T = Record<string, unknown>>(table: string, filter: string): Promise<T[]> {
    return this.rest<T[]>("DELETE", `${table}?${filter}`, undefined, "return=representation");
  }

  rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    return this.rest<T>("POST", `rpc/${fn}`, args);
  }

  // ---- Storage (bucket pubblico "images") ----
  storageUrl(path: string): string {
    return `${this.url}/storage/v1/object/public/images/${path}`;
  }

  async putFile(path: string, data: ArrayBuffer | Uint8Array<ArrayBuffer>, contentType: string): Promise<void> {
    const res = await fetch(`${this.url}/storage/v1/object/images/${path}`, {
      method: "POST",
      headers: this.headers({ "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "max-age=3600" }),
      body: data,
    });
    if (!res.ok) throw new DbError(res.status, await res.text());
  }

  async removeFiles(paths: string[]): Promise<void> {
    if (!paths.length) return;
    const res = await fetch(`${this.url}/storage/v1/object/images`, {
      method: "DELETE",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: paths }),
    });
    if (!res.ok) throw new DbError(res.status, await res.text());
  }

  /** Scarica un file dallo storage (null se non esiste). */
  async getFile(path: string): Promise<Response | null> {
    const res = await fetch(`${this.url}/storage/v1/object/images/${path}`, { headers: this.headers() });
    if (res.status === 400 || res.status === 404) return null;
    if (!res.ok) throw new DbError(res.status, await res.text());
    return res;
  }
}
