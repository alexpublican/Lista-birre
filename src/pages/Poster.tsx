import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import VenueInfo from "@/components/VenueInfo";
import TableSticker from "@/components/TableSticker";
import { cn } from "@/lib/utils";

const SCAN_LINES = [
  "Inquadra e scopri le birre di oggi",
  "Scan to see today's beers",
  "Scannen und die Biere von heute entdecken",
  "Scannez pour découvrir les bières du jour",
];

const PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { background: #F5EBE1 !important; }
  body { background-image: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

const STICKER_CSS = `
@page { size: A4 portrait; margin: 10mm; }
@media print {
  html, body { background: #fff !important; background-image: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

const SIZES = [8, 9, 10, 12] as const;

/** Barra in alto: torna alla gestione, scegli poster o adesivo, stampa. */
function Toolbar({ mode, onMode }: { mode: "poster" | "adesivo"; onMode: (m: "poster" | "adesivo") => void }) {
  const { t } = useI18n();
  const tab = (m: "poster" | "adesivo", label: string) => (
    <button
      type="button"
      onClick={() => onMode(m)}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors duration-150",
        mode === m ? "bg-[#D97706] text-[#12100E]" : "text-[#E7D9CC] hover:bg-[#2A221C]",
      )}
      data-testid={`poster-tab-${m}`}
    >
      {label}
    </button>
  );
  return (
    <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-4 print:hidden">
      <Link to="/admin/dashboard" className={buttonVariants({ variant: "outline" })} data-testid="poster-back-link">
        ← {t("dashboard")}
      </Link>
      <div className="flex rounded-lg border border-[#3D3126] bg-[#1E1915] p-1">
        {tab("poster", t("poster_a4"))}
        {tab("adesivo", t("table_sticker"))}
      </div>
      <Button onClick={() => window.print()} data-testid="poster-print-button">
        <Printer className="size-4" /> {t("print")}
      </Button>
    </div>
  );
}

/** Foglio A4 di adesivi tondi da centro tavolo (o uno solo, per la tipografia). */
function StickerSheet({ url }: { url: string }) {
  const [cm, setCm] = useState<number>(9);
  const [single, setSingle] = useState(false);
  // area utile A4 con margini di 10 mm: 190 × 277 mm, 4 mm tra un adesivo e l'altro
  const mm = cm * 10;
  const cols = Math.max(1, Math.floor((190 + 4) / (mm + 4)));
  const rows = Math.max(1, Math.floor((277 + 4) / (mm + 4)));
  const count = single ? 1 : cols * rows;

  return (
    <>
      <style>{STICKER_CSS}</style>
      <div className="mx-auto max-w-[210mm] px-4 pb-4 text-sm text-[#E7D9CC] print:hidden">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-2">
            Diametro
            {SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCm(n)}
                className={cn(
                  "rounded-md border px-2.5 py-1 transition-colors duration-150",
                  cm === n ? "border-[#D97706] bg-[#3B260E] text-[#FCD34D]" : "border-[#3D3126] hover:bg-[#2A221C]",
                )}
                data-testid={`sticker-size-${n}`}
              >
                {n} cm
              </button>
            ))}
          </span>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={single} onChange={(e) => setSingle(e.target.checked)} data-testid="sticker-single" />
            Uno solo (per la tipografia)
          </label>
        </div>
        <p className="mt-2 text-xs text-[#BFB0A3]">
          {single
            ? "Un adesivo nel foglio: scegli «Salva come PDF» come stampante e manda il file alla tipografia."
            : `${count} adesivi per foglio A4. Stampa su carta adesiva e ritaglia lungo il bordo scuro.`}{" "}
          Per i tavoli conviene il vinile opaco plastificato: si pulisce con lo straccio e non riflette la luce sul QR.
        </p>
      </div>

      <div
        className="mx-auto aspect-[210/297] w-full max-w-[210mm] bg-white p-[10mm] shadow-2xl print:aspect-auto print:max-w-none print:p-0 print:shadow-none"
        data-testid="sticker-sheet"
      >
        <div
          className="grid justify-center gap-[4mm]"
          style={{ gridTemplateColumns: `repeat(${single ? 1 : cols}, ${mm}mm)`, justifyContent: "center" }}
        >
          {Array.from({ length: count }, (_, i) => (
            <TableSticker key={i} url={url} size={`${mm}mm`} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function Poster() {
  const menuUrl = `${window.location.origin}/`;
  const [params, setParams] = useSearchParams();
  const mode = params.get("tipo") === "adesivo" ? "adesivo" : "poster";
  const setMode = (m: "poster" | "adesivo") => setParams(m === "adesivo" ? { tipo: "adesivo" } : {}, { replace: true });

  if (mode === "adesivo")
    return (
      <div className="min-h-screen bg-[#12100E] print:bg-white">
        <Toolbar mode={mode} onMode={setMode} />
        <StickerSheet url={menuUrl} />
        <div className="h-10 print:hidden" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#12100E] print:bg-[#F5EBE1]">
      <style>{PRINT_CSS}</style>
      <Toolbar mode={mode} onMode={setMode} />

      <div
        className="mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col items-center justify-between bg-[#F5EBE1] px-[10%] py-[9%] text-[#1C1713] shadow-2xl print:max-w-none print:shadow-none"
        data-testid="poster-sheet"
      >
        <div className="flex w-full flex-col items-center text-center">
          <BrandMark className="size-24" iconClassName="size-10" tone="light" testId="poster-brand" />
          <p className="mt-4 font-mono text-[11px] tracking-[0.35em] text-[#B45309] uppercase">Birreria storica</p>
          <h1 className="font-heading mt-2 text-5xl font-bold tracking-tight sm:text-6xl" data-testid="poster-title">
            Birreria Cassina
          </h1>
          <div className="mt-4 flex w-48 items-center gap-2">
            <span className="h-px flex-1 bg-[#B45309]" />
            <span className="size-1.5 rotate-45 bg-[#B45309]" />
            <span className="h-px flex-1 bg-[#B45309]" />
          </div>
          <p className="font-heading mt-4 text-xl italic sm:text-2xl">Alla Spina · In Frigo · In Cantina</p>
        </div>

        <div className="rounded-2xl border-2 border-[#1C1713] bg-white p-5 sm:p-6" data-testid="poster-qr">
          <QRCodeSVG value={menuUrl} size={240} level="M" fgColor="#1C1713" bgColor="#FFFFFF" marginSize={0} />
        </div>

        <div className="flex w-full flex-col items-center text-center">
          <p className="font-heading text-2xl font-semibold sm:text-3xl" data-testid="poster-scan-main">
            {SCAN_LINES[0]}
          </p>
          <div className="mt-3 grid gap-1 text-sm text-[#57422F]">
            {SCAN_LINES.slice(1).map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
          <div className="mt-6 w-full border-t border-[#B45309]/40 pt-5">
            <VenueInfo variant="light" />
          </div>
          <p className="mt-5 font-mono text-xs break-all text-[#786C60]" data-testid="poster-url">
            {menuUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </p>
        </div>
      </div>
      <div className="h-10 print:hidden" />
    </div>
  );
}
