import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import VenueInfo from "@/components/VenueInfo";

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

export default function Poster() {
  const { t } = useI18n();
  const menuUrl = `${window.location.origin}/`;

  return (
    <div className="min-h-screen bg-[#12100E] print:bg-[#F5EBE1]">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link to="/admin/dashboard" className={buttonVariants({ variant: "outline" })} data-testid="poster-back-link">
          ← {t("dashboard")}
        </Link>
        <Button onClick={() => window.print()} data-testid="poster-print-button">
          <Printer className="size-4" /> {t("print")}
        </Button>
      </div>

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
