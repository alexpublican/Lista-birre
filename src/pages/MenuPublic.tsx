// Pagine pubbliche del menù: ingresso (Cosa bere / Cosa mangiare), hub "Cosa bere",
// elenco di un settore (cibo, vini, distillati, caffetteria) e scheda del singolo articolo.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Beer as BeerIcon,
  ChevronDown,
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
import PhotoViewer from "@/components/PhotoViewer";
import {
  SET,
  SETTORI_BERE,
  allergeniOf,
  dayLabel,
  eur,
  findItem,
  fotoUrl,
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

// Foto di sfondo delle schede (stesso stile delle porte Spina/Frigo/Cantina della Lista Birre).
const unsplash = (id: string, w = 1000) => `https://images.unsplash.com/${id}?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=75&w=${w}`;
const PHOTO = {
  bere: unsplash("photo-1567696911980-2eed69a46042", 1400),
  birre: unsplash("photo-1546622891-02c72c1537b6", 1400),
  cibo: unsplash("photo-1762806883627-4bcbfad98a2c", 1400),
  vini: unsplash("photo-1624216503641-ab4a72cada46"),
  distillati: unsplash("photo-1760982192590-de2b005bb4d5"),
  bar: unsplash("photo-1640735099606-8181a8c8f5a7"),
} satisfies Record<SettoreKey | "bere" | "birre", string>;
const Photo = ({ src }: { src: string }) => <img className="bgphoto" src={src} alt="" decoding="async" />;

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
              <Photo src={PHOTO.bere} />
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
              <Photo src={PHOTO.cibo} />
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
        <Photo src={PHOTO[k]} />
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
          <Photo src={PHOTO.birre} />
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
// Simboli compatti per l'elenco: fogliolina (vegetariano) e peperoncino (piccante).
const VegIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M5 19C5 10.5 10 5.5 19.5 4.5 19.5 14 14.5 19 5 19Z" fill="currentColor" />
    <path d="M5 19 13.5 10.5" fill="none" stroke="#14210A" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const HotIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M15.6 8.2C13 6.9 9.6 7.7 8.2 10.6 6.6 14 6.2 17.4 3.2 20.6c4.6.6 9.2-1.4 11.6-5 1.8-2.6 2.2-5 .8-7.4Z" fill="currentColor" />
    <path d="M15.6 8.2c.2-1.9 1.3-3.2 3.2-3.8M13.2 7.6c1.2-.9 2.9-1 4.3-.1" fill="none" stroke="#86C25A" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

function Tags({ v, icons }: { v: Voce; icons?: boolean }) {
  return (
    <>
      {v.evidenza && <span className="tagp tg-ev">In evidenza</span>}
      {v.novita && <span className="tagp tg-new">Novità</span>}
      {v.vegano &&
        (icons ? (
          <span className="tgi tg-veg" title="Vegetariano" aria-label="Vegetariano" role="img">
            <VegIcon />
          </span>
        ) : (
          <span className="tagp tg-veg">Vegetariano</span>
        ))}
      {v.piccante &&
        (icons ? (
          <span className="tgi tg-hot" title="Piccante" aria-label="Piccante" role="img">
            <HotIcon />
          </span>
        ) : (
          <span className="tagp tg-hot">Piccante</span>
        ))}
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
      {fotoUrl(v) ? (
        <span className="logo">
          <img src={fotoUrl(v)!} alt="" loading="lazy" decoding="async" />
        </span>
      ) : (
        <span className="sw" />
      )}
      <span className="mid">
        <span className="nm">{v.nome}</span>
        {sub && <span className="sub">{sub}</span>}
        <span className="tags">
          <Tags v={v} icons />
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
  const veg = /vegan|vegetar/i.test(s.titolo);
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
          <Photo src={PHOTO[k]} />
          <span className="shade" />
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

// ------------------------------------------------------------------ allergeni (nascosti dietro un pulsante discreto)
function Allergeni({ v }: { v: Voce }) {
  const [open, setOpen] = useState(false);
  const list = allergeniOf(v);
  const pid = `allerg-${v.id}`;
  return (
    <div className={`alg${open ? " is-open" : ""}`}>
      <button type="button" className="alg-btn" aria-expanded={open} aria-controls={pid} onClick={() => setOpen((o) => !o)}>
        <span className="alg-dot" aria-hidden>
          i
        </span>
        <span className="alg-lab">Allergeni</span>
        <ChevronDown className="i alg-chev" aria-hidden />
      </button>
      <div className="alg-wrap" id={pid} role="region" aria-label="Allergeni" inert={!open}>
        <div className="alg-in">
          {list.length > 0 ? (
            <>
              <p className="alg-t">Questo piatto contiene</p>
              <ul className="alg-list">
                {list.map((a) => (
                  <li key={a.k}>
                    <span className="alg-n">{a.n}</span>
                    <span>
                      {a.it}
                      <small>{a.en}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : v.senza_allergeni ? (
            <p className="alg-t">Non contiene nessuno dei 14 allergeni previsti dalla normativa</p>
          ) : (
            !v.allergeni && <p className="alg-t">Chiedi pure al nostro personale</p>
          )}
          {v.allergeni && <p className="alg-note">{v.allergeni.charAt(0).toUpperCase() + v.allergeni.slice(1)}</p>}
          <p className="alg-foot">
            Per allergie o intolleranze rivolgiti al personale: ti indicheremo ingredienti e possibili contaminazioni in cucina.
            <small>Allergies or intolerances? Please ask our staff.</small>
          </p>
        </div>
      </div>
    </div>
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
          {fotoUrl(v) && (
            <div className="logo-big">
              <PhotoViewer src={fotoUrl(v)!} alt={v.cantina || v.nome} light className="logo-zoom">
                <img src={fotoUrl(v)!} alt={v.cantina || v.nome} decoding="async" />
              </PhotoViewer>
            </div>
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
          {(k === "cibo" || allergeniOf(v).length > 0 || v.senza_allergeni || v.allergeni) && <Allergeni v={v} />}
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
