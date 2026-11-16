import { useState } from "react";
import { Link } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { byBrewery, byTap, isGravity, useBeers, useSettings, type Beer, type Location } from "@/lib/beers";
import { ALLERGENI, SET, SETTORI, allergeniOf, eur, hasSizes, useMenu, type Voce } from "@/lib/menu";
import { useI18n } from "@/lib/i18n";

// Menù di riserva su carta: tutte le birre disponibili e il menù di cucina e bar, in italiano,
// da stampare (o salvare in PDF) e tenere al banco per quando internet non c'è.

const PRINT_CSS = `
@page { size: A4 portrait; margin: 12mm 11mm; }
@media print {
  html, body { background: #fff !important; background-image: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
.stampa { font-family: "DM Sans Variable", system-ui, sans-serif; color: #1C1713; }
.stampa h1, .stampa h2, .stampa h3 { font-family: "Playfair Display Variable", Georgia, serif; }
.stampa .cols { column-count: 2; column-gap: 9mm; }
.stampa .blk { break-inside: avoid; margin-bottom: 4mm; }
.stampa .reparto { break-before: page; }
.stampa .reparto:first-of-type { break-before: auto; }
.stampa h2 { font-size: 17pt; font-weight: 700; border-bottom: 1.5px solid #B45309; padding-bottom: 1mm; margin: 0 0 3mm; column-span: all; }
.stampa h3 { font-size: 11.5pt; font-weight: 700; color: #92400E; margin: 0 0 1.5mm; }
.stampa .row { display: flex; gap: 2.5mm; align-items: baseline; break-inside: avoid; padding: 0.9mm 0; border-bottom: 0.5px dotted #D6C7B8; font-size: 9pt; line-height: 1.25; }
.stampa .row .n { flex: 1; min-width: 0; }
.stampa .row b { font-weight: 700; }
.stampa .row .sub { display: block; color: #57534E; font-size: 8pt; }
.stampa .row .p { white-space: nowrap; text-align: right; font-weight: 700; }
.stampa .row .p small { font-weight: 400; color: #57534E; margin-right: 1mm; }
.stampa .tap { display: inline-block; min-width: 5.5mm; font-weight: 700; color: #B45309; }
.stampa sup { font-size: 6.5pt; color: #92400E; margin-left: 0.6mm; }
.stampa .note { font-size: 8pt; color: #57534E; font-style: italic; margin: 1mm 0 0; }
.stampa .legenda { font-size: 7.5pt; color: #44403C; column-count: 2; column-gap: 9mm; }
`;

const REPARTI: { k: Location; titolo: string }[] = [
  { k: "spina", titolo: "Alla spina" },
  { k: "frigo", titolo: "In frigo" },
  { k: "cantina", titolo: "In cantina" },
];

function BeerLine({ b }: { b: Beer }) {
  const { abvOf } = useI18n();
  const extra = [b.stile, abvOf(b), b.posizione === "cantina" && b.annata ? String(b.annata) : "", b.cask ? "Cask" : "", b.senza_glutine ? "Senza glutine" : "", b.analcolica ? "Analcolica" : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="row">
      {b.posizione === "spina" && b.spina_n != null && (
        <span className="tap">{isGravity(b.spina_n) ? "Botte" : b.spina_n}</span>
      )}
      <span className="n">
        <b>{b.nome}</b> <span style={{ color: "#57534E" }}>— {b.birrificio}</span>
        {extra && <span className="sub">{extra}</span>}
      </span>
      <span className="p">
        {b.formati.length > 0
          ? b.formati.map((f, i) => (
              <span key={i} style={{ display: "block" }}>
                <small>{f.nome}</small>
                {eur(f.prezzo)}
              </span>
            ))
          : eur(b.prezzo)}
      </span>
    </div>
  );
}

function VoceLine({ v }: { v: Voce }) {
  const all = allergeniOf(v);
  return (
    <div className="row">
      <span className="n">
        <b>{v.nome}</b>
        {all.length > 0 && <sup>{all.map((a) => a.n).join(",")}</sup>}
        {v.cantina && <span style={{ color: "#57534E" }}> — {v.cantina}</span>}
        {v.descrizione && <span className="sub">{v.descrizione}</span>}
      </span>
      <span className="p">
        {hasSizes(v) ? (
          <>
            {v.calice != null && (
              <span style={{ display: "block" }}>
                <small>calice</small>
                {eur(v.calice)}
              </span>
            )}
            {v.bottiglia != null && (
              <span style={{ display: "block" }}>
                <small>bottiglia</small>
                {eur(v.bottiglia)}
              </span>
            )}
          </>
        ) : (
          eur(v.prezzo)
        )}
      </span>
    </div>
  );
}

