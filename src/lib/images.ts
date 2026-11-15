// Le foto vengono ridimensionate nel browser prima dell'invio (come faceva il vecchio server):
// file più leggeri, caricamento veloce anche dal telefono, e il server resta semplice.
import { ApiError } from "./api";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const ICON_BG = "#12100E";

const fail = (status: number, detail: string) => new ApiError(status, { detail });

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  if (file.size > MAX_BYTES) throw fail(413, "Immagine troppo grande (max 5 MB)");
  if (file.type && !ALLOWED.includes(file.type)) throw fail(415, "Formato non supportato: usa PNG, JPG o WEBP");
  try {
    // Le foto del telefono vengono girate secondo i dati EXIF.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw fail(415, "File immagine non valido");
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(fail(415, "File immagine non valido"))), type, quality),
  );
}

/** True se l'immagine ha zone trasparenti (es. loghi): in quel caso niente JPEG, che le farebbe nere. */
function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const px = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}

/**
 * Ridimensiona (lato massimo maxSide) e comprime.
 * Prova il WEBP (leggero, tiene la trasparenza). Safari su iPhone/iPad però non sa crearlo e
 * restituirebbe un PNG pesantissimo (anche 4-5 MB per una foto): allora usa JPEG, oppure PNG
 * solo se l'immagine ha parti trasparenti.
 */
export async function resizeImage(file: Blob, maxSide: number): Promise<Blob> {
  const bmp = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const webp = await toBlob(canvas, "image/webp", 0.8);
  if (webp.type === "image/webp") return webp;
  if (hasAlpha(ctx, canvas.width, canvas.height)) return webp.type === "image/png" ? webp : toBlob(canvas, "image/png");
  return toBlob(canvas, "image/jpeg", 0.8);
}

/** Icona quadrata dell'app: logo centrato su fondo scuro (zona sicura 78%). */
export async function makeIcon(logo: Blob, size: number): Promise<Blob> {
  const bmp = await loadBitmap(logo);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = ICON_BG;
  ctx.fillRect(0, 0, size, size);
  const inner = Math.floor(size * 0.78);
  const scale = Math.min(1, inner / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h);
  bmp.close();
  return toBlob(canvas, "image/png");
}

export const ICON_SIZES = [180, 192, 512] as const;

/** FormData per il logo: logo ≤800px (WEBP, o PNG da iPhone) + le tre icone dell'app (PNG). */
export async function logoFormData(file: Blob): Promise<FormData> {
  const logo = await resizeImage(file, 800);
  const fd = new FormData();
  fd.append("file", logo, "logo");
  for (const s of ICON_SIZES) fd.append(`icon${s}`, await makeIcon(logo, s), `icon${s}.png`);
  return fd;
}
