// Chiamate alle API del server (worker/api.ts). Percorso relativo "/api": funziona uguale
// in sviluppo (Vite inoltra /api a wrangler dev) e online su Cloudflare.
const BASE = "/api";

// Fields are declared, not constructor parameter properties: tsconfig sets
// erasableSyntaxOnly, which rejects `constructor(readonly status: number)`.
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`request failed with ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type JsonBody = unknown;

async function request<T>(method: string, path: string, body?: JsonBody): Promise<T> {
  // Auth rides the httpOnly session cookie automatically — never add auth headers here.
  // FormData (file uploads) goes as-is so the browser sets the multipart boundary.
  const isForm = body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  // Errori di validazione: 422 con corpo {detail: [...]}; altri errori: {detail: "messaggio"}.
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// The response type is yours to declare: nothing infers across the Python boundary, so a
// TS interface here mirrors the endpoint's Pydantic model by hand — keep the two in sync.
export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: JsonBody) => request<T>("POST", path, body ?? null);
export const apiPut = <T>(path: string, body?: JsonBody) => request<T>("PUT", path, body ?? null);
export const apiPatch = <T>(path: string, body?: JsonBody) =>
  request<T>("PATCH", path, body ?? null);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);
