// Galleria della pagina «Il locale»: le foto scorrono in orizzontale, una ogni 3 secondi,
// con un leggero zoom lento sulla foto in vista. Col dito si può scorrere avanti e indietro;
// mentre si tiene il dito sulla foto (o la pagina non è in vista) la galleria si ferma.
//
// Ogni foto ha la sua posizione: -1 a sinistra, 0 in vista, 1 a destra, 2 nascosta.
// Una foto si muove con l'animazione solo se passa da una posizione vicina all'altra;
// i salti più lunghi avvengono fuori dallo schermo, senza animazione (così il giro ricomincia
// dalla prima foto senza "riavvolgere" tutta la galleria).
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { didascalia, fotoLocaleUrl, type FotoLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";

const INTERVAL = 3000; // ogni quanto cambia foto
const SLIDE_MS = 900; // durata dello scorrimento (deve coincidere con menu.css)

export default function Galleria({ foto }: { foto: FotoLocale[] }) {
  const { t, lang } = useI18n();
  const n = foto.length;
  const [idx, setIdx] = useState(0);
  const [from, setFrom] = useState<number | null>(null); // foto che sta uscendo
  const [dir, setDir] = useState<1 | -1>(1);
  const [settled, setSettled] = useState(true);
  const [side, setSide] = useState<1 | -1>(1); // con 2 foto: dove aspetta quella non in vista
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hold, setHold] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  const [near, setNear] = useState<Set<number>>(() => new Set([0, 1, n - 1]));
  const start = useRef<{ x: number; y: number; id: number; horiz: boolean | null } | null>(null);
  const last = useRef<number[]>([]);
  const frame = useRef<HTMLDivElement>(null);

  // Se cambia il numero di foto (gestore che ne aggiunge/toglie) si riparte dalla prima.
  useEffect(() => {
    setIdx(0);
    setFrom(null);
    setSettled(true);
    setNear(new Set([0, 1, n - 1]));
  }, [n]);

  const posOf = (i: number): number => {
    const d = (i - idx + n) % n;
    if (d === 0) return 0;
    if (n === 2) return settled ? side : -dir;
    if (d === 1) return 1;
    if (d === n - 1) return -1;
    return 2;
  };
  const pos = foto.map((_, i) => posOf(i));

  useLayoutEffect(() => {
    last.current = pos;
  });

  // Carica solo le foto vicine a quella in vista (e quelle già viste).
  useEffect(() => {
    if (n < 1) return;
    setNear((s) => {
      const want = [idx, (idx + 1) % n, (idx - 1 + n) % n];
      if (want.every((i) => s.has(i))) return s;
      return new Set([...s, ...want]);
    });
  }, [idx, n]);

  const move = (step: 1 | -1) => {
    setFrom(idx);
    setDir(step);
    setSettled(false);
    setIdx((i) => (i + step + n) % n);
  };

  const go = (step: 1 | -1) => {
    if (n < 2 || !settled) return;
    if (n === 2 && side !== step) {
      // l'altra foto si sposta (fuori schermo) dal lato giusto, poi scorre
      setSide(step);
      requestAnimationFrame(() => requestAnimationFrame(() => move(step)));
      return;
    }
    move(step);
  };

  // Fine dello scorrimento.
  useEffect(() => {
    if (settled) return;
    const id = setTimeout(() => {
      setSettled(true);
      setSide(1);
      setFrom(null);
    }, SLIDE_MS + 40);
    return () => clearTimeout(id);
  }, [settled, idx]);

  // Avanzamento automatico: il conto dei 3 secondi parte quando la foto inizia a entrare.
  const goRef = useRef(go);
  goRef.current = go;
  const paused = hold || dragging || hidden;
  useEffect(() => {
    if (n < 2 || paused) return;
    const id = setTimeout(() => goRef.current(1), INTERVAL);
    return () => clearTimeout(id);
  }, [idx, paused, n]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ---------------------------------------------------------------- dito / mouse
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (n < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest("button")) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horiz: null };
    setHold(true);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horiz === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.horiz = Math.abs(dx) > Math.abs(dy) && settled;
      if (!s.horiz) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (n === 2) setSide(dx < 0 ? 1 : -1);
      setDragging(true);
    }
    if (s.horiz) setDrag(dx);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    setHold(false);
    if (!s.horiz) return;
    const w = frame.current?.clientWidth ?? 360;
    const th = Math.min(80, w * 0.18);
    const dx = e.clientX - s.x;
    setDragging(false);
    setDrag(0);
    if (dx < -th) move(1);
    else if (dx > th) move(-1);
  };

  if (n === 0) return null;
  const caption = (f: FotoLocale) => didascalia(f, lang);

  return (
    <div
      ref={frame}
      className={`gal${paused ? " paused" : ""}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && start.current && !start.current.horiz) {
          start.current = null;
          setHold(false);
        }
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("loc_title")}
      data-testid="locale-gallery"
    >
      {foto.map((f, i) => {
        const p = pos[i];
        const old = last.current[i] ?? p;
        const anim = !dragging && Math.abs(p) <= 1 && Math.abs(old) <= 1 && Math.abs(p - old) <= 1;
        const on = p === 0 || (!settled && i === from);
        const cap = caption(f);
        return (
          <figure
            key={f.id}
            className="gal-s"
            style={{
              transform: `translate3d(calc(${p * 100}% + ${dragging && Math.abs(p) <= 1 ? drag : 0}px),0,0)`,
              transition: anim ? undefined : "none",
              visibility: p === 2 ? "hidden" : undefined,
            }}
            aria-hidden={p !== 0}
          >
            {near.has(i) && (
              <img
                className={`kb${on ? " on" : ""}`}
                src={fotoLocaleUrl(f)}
                alt={cap || `${t("loc_title")} ${i + 1}`}
                draggable={false}
                decoding="async"
              />
            )}
            {cap && (
              <figcaption>
                <span>{cap}</span>
              </figcaption>
            )}
          </figure>
        );
      })}

      {n > 1 && (
        <>
          {n <= 15 && (
            <div className="gal-bars" aria-hidden>
              {foto.map((f, i) => (
                <span key={f.id} className={i === idx ? "on" : ""}>
                  {i === idx && !paused && <i key={`${idx}-${n}`} style={{ animationDuration: `${INTERVAL}ms` }} />}
                </span>
              ))}
            </div>
          )}
          <span className="gal-n" aria-live="polite">
            {String(idx + 1).padStart(2, "0")} <em>/</em> {String(n).padStart(2, "0")}
          </span>
          <button type="button" className="gal-a l" onClick={() => go(-1)} aria-label={t("loc_prev")}>
            <ChevronLeft />
          </button>
          <button type="button" className="gal-a r" onClick={() => go(1)} aria-label={t("loc_next")}>
            <ChevronRight />
          </button>
        </>
      )}
    </div>
  );
}
