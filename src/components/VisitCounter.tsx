// Contatore visite in prima pagina (tra «Il locale» e i contatti).
// Ogni browser conta una sola visita per sessione: tornando alla prima pagina
// dal menù non si conta di nuovo. Senza internet il riquadro non compare.
import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useI18n, type TKey } from "@/lib/i18n";

type Visite = { oggi: number; mese: number; anno: number; totale: number };

const SESSION_KEY = "cassina_visita";
let pending: Promise<Visite> | null = null;

function loadVisite(): Promise<Visite> {
  if (pending) return pending;
  let counted = false;
  try {
    counted = sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    /* navigazione privata: si conta comunque */
  }
  const p = (counted ? apiGet<Visite>("/visite") : apiPost<Visite>("/visite")).then((v: Visite) => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignora */
    }
    return v;
  });
  p.catch(() => {
    pending = null;
  });
  pending = p;
  return p;
}

/** Numero che "sale" fino al valore finale quando il riquadro entra in vista. */
function CountUp({ value, start, fmt }: { value: number; start: boolean; fmt: Intl.NumberFormat }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const dur = 1100;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, start]);
  return <>{fmt.format(shown)}</>;
}

const ITEMS: [keyof Visite, TKey][] = [
  ["oggi", "vis_today"],
  ["mese", "vis_month"],
  ["anno", "vis_year"],
  ["totale", "vis_total"],
];

export default function VisitCounter() {
  const { t, lang } = useI18n();
  const [v, setV] = useState<Visite | null>(null);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadVisite()
      .then((d) => alive && setV(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !v) return;
    if (!("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [v]);

  if (!v) return null;
  const fmt = new Intl.NumberFormat(lang === "en" ? "en-GB" : lang);

  return (
    <div className="vis-wrap">
      <section className="vis foam" ref={ref} aria-label={t("vis_label")} data-testid="visit-counter">
        <p className="vis-k">
          <Eye className="i" aria-hidden /> {t("vis_kicker")}
        </p>
        <div className="vis-grid">
          {ITEMS.map(([k, label]) => (
            <div key={k} className={`vis-cell${k === "totale" ? " tot" : ""}`}>
              <span className="vis-n">
                <CountUp value={v[k]} start={seen} fmt={fmt} />
              </span>
              <span className="vis-l">{t(label)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
