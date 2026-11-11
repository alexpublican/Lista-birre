import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/**
 * Rende "toccabile" una foto: al tocco si apre a schermo intero su fondo scuro.
 * - pizzica con due dita o doppio tocco per ingrandire, trascina per spostarti
 * - si chiude con la X, toccando lo sfondo, con Esc o col tasto "indietro" del telefono
 * Usa un Dialog di Base UI, così funziona anche dentro la scheda a comparsa (Sheet) senza chiuderla.
 */
export default function PhotoViewer({
  src,
  alt,
  children,
  className,
  light = false,
}: {
  src: string;
  alt: string;
  children: ReactNode; // la miniatura da mostrare nella scheda
  className?: string;
  light?: boolean; // foto di bottiglie e loghi: sfondo chiaro, come nella scheda
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pushed = useRef(false);

  // Tasto "indietro": aprendo aggiungiamo una voce alla cronologia (stesso indirizzo),
  // così "indietro" chiude la foto invece di uscire dalla pagina.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ ...(window.history.state ?? {}), photoViewer: true }, "");
    pushed.current = true;
    const onPop = () => {
      pushed.current = false;
      setOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back(); // il popstate chiuderà la foto
    }
    setOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("block cursor-zoom-in", className)}
        aria-label={`${t("photo_open")}: ${alt}`}
        data-testid="photo-open"
      >
        {children}
      </button>
      <Dialog.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/92 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup
            className="fixed inset-0 z-[61] outline-none transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
            data-testid="photo-viewer"
          >
            <Dialog.Title className="sr-only">{alt}</Dialog.Title>
            <ZoomStage src={src} alt={alt} light={light} onClose={close} />
            <button
              type="button"
              onClick={close}
              aria-label={t("photo_close")}
              className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 grid size-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md active:scale-95"
              data-testid="photo-close"
            >
              <X className="size-6" />
            </button>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

const MAX = 4;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** La foto a schermo intero con zoom a due dita, doppio tocco e trascinamento. */
function ZoomStage({ src, alt, light, onClose }: { src: string; alt: string; light: boolean; onClose: () => void }) {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const [anim, setAnim] = useState(false);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef({ s: 1, x: 0, y: 0, dist: 0, cx: 0, cy: 0 });
  const moved = useRef(false);
  const lastTap = useRef(0);

  const snapshot = () => {
    const p = [...pts.current.values()];
    const cx = p.reduce((a, q) => a + q.x, 0) / p.length;
    const cy = p.reduce((a, q) => a + q.y, 0) / p.length;
    const dist = p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
    start.current = { ...t, dist, cx, cy };
  };

  const onDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 1) moved.current = false;
    setAnim(false);
    snapshot();
  };

  const onMove = (e: PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = [...pts.current.values()];
    const st = start.current;
    const cx = p.reduce((a, q) => a + q.x, 0) / p.length;
    const cy = p.reduce((a, q) => a + q.y, 0) / p.length;
    if (Math.hypot(cx - st.cx, cy - st.cy) > 6) moved.current = true;
    if (p.length > 1 && st.dist > 0) {
      moved.current = true;
      const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const s = clamp((st.s * dist) / st.dist, 1, MAX);
      // mantiene fermo il punto tra le due dita
      const ox = st.cx - window.innerWidth / 2;
      const oy = st.cy - window.innerHeight / 2;
      const k = s / st.s;
      setT({ s, x: ox - (ox - st.x) * k + (cx - st.cx), y: oy - (oy - st.y) * k + (cy - st.cy) });
    } else if (st.s > 1) {
      setT({ s: st.s, x: st.x + cx - st.cx, y: st.y + cy - st.cy });
    }
  };

  const onUp = (e: PointerEvent) => {
    const wasTap = pts.current.size === 1 && !moved.current;
    pts.current.delete(e.pointerId);
    if (pts.current.size > 0) {
      snapshot();
      return;
    }
    setAnim(true);
    if (t.s <= 1.02) setT({ s: 1, x: 0, y: 0 });
    if (!wasTap) return;
    const now = Date.now();
    const onImage = (e.target as HTMLElement).tagName === "IMG";
    if (now - lastTap.current < 300) {
      // doppio tocco: ingrandisci lì dove hai toccato, oppure torna normale
      lastTap.current = 0;
      if (t.s > 1) setT({ s: 1, x: 0, y: 0 });
      else {
        const ox = e.clientX - window.innerWidth / 2;
        const oy = e.clientY - window.innerHeight / 2;
        setT({ s: 2.5, x: -ox * 1.5, y: -oy * 1.5 });
      }
      return;
    }
    lastTap.current = now;
    // un tocco sullo sfondo (fuori dalla foto, non ingrandita) chiude
    if (!onImage && t.s === 1) {
      const tapTime = now;
      setTimeout(() => lastTap.current === tapTime && onClose(), 300);
    }
  };

  return (
    <div
      className="absolute inset-0 grid touch-none place-items-center overflow-hidden select-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onWheel={(e) => {
        setAnim(false);
        setT((p) => {
          const s = clamp(p.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, MAX);
          return s === 1 ? { s: 1, x: 0, y: 0 } : { ...p, s };
        });
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn(
          "max-h-[100dvh] max-w-[100vw] object-contain will-change-transform",
          light ? "max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] rounded-xl bg-white p-4" : "p-3",
          anim && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.s})` }}
      />
    </div>
  );
}
