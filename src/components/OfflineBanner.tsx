import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Striscia "Senza connessione": compare quando il telefono non ha internet o quando la copia
 * offline (public/sw.js) ha dovuto usare il menù salvato. Sparisce appena i dati tornano freschi.
 */
export default function OfflineBanner() {
  const { t, lang } = useI18n();
  // null = tutto ok; "" = offline senza data; altrimenti la data della copia salvata
  const [state, setState] = useState<string | null>(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "" : null,
  );

  useEffect(() => {
    const off = () => setState((s) => s ?? "");
    const on = () => setState(null);
    const msg = (e: MessageEvent) => {
      const d = e.data as { type?: string; at?: string | null } | null;
      if (d?.type === "offline-copy") setState(d.at || "");
      else if (d?.type === "online") setState(null);
    };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    navigator.serviceWorker?.addEventListener("message", msg);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
      navigator.serviceWorker?.removeEventListener("message", msg);
    };
  }, []);

  if (state === null) return null;

  let when = "";
  if (state) {
    const d = new Date(state);
    if (!Number.isNaN(d.getTime()))
      when = d.toLocaleString(lang === "en" ? "en-GB" : lang, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 border-t border-[#B45309]/50 bg-[#2A1E12]/95 px-3 py-2 text-center text-xs text-[#FCD34D] backdrop-blur print:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      data-testid="offline-banner"
    >
      <WifiOff className="size-3.5 shrink-0" />
      <span>
        {t("offline")}
        {when && <span className="text-[#E7D9CC]"> · {t("offline_at")} {when}</span>}
      </span>
    </div>
  );
}
