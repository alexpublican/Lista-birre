// Stampa: su alcuni telefoni il pulsante "Stampa" del sito non fa niente (sito aperto dall'icona
// sulla schermata Home, o dentro WhatsApp/Instagram/Facebook). Qui si capisce quando succede e
// si prepara un'immagine scaricabile dell'adesivo, che si stampa o si manda alla tipografia.

/** true se siamo in un posto dove window.print() di solito non parte. */
export function printBlocked(): boolean {
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone) return true; // iPhone/iPad: aperto dalla schermata Home
    if (window.matchMedia?.("(display-mode: standalone)").matches && /iPhone|iPad|iPod/.test(nav.userAgent)) return true;
    if (/FBAN|FBAV|Instagram|Line\/|WhatsApp|Telegram|; wv\)/.test(nav.userAgent)) return true; // browser dentro le app
  } catch {
    // niente
  }
  return false;
}

/** Prova a stampare; restituisce false se qui la stampa non è possibile. */
export function tryPrint(): boolean {
  if (printBlocked() || typeof window.print !== "function") return false;
  window.print();
  return true;
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/** I caratteri del sito (titoli e testo) da incollare dentro l'immagine. */
async function fontCss(families: string[]): Promise<string> {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // fogli di altri siti: non leggibili
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const fam = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
      if (!families.includes(fam)) continue;
      const range = rule.style.getPropertyValue("unicode-range");
      if (range && !/U\+0(000)?-0?0?FF|U\+0-FF/i.test(range)) continue; // solo l'alfabeto latino base
      const m = rule.style.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/);
      if (!m) continue;
      try {
        const data = await blobToDataUrl(await (await fetch(new URL(m[1], sheet.href ?? location.href))).blob());
        const css = rule.cssText.replace(/src:[^;]+;/, `src: url(${data});`);
        out.push(css);
      } catch {
        // senza carattere: si usa quello di riserva
      }
    }
  }
  return out.join("\n");
}

/**
 * Scarica come PNG un disegno SVG già sulla pagina (es. l'adesivo).
 * `px` = lato dell'immagine in pixel (1200 px ≈ 10 cm a 300 dpi).
 */
export async function downloadSvgAsPng(svg: SVGSVGElement, px: number, fileName: string): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(px));
  clone.setAttribute("height", String(px));
  clone.removeAttribute("style");

  // immagini (logo) dentro il file, altrimenti nel PNG non comparirebbero
  for (const img of Array.from(clone.querySelectorAll("image"))) {
    const href = img.getAttribute("href");
    if (!href || href.startsWith("data:")) continue;
    try {
      img.setAttribute("href", await blobToDataUrl(await (await fetch(href)).blob()));
    } catch {
      img.remove();
    }
  }
  const css = await fontCss(["Playfair Display Variable", "DM Sans Variable"]);
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }

  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("immagine non creata"));
    image.src = src;
  });
  // Safari a volte disegna i caratteri solo al secondo giro
  await new Promise((r) => setTimeout(r, 150));

  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas non disponibile");
  ctx.drawImage(image, 0, 0, px, px);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("immagine non creata");

  const file = new File([blob], fileName, { type: "image/png" });
  // Telefono: menu "Condividi" (da lì Stampa, Salva immagine, WhatsApp alla tipografia…)
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && /Android|iPhone|iPad|iPod/.test(nav.userAgent)) {
    try {
      await nav.share({ files: [file], title: "Adesivo tavolo Birreria Cassina" });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
