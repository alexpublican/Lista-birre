// Pagine pubbliche del menù: ingresso (Cosa bere / Cosa mangiare), hub "Cosa bere",
// elenco di un settore (cibo, vini, distillati, caffetteria) e scheda del singolo articolo.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Beer as BeerIcon,
  ChevronRight,
  Coffee,
  Leaf,
  Lock,
  Martini,
  Search,
  Sparkles,
  Star,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import HistoricHeader from "@/components/HistoricHeader";
import BrandMark from "@/components/BrandMark";
import VenueInfo from "@/components/VenueInfo";
import {
  SET,
  SETTORI_BERE,
  dayLabel,
  eur,
  findItem,
  hasSizes,
  isSettore,
  lavagnaOf,
  lavagnaLive,
  norm,
  useMenu,
  type MenuData,
  type SettoreKey,
  type Sezione,
  type Voce,
} from "@/lib/menu";
import "@/menu.css";

const ICON: Record<SettoreKey, LucideIcon> = { cibo: UtensilsCrossed, vini: Wine, distillati: Martini, bar: Coffee };
const Ic = ({ I }: { I: LucideIcon }) => <I className="i" aria-hidden />;

// Gruppi aperti nel menù cibo: restano aperti mentre si naviga avanti e indietro.
const openGroups = new Set<string>();

function Shell({ children, notes }: { children: ReactNode; notes?: string[] }) {
  return (
    <div className="min-h-screen">
      <HistoricHeader />
      <div className="mx">{children}</div>
      <MenuFooter notes={notes} />
    </div>
  );
}

