// Navigazione "indietro" uguale su iPhone e Android.
//
// - <NavMemory/> (montato una volta in App) ricorda per ogni pagina della cronologia
//   l'indirizzo e la posizione di scorrimento, e la rimette quando si torna indietro
//   (col tasto del menù o con quello del telefono). Lo scorrimento lo gestiamo noi:
//   quello automatico del browser su Android arriva prima che la pagina sia disegnata
//   e la lascia bloccata/a metà.
// - <BackLink/> è il pulsante "indietro" del menù: se la pagina precedente è proprio
//   quella a cui porta, fa un vero "indietro" (come il tasto del telefono) invece di
//   aggiungere una pagina nuova alla cronologia. Così il tasto indietro di Android non
//   rimbalza più avanti e indietro tra le stesse due pagine.
import { useLayoutEffect, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom";

const TRAIL = "nav-trail"; // posizione nella cronologia → indirizzo
const SCROLL = "nav-scroll"; // pagina della cronologia → posizione di scorrimento

function load(name: string): Record<string, string | number> {
  try {
    return JSON.parse(sessionStorage.getItem(name) || "{}");
  } catch {
    return {};
  }
}
function save(name: string, data: Record<string, string | number>) {
  try {
    const keys = Object.keys(data);
    // teniamo solo le ultime 60 voci
    for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete data[k];
    sessionStorage.setItem(name, JSON.stringify(data));
  } catch {
    /* navigazione privata o memoria piena: pazienza */
  }
}

const historyIdx = (): number | null => {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" ? idx : null;
};

/** Indirizzo della pagina precedente nella cronologia (se è del nostro sito). */
export function previousPath(): string | null {
  const idx = historyIdx();
  if (idx == null || idx < 1) return null;
  const p = load(TRAIL)[String(idx - 1)];
  return typeof p === "string" ? p : null;
}

export function NavMemory() {
  const { key, pathname, search } = useLocation();
  const type = useNavigationType();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    const idx = historyIdx();
    if (idx != null) {
      const trail = load(TRAIL);
      trail[String(idx)] = pathname + search;
      save(TRAIL, trail);
    }

    // Posizione: tornando indietro/avanti rimettiamo quella salvata, altrimenti si parte dall'alto.
    let raf = 0;
    let stop = false;
    const cancel = () => {
      stop = true;
      cancelAnimationFrame(raf);
    };
    if (type === "POP") {
      const y = Number(load(SCROLL)[key]) || 0;
      // La pagina potrebbe non essere ancora alta abbastanza (foto, dati): riprovo per ~1,5 s.
      let tries = 0;
      const attempt = () => {
        if (stop) return;
        window.scrollTo(0, y);
        if (Math.abs(window.scrollY - y) > 2 && ++tries < 90) raf = requestAnimationFrame(attempt);
      };
      attempt();
      // se il cliente tocca lo schermo smetto subito, così non "combatto" con il suo dito
      window.addEventListener("touchstart", cancel, { passive: true, once: true });
      window.addEventListener("wheel", cancel, { passive: true, once: true });
    } else {
      window.scrollTo(0, 0);
    }

    let last = window.scrollY;
    const onScroll = () => {
      last = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancel();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("wheel", cancel);
      const pos = load(SCROLL);
      delete pos[key];
      pos[key] = last;
      save(SCROLL, pos);
    };
  }, [key, pathname, search, type]);

  return null;
}

export function BackLink({
  to,
  state,
  className,
  children,
}: {
  to: string;
  state?: unknown;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (previousPath() === to) {
      e.preventDefault();
      navigate(-1);
    }
  };
  return (
    <Link to={to} state={state} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
