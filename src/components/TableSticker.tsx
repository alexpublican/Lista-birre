import { useId } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Beer as BeerIcon } from "lucide-react";
import { useSettings } from "@/lib/beers";

// Adesivo tondo da centro tavolo: anello scuro con scritte curve, logo, QR del menù.
// Disegnato in un riquadro 100×100: la misura vera la decide chi lo usa (CSS width in mm).

const INK = "#1C1713";
const CREAM = "#F5EBE1";
const BRASS = "#D97706";
const HEAD = '"Playfair Display Variable", Georgia, serif';
const BODY = '"DM Sans Variable", system-ui, sans-serif';

export default function TableSticker({ url, size }: { url: string; size: string }) {
  const id = useId().replace(/:/g, "");
  const { data, isError } = useSettings();
  const logo = !isError ? data?.logo_version : null;

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size, display: "block" }}
      role="img"
      aria-label="Birreria Cassina — QR del menù"
      data-testid="table-sticker"
    >
      <defs>
        {/* sopra: da sinistra a destra passando in alto; sotto: da sinistra a destra passando in basso */}
        <path id={`top-${id}`} d="M 7.5,50 A 42.5,42.5 0 0 1 92.5,50" />
        <path id={`bot-${id}`} d="M 3.5,50 A 46.5,46.5 0 0 0 96.5,50" />
      </defs>

      {/* anello */}
      <circle cx="50" cy="50" r="50" fill={INK} />
      <circle cx="50" cy="50" r="48.6" fill="none" stroke={BRASS} strokeWidth="0.35" />
      <circle cx="50" cy="50" r="40" fill={CREAM} />
      <circle cx="50" cy="50" r="40" fill="none" stroke={BRASS} strokeWidth="0.6" />

      <text fill={CREAM} fontFamily={HEAD} fontSize="6.4" fontWeight="700" letterSpacing="1.1">
        <textPath href={`#top-${id}`} startOffset="50%" textAnchor="middle">
          BIRRERIA CASSINA
        </textPath>
      </text>
      <text fill={BRASS} fontFamily={BODY} fontSize="3.9" fontWeight="600" letterSpacing="0.55">
        <textPath href={`#bot-${id}`} startOffset="50%" textAnchor="middle">
          INQUADRA · SCAN · SCANNEN · SCANNEZ
        </textPath>
      </text>
      {/* rombetti a ore 3 e ore 9 */}
      {[5.5, 94.5].map((x) => (
        <rect key={x} x={x - 1.1} y={48.9} width="2.2" height="2.2" fill={BRASS} transform={`rotate(45 ${x} 50)`} />
      ))}

      {/* logo (o boccale) */}
      {logo ? (
        <image href={`/api/logo?v=${logo}`} x="40" y="12.5" width="20" height="11.5" preserveAspectRatio="xMidYMid meet" />
      ) : (
        <BeerIcon x={44.5} y={13} width={11} height={11} color="#B45309" strokeWidth={2} />
      )}

      {/* QR su fondo bianco */}
      <rect x="27.5" y="25.5" width="45" height="45" rx="3" fill="#FFFFFF" stroke={INK} strokeWidth="0.5" />
      <QRCodeSVG value={url} x={30} y={28} size={40} level="M" fgColor={INK} bgColor="#FFFFFF" marginSize={0} />

      <text x="50" y="77.2" textAnchor="middle" fill={INK} fontFamily={HEAD} fontSize="4.6" fontStyle="italic" fontWeight="600">
        Il menù di oggi
      </text>
      <text x="50" y="81.6" textAnchor="middle" fill="#57422F" fontFamily={BODY} fontSize="2.6" letterSpacing="0.2">
        Menu · Speisekarte · Carte · Carta
      </text>
    </svg>
  );
}