function MenuFooter({ notes }: { notes?: string[] }) {
  return (
    <footer className="border-t border-[#2E241B] bg-[#181412]/80" data-testid="menu-footer">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="font-heading text-2xl font-semibold">Birreria Cassina</p>
        <div className="brass-rule mt-3 mb-6 w-20" />
        {notes && notes.length > 0 && (
          <div className="mb-8 grid gap-2.5 text-sm leading-relaxed text-[#B5A799]">
            {notes.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
          </div>
        )}
        <VenueInfo />
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-xs tracking-[0.15em] text-[#786C60] uppercase">Birreria storica</p>
          <Link
            to="/admin"
            aria-label="Area gestione"
            className="grid size-8 place-items-center rounded-full text-[#4A3F35] transition-colors duration-150 hover:text-[#B5A799]"
          >
            <Lock className="size-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}

function Loading({ menu }: { menu: ReturnType<typeof useMenu> }) {
  if (menu.isError)
    return <p className="mx-auto max-w-xl px-4 py-16 text-center text-[#B5A799]">Non riesco a caricare il menù. Riprova tra poco.</p>;
  return (
    <div className="mx-auto grid max-w-3xl gap-3 px-4 py-10">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-[#1C1713]" />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ ingresso
export function MenuIngresso() {
  const [params] = useSearchParams();
  // Vecchi link /?s=spina → pagina birre
  const s = params.get("s");
  if (s) return <Navigate to={`/birre?s=${encodeURIComponent(s)}`} replace />;

  return (
    <div className="min-h-screen">
      <div className="mx">
        <div className="entry">
          <div className="entry-top foam">
            <BrandMark className="mark" iconClassName="size-7" testId="entry-brand" />
            <p className="eyebrow">Birreria storica</p>
            <h1>Birreria Cassina</h1>
            <div className="brass-rule" />
            <p>Benvenuto! Cosa ti va oggi?</p>
          </div>
          <div className="halves">
            <Link className="half t-bere foam" style={{ animationDelay: "60ms" }} to="/bere" data-testid="entry-bere">
              <span className="bgart" />
              <span className="bgicon">
                <Ic I={BeerIcon} />
              </span>
              <span className="shade" />
              <span className="k">Birre · vini · distillati · caffè</span>
              <h2>
                Cosa <em>bere</em>
              </h2>
              <span className="go">
                Scegli da bere <Ic I={ArrowRight} />
              </span>
            </Link>
            <Link className="half t-mangiare foam" style={{ animationDelay: "140ms" }} to="/menu/cibo" data-testid="entry-mangiare">
              <span className="bgart" />
              <span className="bgicon">
                <Ic I={UtensilsCrossed} />
              </span>
              <span className="shade" />
              <span className="k">Cucina · panini · dolci</span>
              <h2>
                Cosa <em>mangiare</em>
              </h2>
              <span className="go">
                Scegli da mangiare <Ic I={ArrowRight} />
              </span>
            </Link>
          </div>
        </div>
      </div>
      <MenuFooter />
    </div>
  );
}

// ------------------------------------------------------------------ cosa bere
export function MenuBere() {
  const menu = useMenu();
  const m = menu.data;
  const door = (k: SettoreKey, i: number) => {
    const live = m ? m.settori[k].flatMap((s) => s.voci ?? []).filter((v) => v.disponibile !== false) : [];
    return (
      <Link key={k} className={`door foam t-${k}`} style={{ animationDelay: `${i * 70}ms` }} to={`/menu/${k}`} data-testid={`bere-${k}`}>
        <span className="bgart" />
        <span className="bgicon">
          <Ic I={ICON[k]} />
        </span>
        <span className="shade" />
        <span className="ic">
          <Ic I={ICON[k]} />
        </span>
        <h2>{SET[k].label}</h2>
        <p>{SET[k].sub}</p>
        <span className="prev">
          {live
            .slice(0, 3)
            .map((v) => v.nome)
            .join(" · ")}
          {live.length > 3 ? " …" : ""}
        </span>
        <span className="go">
          Apri <Ic I={ArrowRight} />
        </span>
      </Link>
    );
  };
  return (
    <Shell notes={m?.note_finali}>
      <main className="wrap" style={{ paddingBottom: 56 }}>
        <div className="crumbs" style={{ marginTop: 20 }}>
          <Link className="back" to="/">
            <Ic I={ArrowLeft} /> Inizio
          </Link>
          <Link className="c2" to="/menu/cibo">
            Vai a Cosa mangiare →
          </Link>
        </div>
        <section className="hero" style={{ paddingTop: 8 }}>
          <span className="mark">
            <Ic I={BeerIcon} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">Birreria Cassina</p>
            <h1>Cosa bere</h1>
            <p className="tag">Birre, vini, distillati, caffetteria e bibite</p>
          </div>
        </section>
        <Link className="door foam t-birre" to="/birre" style={{ minHeight: 200, marginBottom: 16, borderRadius: 16 }} data-testid="bere-birre">
          <span className="bgart" />
          <span className="bgicon" style={{ left: "auto", right: -10, top: -10, transform: "none" }}>
            <Ic I={BeerIcon} />
          </span>
          <span className="shade" />
          <span className="ic">
            <Ic I={BeerIcon} />
          </span>
          <h2>Birre</h2>
          <p>Spina · Frigo · Cantina</p>
          <span className="go">
            Apri la Lista Birre <Ic I={ArrowRight} />
          </span>
        </Link>
        <div className="doors" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          {SETTORI_BERE.map((k, i) => door(k, i + 1))}
        </div>
      </main>
    </Shell>
  );
}

// ------------------------------------------------------------------ pezzi comuni
function Tags({ v }: { v: Voce }) {
  return (
    <>
      {v.evidenza && <span className="tagp tg-ev">In evidenza</span>}
      {v.novita && <span className="tagp tg-new">Novità</span>}
      {v.vegano && <span className="tagp tg-veg">Vegano</span>}
      {v.piccante && <span className="tagp tg-hot">Piccante</span>}
      {v.disponibile === false && <span className="tagp tg-out">Esaurito</span>}
    </>
  );
}

function Price({ v }: { v: Voce }) {
  if (hasSizes(v))
    return (
      <span className="sizes">
        {v.calice != null && (
          <span>
            <small>Calice</small>
            <b>{eur(v.calice)}</b>
          </span>
        )}
        {v.bottiglia != null && (
          <span>
            <small>Bottiglia</small>
            <b>{eur(v.bottiglia)}</b>
          </span>
        )}
      </span>
    );
  return v.prezzo != null ? <span className="price">{eur(v.prezzo)}</span> : null;
}

function Row({ k, v, i, group }: { k: SettoreKey; v: Voce; i: number; group: string }) {
  const sub = [v.cantina, v.descrizione].filter(Boolean).join(" · ");
  return (
    <Link
      className={`row foam t-${k}${v.disponibile === false ? " out" : ""}`}
      style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
      to={`/menu/${k}/${encodeURIComponent(v.id)}`}
      state={{ group }}
    >
      <span className="sw" />
      <span className="mid">
        <span className="nm">{v.nome}</span>
        {sub && <span className="sub">{sub}</span>}
        <span className="tags">
          <Tags v={v} />
        </span>
      </span>
      <span className="rt">
        <Price v={v} />
        <span className="open">
          Scheda <Ic I={ChevronRight} />
        </span>
      </span>
    </Link>
  );
}

function TextBox({ s }: { s: Sezione }) {
  const veg = /vegan/i.test(s.titolo);
  return (
    <div className={`dbox${veg ? " vegan" : ""}`}>
      <h3>
        <Ic I={veg ? Leaf : Sparkles} /> {s.titolo.replace(/:$/, "")}
      </h3>
      <p>{s.testo}</p>
    </div>
  );
}

function Lavagna({ m }: { m: MenuData }) {
  const l = lavagnaOf(m);
  const vs = lavagnaLive(m);
  if (!l || !vs.length) return null;
  return (
    <section className="board foam" id={`g-${l.id}`} data-testid="lavagna">
      <div className="slate">
        <div className="bh">
          <small>{dayLabel(l.aggiornata) || "Oggi alla lavagna"}</small>
          <h2>
            Speciali <span>del giorno</span>
          </h2>
          <div className="chalk-line" />
          {l.nota && <p>{l.nota}</p>}
        </div>
        {vs.map((v) => (
          <Link key={v.id} className="sp" to={`/menu/cibo/${encodeURIComponent(v.id)}`} state={{ group: l.id }}>
            <span style={{ minWidth: 0 }}>
              <span className="sn">{v.nome}</span>
              {v.descrizione && <span className="sd">{v.descrizione}</span>}
              <span className="sx">Scheda ›</span>
            </span>
            <span className="spr">{eur(v.prezzo)}</span>
          </Link>
        ))}
        <div className="bf">Chiedi al personale · fino a esaurimento</div>
        <span className="chalk" />
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ elenco di un settore
export function MenuSettore() {
  const { settore } = useParams();
  const location = useLocation();
  const menu = useMenu();
  const [q, setQ] = useState("");
  const [, setTick] = useState(0);
  const k = isSettore(settore) ? settore : null;

  useEffect(() => setQ(""), [k]);
  // Arrivo da una scheda: riapro e mostro il gruppo da cui si era partiti.
  const fromGroup = (location.state as { group?: string } | null)?.group;
  useEffect(() => {
    if (!fromGroup || !menu.data) return;
    openGroups.add(fromGroup);
    setTick((t) => t + 1);
    const t = setTimeout(() => document.getElementById(`g-${fromGroup}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(t);
  }, [fromGroup, menu.data]);

  if (!k) return <Navigate to="/" replace />;
  const m = menu.data;
  const needle = norm(q.trim());
  const acc = k === "cibo";

  const toggle = (id: string) => {
    if (openGroups.has(id)) openGroups.delete(id);
    else {
      openGroups.add(id);
      setTimeout(() => {
        const el = document.getElementById(`g-${id}`);
        const r = el?.getBoundingClientRect();
        if (el && r && (r.top < 140 || r.top > window.innerHeight * 0.6)) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 20);
    }
    setTick((t) => t + 1);
  };
  const jump = (id: string) => {
    if (acc) openGroups.add(id);
    setTick((t) => t + 1);
    setTimeout(() => document.getElementById(`g-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  };

  let idx = 0;
  let found = 0;
  const groups = m
    ? m.settori[k].map((s) => {
        if (s.lavagna && !needle) return null;
        if (!s.voci) return needle ? null : <section key={s.id} className="group" id={`g-${s.id}`}><TextBox s={s} /></section>;
        const vs = s.voci.filter((v) => !needle || norm([v.nome, v.descrizione, v.cantina, v.abbinamento, s.titolo].join(" ")).includes(needle));
        if (!vs.length) return null;
        found += vs.length;
        const rows = vs.map((v) => <Row key={v.id} k={k} v={v} i={idx++} group={s.id} />);
        if (acc) {
          const open = !!needle || openGroups.has(s.id);
          const prev = vs.slice(0, 3).map((v) => v.nome).join(" · ") + (vs.length > 3 ? " …" : "");
          return (
            <section key={s.id} className={`accg${open ? " is-open" : ""}`} id={`g-${s.id}`}>
              <button type="button" className="acch" onClick={() => toggle(s.id)} aria-expanded={open}>
                <span className="tx">
                  <h2>{s.lavagna ? "Speciali del giorno" : s.titolo}</h2>
                  <small>{prev}</small>
                </span>
                <ChevronRight className="i chev" aria-hidden />
              </button>
              <div className="accb">
                <div className="rows">{rows}</div>
                {s.nota && <p className="secnote">{s.nota}</p>}
              </div>
            </section>
          );
        }
        return (
          <section key={s.id} className="group" id={`g-${s.id}`}>
            <div className="ghead">
              <h2>{s.titolo}</h2>
            </div>
            <div className="rows">{rows}</div>
            {s.nota && <p className="secnote">{s.nota}</p>}
          </section>
        );
      })
    : [];

  const S = SET[k];
  const SIcon = ICON[k];
  return (
    <Shell notes={m?.note_finali}>
      <div className={`secbar t-${k}`}>
        <div className="wrap">
          <div className="r1">
            <Link className="back" to={k === "cibo" ? "/" : "/bere"}>
              <Ic I={ArrowLeft} /> {k === "cibo" ? "Inizio" : "Cosa bere"}
            </Link>
            <nav className="tabs">
              {k === "cibo" ? (
                <>
                  <span className="tab t-cibo on">Cosa mangiare</span>
                  <Link className="tab t-bere" to="/bere">
                    Cosa bere →
                  </Link>
                </>
              ) : (
                <>
                  <Link className="tab t-birre" to="/birre">
                    Birre
                  </Link>
                  {SETTORI_BERE.map((x) => (
                    <Link key={x} className={`tab t-${x}${x === k ? " on" : ""}`} to={`/menu/${x}`}>
                      {SET[x].short || SET[x].label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
          <div className="chips">
            <div className="searchbox">
              <Search className="i" aria-hidden />
              <input type="search" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca" />
            </div>
            {m?.settori[k]
              .filter((s) => s.voci && s.voci.length && !s.lavagna)
              .map((s) => (
                <button key={s.id} type="button" className="jump" onClick={() => jump(s.id)}>
                  {s.titolo}
                </button>
              ))}
          </div>
        </div>
      </div>
      <main className={`wrap t-${k}`}>
        <div className="banner">
          <span className="bgart" />
          <span className="bgicon">
            <Ic I={SIcon} />
          </span>
          <div className="in">
            <div>
              <h1>{S.label}</h1>
              <p>{S.sub}</p>
            </div>
          </div>
        </div>
        {!m ? (
          <Loading menu={menu} />
        ) : (
          <div className={`groups${acc ? " acc" : ""}`}>
            {acc && !needle && <Lavagna m={m} />}
            {acc && !needle && (
              <div className="acc-tools">
                <button
                  type="button"
                  onClick={() => {
                    m.settori.cibo.forEach((s) => openGroups.add(s.id));
                    setTick((t) => t + 1);
                  }}
                >
                  Apri tutti
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openGroups.clear();
                    setTick((t) => t + 1);
                  }}
                >
                  Chiudi tutti
                </button>
              </div>
            )}
            {groups}
          </div>
        )}
        {m && found === 0 && needle && <p className="empty">Nessun risultato.</p>}
        {m && found === 0 && !needle && m.settori[k].every((s) => !s.voci?.length) && <p className="empty">Menù in aggiornamento.</p>}
      </main>
    </Shell>
  );
}

// ------------------------------------------------------------------ scheda articolo
export function MenuVoce() {
  const { settore, id } = useParams();
  const menu = useMenu();
  const m = menu.data;
  const x = useMemo(() => (m && id ? findItem(m, id) : undefined), [m, id]);
  useEffect(() => window.scrollTo(0, 0), [id]);

  if (!isSettore(settore)) return <Navigate to="/" replace />;
  if (!m) return <Shell><Loading menu={menu} /></Shell>;
  if (!x) return <Navigate to={`/menu/${settore}`} replace />;
  const { k, s, v } = x;
  const others = (s.voci ?? []).filter((o) => o.id !== v.id && o.disponibile !== false);
  const pairing = v.abbinamento ? v.abbinamento.charAt(0).toUpperCase() + v.abbinamento.slice(1) : "";
  return (
    <Shell notes={m.note_finali}>
      <main className={`itemwrap t-${k}`}>
        <div className="crumbs">
          <Link className="back" to={`/menu/${k}`} state={{ group: s.id }}>
            <Ic I={ArrowLeft} /> {SET[k].short || SET[k].label}
          </Link>
          <Link className="c2" to={`/menu/${k}`} state={{ group: s.id }}>
            {s.lavagna ? "Speciali del giorno" : s.titolo}
          </Link>
        </div>
        <article className={`card foam${v.disponibile === false ? " out" : ""}`} data-testid="menu-item-card">
          {v.evidenza && (
            <span className="badge-ev">
              <Star className="i" aria-hidden /> In evidenza
            </span>
          )}
          {v.cantina && <p className="cant">{v.cantina}</p>}
          <div className="top">
            <h1>{v.nome}</h1>
            {!hasSizes(v) && <Price v={v} />}
          </div>
          <div className="pills">
            <span className="pill-loc">{SET[k].short || SET[k].label}</span>
            {s.lavagna ? <span className="lav-pill">Speciale del giorno</span> : <span className="pill-sec">{s.titolo}</span>}
            <Tags v={v} />
          </div>
          {v.descrizione && <p className="desc">{v.descrizione}</p>}
          {hasSizes(v) && (
            <div className="sizes-big">
              {v.calice != null && (
                <div>
                  <small>Calice</small>
                  <b>{eur(v.calice)}</b>
                </div>
              )}
              {v.bottiglia != null && (
                <div>
                  <small>Bottiglia</small>
                  <b>{eur(v.bottiglia)}</b>
                </div>
              )}
            </div>
          )}
          {pairing && (
            <div className="pairing">
              <p className="lab">
                <BeerIcon className="i" aria-hidden /> Abbinaci
              </p>
              <p className="val">{pairing}</p>
            </div>
          )}
          {v.nota && <p className="inote">{v.nota}</p>}
          {v.allergeni && (
            <p className="allerg">
              <b>Allergeni:</b> {v.allergeni}
            </p>
          )}
        </article>
        {others.length > 0 && (
          <section className="others">
            <h2>Altro in “{s.lavagna ? "Speciali del giorno" : s.titolo}”</h2>
            <div className="rows" style={{ gridTemplateColumns: "1fr" }}>
              {others.slice(0, 6).map((o, i) => (
                <Row key={o.id} k={k} v={o} i={i} group={s.id} />
              ))}
            </div>
          </section>
        )}
      </main>
    </Shell>
  );
}