export default function MenuStampa() {
  const { t } = useI18n();
  const beers = useBeers();
  const menu = useMenu();
  const settings = useSettings();
  const [conBirre, setConBirre] = useState(true);
  const [conMenu, setConMenu] = useState(true);

  const live = (beers.data ?? []).filter((b) => !b.archiviata && !b.in_arrivo && b.disponibile);
  const m = menu.data;
  const usaAllergeni = !!m && SETTORI.some((k) => m.settori[k].some((s) => (s.voci ?? []).some((v) => v.disponibile !== false && allergeniOf(v).length > 0)));
  const oggi = new Date().toLocaleString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const loading = beers.isLoading || menu.isLoading;

  return (
    <div className="min-h-screen bg-[#12100E] print:bg-white">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link to="/admin/dashboard" className={buttonVariants({ variant: "outline" })}>
          ← {t("dashboard")}
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[#E7D9CC]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={conBirre} onChange={(e) => setConBirre(e.target.checked)} /> Birre
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={conMenu} onChange={(e) => setConMenu(e.target.checked)} /> Cucina e bar
          </label>
          <Button onClick={() => window.print()} disabled={loading} data-testid="stampa-print-button">
            <Printer className="size-4" /> {t("print")}
          </Button>
        </div>
        <p className="w-full text-xs text-[#BFB0A3]">
          Da tenere al banco per quando internet non va. Per un PDF scegli «Salva come PDF» come stampante.
          Ristampalo quando cambiano le birre.
        </p>
      </div>

      <div className="stampa mx-auto max-w-[210mm] bg-white px-[11mm] py-[12mm] shadow-2xl print:max-w-none print:p-0 print:shadow-none" data-testid="stampa-sheet">
        <header className="blk" style={{ textAlign: "center", marginBottom: "6mm" }}>
          <h1 style={{ fontSize: "24pt", fontWeight: 700, margin: 0 }}>Birreria Cassina</h1>
          <p style={{ fontSize: "9pt", color: "#57534E", margin: "1mm 0 0" }}>
            Menù aggiornato al {oggi}
            {settings.data?.telefono ? ` · Tel. ${settings.data.telefono}` : ""}
          </p>
        </header>

        {loading && <p>Caricamento…</p>}

        {conBirre &&
          REPARTI.map(({ k, titolo }) => {
            const list = live.filter((b) => b.posizione === k).sort(k === "spina" ? byTap : byBrewery);
            if (!list.length) return null;
            return (
              <section key={k} className="cols" style={{ marginBottom: "6mm" }}>
                <h2>
                  {titolo} <span style={{ fontSize: "10pt", fontWeight: 400, color: "#57534E" }}>({list.length})</span>
                </h2>
                {list.map((b) => (
                  <BeerLine key={b.id} b={b} />
                ))}
              </section>
            );
          })}

        {conMenu &&
          m &&
          SETTORI.map((k) => {
            const sezioni = m.settori[k]
              .map((s) => ({ s, voci: (s.voci ?? []).filter((v) => v.disponibile !== false) }))
              .filter(({ s, voci }) => voci.length > 0 || (!!s.testo && !s.lavagna));
            if (!sezioni.length) return null;
            return (
              <section key={k} className="cols" style={{ marginBottom: "6mm" }}>
                <h2>{SET[k].label}</h2>
                {sezioni.map(({ s, voci }) => (
                  <div key={s.id} className="blk">
                    <h3>{s.titolo}</h3>
                    {s.testo && <p className="note" style={{ fontStyle: "normal" }}>{s.testo}</p>}
                    {voci.map((v) => (
                      <VoceLine key={v.id} v={v} />
                    ))}
                    {s.nota && <p className="note">{s.nota}</p>}
                  </div>
                ))}
              </section>
            );
          })}

        {conMenu && m && (usaAllergeni || (m.note_finali ?? []).length > 0) && (
          <footer className="blk" style={{ marginTop: "4mm", borderTop: "0.5px solid #D6C7B8", paddingTop: "2mm" }}>
            {usaAllergeni && (
              <div className="legenda">
                <b>Allergeni (Reg. UE 1169/2011):</b>{" "}
                {ALLERGENI.map((a) => `${a.n} ${a.it}`).join(" · ")}
              </div>
            )}
            {(m.note_finali ?? []).map((n, i) => (
              <p key={i} className="note">
                {n}
              </p>
            ))}
          </footer>
        )}
      </div>
    </div>
  );
}
