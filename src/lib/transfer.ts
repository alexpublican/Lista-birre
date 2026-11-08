// Esporta / importa il file di backup completo (birre, info locale, voti, logo e foto).
// Il formato del file è lo stesso del vecchio sito, quindi i file esportati da lì si importano qui.
import { ApiError, apiGet, apiPost } from "./api";
import type { RestoreResult } from "./beers";
import { ICON_SIZES, makeIcon } from "./images";

const FORMAT = "birreria-cassina-backup";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",", 2)[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes]);
}

interface ExportPayload {
  asset_urls?: { id: string; url: string }[];
  assets: { id: string; data: string }[];
  [k: string]: unknown;
}

/** Scarica il file di backup sul dispositivo. */
export async function exportBackup(): Promise<void> {
  const payload = await apiGet<ExportPayload>("/backups/export");
  const assets: { id: string; data: string }[] = [];
  for (const a of payload.asset_urls ?? []) {
    const res = await fetch(a.url);
    if (res.ok) assets.push({ id: a.id, data: await blobToBase64(await res.blob()) });
  }
  delete payload.asset_urls;
  payload.assets = assets;
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `birreria-cassina-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function putAsset(id: string, blob: Blob): Promise<void> {
  const res = await fetch(`/api/backups/import-asset?id=${encodeURIComponent(id)}`, { method: "PUT", body: blob });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
}

/** Legge un file di backup e sostituisce i dati del sito. */
export async function importBackup(file: File): Promise<RestoreResult> {
  const invalid = new ApiError(400, { detail: "File di backup non valido" });
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw invalid;
  }
  if (!data || typeof data !== "object" || data.format !== FORMAT) throw invalid;

  const assets = Array.isArray(data.assets) ? (data.assets as { id: unknown; data: unknown }[]) : [];
  let hasLogo = false;
  for (const a of assets) {
    const id = String(a?.id ?? "");
    if (id !== "logo" && !id.startsWith("beer:")) continue;
    let blob: Blob;
    try {
      blob = base64ToBlob(String(a.data));
    } catch {
      throw invalid;
    }
    await putAsset(id, blob);
    if (id === "logo") {
      hasLogo = true;
      for (const s of ICON_SIZES) {
        try {
          await putAsset(`icon:${s}`, await makeIcon(blob, s));
        } catch {
          /* l'icona predefinita resta valida */
        }
      }
    }
  }
  return apiPost<RestoreResult>("/backups/import", {
    format: FORMAT,
    beers: data.beers ?? [],
    settings: data.settings ?? null,
    ratings: data.ratings ?? [],
    has_logo: hasLogo,
  });
}
