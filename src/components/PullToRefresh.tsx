import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";

// "Tira giù per aggiornare".
// Nel browser normale (Safari, Chrome) il gesto esiste già, quindi qui si attiva
// solo quando il sito è installato come app (modalità standalone), dove manca.
const THRESHOLD = 70; // px da trascinare per far partire il refresh
const MAX_PULL = 110;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    if (!isStandalone()) return;

    const onStart = (e: TouchEvent) => {
      const target = e.target as Element | null;
      // niente gesto dentro finestre/popup che scorrono per conto loro
      if (window.scrollY > 0 || target?.closest('[role="dialog"]')) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // effetto "elastico": più tiri, più fa resistenza
      const value = Math.min(MAX_PULL, dy * 0.5);
      pullRef.current = value;
      setPull(value);
    };

    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        setTimeout(() => window.location.reload(), 250);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (pull === 0 && !refreshing) return null;

  const ready = pull >= THRESHOLD;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        zIndex: 9999,
        pointerEvents: "none",
        transform: `translate(-50%, ${pull - 44 + 16}px)`,
        transition: startY.current === null ? "transform 0.2s ease" : "none",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "rgba(20, 16, 14, 0.92)",
          border: "1px solid rgba(232, 197, 92, 0.6)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
          color: "#E8C55C",
          opacity: Math.min(1, pull / THRESHOLD),
        }}
      >
        <RotateCw
          size={20}
          className={refreshing ? "animate-spin" : undefined}
          style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)`, opacity: ready ? 1 : 0.7 }}
        />
      </div>
    </div>
  );
}
