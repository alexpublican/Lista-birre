// Pagine pubbliche del menù: ingresso (Cosa bere / Cosa mangiare), hub "Cosa bere",
// elenco di un settore (cibo, vini, distillati, caffetteria) e scheda del singolo articolo.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigationType, useParams, useSearchParams } from "react-router-dom";
import { BackLink } from "@/lib/nav";
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
import Galleria from "@/components/Galleria";
import { fotoLocaleUrl, useLocale } from "@/lib/locale";
import {
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
  noteText,
  trText,
  useMenu,
  type MenuData,
  type SettoreKey,
  type Sezione,
  type Voce,
} from "@/lib/menu";
import { useI18n, type Lang, type TKey } from "@/lib/i18n";
import "@/menu.css";

const ICON: Record<SettoreKey, LucideIcon> = { cibo: UtensilsCrossed, vini: Wine, distillati: Martini, bar: Coffee };
const Ic = ({ I }: { I: LucideIcon }) => <I className="i" aria-hidden />;

// Nomi dei reparti nella lingua scelta (in gestione restano quelli italiani di SET).
type T = (key: TKey) => string;
const setLabel = (t: T, k: SettoreKey) => t(`m_${k}` as TKey);
const setShort = (t: T, k: SettoreKey) => t((k === "cibo" || k === "bar" ? `m_${k}_short` : `m_${k}`) as TKey);
const setSub = (t: T, k: SettoreKey) => t(`m_${k}_sub` as TKey);
/** Titolo di una sezione (la lavagna ha un titolo fisso tradotto). */
const secTitle = (t: T, s: Sezione, lang: Lang) => (s.lavagna ? t("m_specials") : trText(s, "titolo", lang));
const cap = (x: string) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : "");

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

function Shell({ children, m }: { children: ReactNode; m?: MenuData }) {
  return (
    <div className="min-h-screen">
      <HistoricHeader />
      <div className="mx">{children}</div>
      <MenuFooter m={m} />
    </div>
  );
}

function MenuFooter({ m }: { m?: MenuData }) {
  const { t, lang } = useI18n();
  const notes = m?.note_finali?.map((n) => noteText(m, n, lang));
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
          <p className="text-xs tracking-[0.15em] text-[#786C60] uppercase">{t("since")}</p>
          <Link
            to="/admin"
            aria-label={t("staff")}
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
  const { t } = useI18n();
  if (menu.isError) return <p className="mx-auto max-w-xl px-4 py-16 text-center text-[#B5A799]">{t("m_load_error")}</p>;
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
  const { t } = useI18n();
  const [params] = useSearchParams();
  const locale = useLocale();
  const coverFoto = locale.data?.foto[0];
  // Vecchi link /?s=spina → pagina birre
  const s = params.get("s");
  if (s) return <Navigate to={`/birre?s=${encodeURIComponent(s)}`} replace />;

  return (
    <div className="min-h-screen">
      <div className="mx">
        <div className="entry">
          <div className="entry-top foam">
            <BrandMark className="mark" iconClassName="size-7" testId="entry-brand" />
            <p className="eyebrow">{t("since")}</p>
            <h1>Birreria Cassina</h1>
            <div className="brass-rule" />
            <p>{t("m_welcome")}</p>
          </div>
          <div className="halves">
            <Link className="half t-bere foam" style={{ animationDelay: "60ms" }} to="/bere" data-testid="entry-bere">
              <span className="bgart" />
              <Photo src={PHOTO.bere} />
              <span className="shade" />
              <span className="k">{t("m_drink_kicker")}</span>
              <h2>
                {t("m_what")} <em>{t("m_drink_word")}</em>
              </h2>
              <span className="go">
                {t("m_choose_drink")} <Ic I={ArrowRight} />
              </span>
            </Link>
            <Link className="half t-mangiare foam" style={{ animationDelay: "140ms" }} to="/menu/cibo" data-testid="entry-mangiare">
              <span className="bgart" />
              <Photo src={PHOTO.cibo} />
              <span className="shade" />
              <span className="k">{t("m_food_kicker")}</span>
              <h2>
                {t("m_what")} <em>{t("m_eat_word")}</em>
              </h2>
              <span className="go">
                {t("m_choose_food")} <Ic I={ArrowRight} />
              </span>
            </Link>
          </div>
          <div className="loc-wrap">
            <Link className="loc-btn t-locale foam" style={{ animationDelay: "220ms" }} to="/locale" data-testid="entry-locale">
              <span className="bgart" />
              {coverFoto && <Photo src={fotoLocaleUrl(coverFoto)} />}
              <span className="shade" />
              <span>
                <span className="k">{t("loc_kicker")}</span>
                <h2>
                  {t("loc_a")} <em>{t("loc_b")}</em>
                </h2>
              </span>
              <span className="go" aria-hidden>
                <Ic I={ArrowRight} />
              </span>
            </Link>
          </div>
        </div>
      </div>
      <MenuFooter />
    </div>
  );
}

// ------------------------------------------------------------------ il locale
export function MenuLocale() {
  const { t } = useI18n();
  const locale = useLocale();
  const foto = locale.data?.foto ?? [];
  return (
    <Shell>
      <div className="loc-page t-locale">
        <BackLink className="back" to="/">
          <Ic I={ArrowLeft} /> {t("m_home")}
        </BackLink>
        <header className="loc-head foam">
          <p className="eyebrow">{t("loc_kicker")}</p>
          <h1>
            {t("loc_a")} <em>{t("loc_b")}</em>
          </h1>
          <div className="brass-rule" />
          <p>{t("loc_sub")}</p>
        </header>
        <div className="foam" style={{ animationDelay: "120ms" }}>
          {locale.isLoading ? (
            <div className="loc-empty animate-pulse" />
          ) : foto.length ? (
            <Galleria foto={foto} />
          ) : (
            <div className="loc-empty">{t("loc_empty")}</div>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ------------------------------------------------------------------ cosa bere
export function MenuBere() {
  const { t, lang } = useI18n();
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
        <h2>{setLabel(t, k)}</h2>
        <p>{setSub(t, k)}</p>
        <span className="prev">
          {live
            .slice(0, 3)
            .map((v) => trText(v, "nome", lang))
            .join(" · ")}
          {live.length > 3 ? " …" : ""}
        </span>
        <span className="go">
          {t("m_open")} <Ic I={ArrowRight} />
        </span>
      </Link>
    );
  };
  return (
    <Shell m={m}>
      <main className="wrap" style={{ paddingBottom: 56 }}>
        <div className="crumbs" style={{ marginTop: 20 }}>
          <BackLink className="back" to="/">
            <Ic I={ArrowLeft} /> {t("m_home")}
          </BackLink>
          <Link className="c2" to="/menu/cibo">
            {t("m_go_food")}
          </Link>
        </div>
        <section className="hero" style={{ paddingTop: 8 }}>
          <span className="mark">
            <Ic I={BeerIcon} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">Birreria Cassina</p>
            <h1>{t("m_drink")}</h1>
            <p className="tag">{t("m_drink_sub")}</p>
          </div>
        </section>
        <Link className="door foam t-birre" to="/birre" style={{ minHeight: 200, marginBottom: 16, borderRadius: 16 }} data-testid="bere-birre">
          <span className="bgart" />
          <Photo src={PHOTO.birre} />
          <span className="shade" />
          <span className="ic">
            <Ic I={BeerIcon} />
          </span>
          <h2>{t("m_beers")}</h2>
          <p>{t("m_beers_sub")}</p>
          <span className="go">
            {t("m_open_beers")} <Ic I={ArrowRight} />
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
  const { t } = useI18n();
  return (
    <>
      {v.evidenza && <span className="tagp tg-ev">{t("m_featured")}</span>}
      {v.novita && <span className="tagp tg-new">{t("m_new")}</span>}
      {v.vegano &&
        (icons ? (
          <span className="tgi tg-veg" title={t("m_veg")} aria-label={t("m_veg")} role="img">
            <VegIcon />
          </span>
        ) : (
          <span className="tagp tg-veg">{t("m_veg")}</span>
        ))}
      {v.piccante &&
        (icons ? (
          <span className="tgi tg-hot" title={t("m_hot")} aria-label={t("m_hot")} role="img">
            <HotIcon />
          </span>
        ) : (
          <span className="tagp tg-hot">{t("m_hot")}</span>
        ))}
      {v.disponibile === false && <span className="tagp tg-out">{t("m_out")}</span>}
    </>
  );
}

function Price({ v }: { v: Voce }) {
  const { t } = useI18n();
  if (hasSizes(v))
    return (
      <span className="sizes">
        {v.calice != null && (
          <span>
            <small>{t("m_glass")}</small>
            <b>{eur(v.calice)}</b>
          </span>
        )}
        {v.bottiglia != null && (
          <span>
            <small>{t("m_bottle")}</small>
            <b>{eur(v.bottiglia)}</b>
          </span>
        )}
      </span>
    );
  return v.prezzo != null ? <span className="price">{eur(v.prezzo)}</span> : null;
}

function Row({ k, v, i, group }: { k: SettoreKey; v: Voce; i: number; group: string }) {
  const { t, lang } = useI18n();
  const nome = trText(v, "nome", lang);
  const sub = [v.cantina, trText(v, "descrizione", lang)].filter(Boolean).join(" · ");
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
        <span className="nm">{nome}</span>
        {nome !== v.nome && <span className="nm-tr">{v.nome}</span>}
        {sub && <span className="sub">{sub}</span>}
        <span className="tags">
          <Tags v={v} icons />
        </span>
      </span>
      <span className="rt">
        <Price v={v} />
        <span className="open">
          {t("m_details")} <Ic I={ChevronRight} />
        </span>
      </span>
    </Link>
  );
}

function TextBox({ s }: { s: Sezione }) {
  const { lang } = useI18n();
  const veg = /vegan|vegetar/i.test(s.titolo);
  return (
    <div className={`dbox${veg ? " vegan" : ""}`}>
      <h3>
        <Ic I={veg ? Leaf : Sparkles} /> {trText(s, "titolo", lang).replace(/:$/, "")}
      </h3>
      <p>{trText(s, "testo", lang)}</p>
    </div>
  );
}

function Lavagna({ m }: { m: MenuData }) {
  const { t, lang } = useI18n();
  const l = lavagnaOf(m);
  const vs = lavagnaLive(m);
  if (!l || !vs.length) return null;
  return (
    <section className="board foam" id={`g-${l.id}`} data-testid="lavagna">
      <div className="slate">
        <div className="bh">
          <small>{dayLabel(l.aggiornata, lang) || t("m_board_today")}</small>
          <h2>
            {t("m_specials_a")} <span>{t("m_specials_b")}</span>
          </h2>
          <div className="chalk-line" />
          {l.nota && <p>{trText(l, "nota", lang)}</p>}
        </div>
        {vs.map((v) => (
          <Link key={v.id} className="sp" to={`/menu/cibo/${encodeURIComponent(v.id)}`} state={{ group: l.id }}>
            <span style={{ minWidth: 0 }}>
              <span className="sn">{trText(v, "nome", lang)}</span>
              {trText(v, "nome", lang) !== v.nome && <span className="sd">{v.nome}</span>}
              {v.descrizione && <span className="sd">{trText(v, "descrizione", lang)}</span>}
              <span className="sx">{t("m_details")} ›</span>
            </span>
            <span className="spr">{eur(v.prezzo)}</span>
          </Link>
        ))}
        <div className="bf">{t("m_board_foot")}</div>
        <span className="chalk" />
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ elenco di un settore
export function MenuSettore() {
  const { t, lang } = useI18n();
  const { settore } = useParams();
  const location = useLocation();
  const menu = useMenu();
  const [q, setQ] = useState("");
  const [, setTick] = useState(0);
  const k = isSettore(settore) ? settore : null;

  useEffect(() => setQ(""), [k]);
  // Arrivo da una scheda: riapro e mostro il gruppo da cui si era partiti.
  // Tornando indietro con la cronologia la posizione la rimette NavMemory: qui serve solo
  // quando si arriva con un link nuovo (es. scheda aperta da un link condiviso).
  const navType = useNavigationType();
  const fromGroup = (location.state as { group?: string } | null)?.group;
  useEffect(() => {
    if (!fromGroup || !menu.data) return;
    openGroups.add(fromGroup);
    setTick((t) => t + 1);
    if (navType === "POP") return;
    const t = setTimeout(() => document.getElementById(`g-${fromGroup}`)?.scrollIntoView({ block: "start" }), 60);
    return () => clearTimeout(t);
  }, [fromGroup, menu.data, navType]);

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
        const vs = s.voci.filter(
          (v) =>
            !needle ||
            norm(
              [v.nome, v.descrizione, v.cantina, v.abbinamento, s.titolo, ...(lang === "it" ? [] : [trText(v, "nome", lang), trText(v, "descrizione", lang), trText(s, "titolo", lang)])].join(" "),
            ).includes(needle),
        );
        if (!vs.length) return null;
        found += vs.length;
        const rows = vs.map((v) => <Row key={v.id} k={k} v={v} i={idx++} group={s.id} />);
        if (acc) {
          const open = !!needle || openGroups.has(s.id);
          const prev = vs.slice(0, 3).map((v) => trText(v, "nome", lang)).join(" · ") + (vs.length > 3 ? " …" : "");
          return (
            <section key={s.id} className={`accg${open ? " is-open" : ""}`} id={`g-${s.id}`}>
              <button type="button" className="acch" onClick={() => toggle(s.id)} aria-expanded={open}>
                <span className="tx">
                  <h2>{secTitle(t, s, lang)}</h2>
                  <small>{prev}</small>
                </span>
                <ChevronRight className="i chev" aria-hidden />
              </button>
              <div className="accb">
                <div className="rows">{rows}</div>
                {s.nota && <p className="secnote">{trText(s, "nota", lang)}</p>}
              </div>
            </section>
          );
        }
        return (
          <section key={s.id} className="group" id={`g-${s.id}`}>
            <div className="ghead">
              <h2>{secTitle(t, s, lang)}</h2>
            </div>
            <div className="rows">{rows}</div>
            {s.nota && <p className="secnote">{trText(s, "nota", lang)}</p>}
          </section>
        );
      })
    : [];

  return (
    <Shell m={m}>
      <div className={`secbar t-${k}`}>
        <div className="wrap">
          <div className="r1">
            <BackLink className="back" to={k === "cibo" ? "/" : "/bere"}>
              <Ic I={ArrowLeft} /> {k === "cibo" ? t("m_home") : t("m_drink")}
            </BackLink>
            <nav className="tabs">
              {k === "cibo" ? (
                <>
                  <span className="tab t-cibo on">{t("m_food")}</span>
                  <Link className="tab t-bere" to="/bere">
                    {t("m_go_drink")}
                  </Link>
                </>
              ) : (
                <>
                  <Link className="tab t-birre" to="/birre">
                    {t("m_beers")}
                  </Link>
                  {SETTORI_BERE.map((x) => (
                    <Link key={x} className={`tab t-${x}${x === k ? " on" : ""}`} to={`/menu/${x}`}>
                      {setShort(t, x)}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
          <div className="chips">
            <div className="searchbox">
              <Search className="i" aria-hidden />
              <input type="search" placeholder={t("m_search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("m_search_label")} />
            </div>
            {m?.settori[k]
              .filter((s) => s.voci && s.voci.length && !s.lavagna)
              .map((s) => (
                <button key={s.id} type="button" className="jump" onClick={() => jump(s.id)}>
                  {trText(s, "titolo", lang)}
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
              <h1>{setLabel(t, k)}</h1>
              <p>{setSub(t, k)}</p>
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
                  {t("m_open_all")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openGroups.clear();
                    setTick((t) => t + 1);
                  }}
                >
                  {t("m_close_all")}
                </button>
              </div>
            )}
            {groups}
          </div>
        )}
        {m && found === 0 && needle && <p className="empty">{t("m_no_results")}</p>}
        {m && found === 0 && !needle && m.settori[k].every((s) => !s.voci?.length) && <p className="empty">{t("m_updating")}</p>}
      </main>
    </Shell>
  );
}

// ------------------------------------------------------------------ allergeni (nascosti dietro un pulsante discreto)
function Allergeni({ v }: { v: Voce }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const list = allergeniOf(v);
  const pid = `allerg-${v.id}`;
  return (
    <div className={`alg${open ? " is-open" : ""}`}>
      <button type="button" className="alg-btn" aria-expanded={open} aria-controls={pid} onClick={() => setOpen((o) => !o)}>
        <span className="alg-dot" aria-hidden>
          i
        </span>
        <span className="alg-lab">{t("m_allergens")}</span>
        <ChevronDown className="i alg-chev" aria-hidden />
      </button>
      <div className="alg-wrap" id={pid} role="region" aria-label={t("m_allergens")} inert={!open}>
        <div className="alg-in">
          {list.length > 0 ? (
            <>
              <p className="alg-t">{t("m_contains")}</p>
              <ul className="alg-list">
                {list.map((a) => (
                  <li key={a.k}>
                    <span className="alg-n">{a.n}</span>
                    <span>
                      {a.it}
                      <small>{lang === "it" ? a.en : a[lang]}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : v.senza_allergeni ? (
            <p className="alg-t">{t("m_no_allergens")}</p>
          ) : (
            !v.allergeni && <p className="alg-t">{t("m_ask_staff")}</p>
          )}
          {v.allergeni && <p className="alg-note">{cap(trText(v, "allergeni", lang))}</p>}
          <p className="alg-foot">
            {t("m_allergy_foot")}
            {lang === "it" && <small>Allergies or intolerances? Please ask our staff.</small>}
          </p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ scheda articolo
export function MenuVoce() {
  const { t, lang } = useI18n();
  const { settore, id } = useParams();
  const menu = useMenu();
  const m = menu.data;
  const x = useMemo(() => (m && id ? findItem(m, id) : undefined), [m, id]);

  if (!isSettore(settore)) return <Navigate to="/" replace />;
  if (!m) return <Shell><Loading menu={menu} /></Shell>;
  if (!x) return <Navigate to={`/menu/${settore}`} replace />;
  const { k, s, v } = x;
  const others = (s.voci ?? []).filter((o) => o.id !== v.id && o.disponibile !== false);
  const pairing = cap(trText(v, "abbinamento", lang));
  const nome = trText(v, "nome", lang);
  const titolo = secTitle(t, s, lang);
  return (
    <Shell m={m}>
      <main className={`itemwrap t-${k}`}>
        <div className="crumbs">
          <BackLink className="back" to={`/menu/${k}`} state={{ group: s.id }}>
            <Ic I={ArrowLeft} /> {setShort(t, k)}
          </BackLink>
          <BackLink className="c2" to={`/menu/${k}`} state={{ group: s.id }}>
            {titolo}
          </BackLink>
        </div>
        <article className={`card foam${v.disponibile === false ? " out" : ""}`} data-testid="menu-item-card">
          {v.evidenza && (
            <span className="badge-ev">
              <Star className="i" aria-hidden /> {t("m_featured")}
            </span>
          )}
          {fotoUrl(v) && (
            <div className="logo-big">
              <PhotoViewer src={fotoUrl(v)!} alt={v.cantina || nome} light className="logo-zoom">
                <img src={fotoUrl(v)!} alt={v.cantina || nome} decoding="async" />
              </PhotoViewer>
            </div>
          )}
          {v.cantina && <p className="cant">{v.cantina}</p>}
          <div className="top">
            <h1>
              {nome}
              {nome !== v.nome && <small className="nm-tr">{v.nome}</small>}
            </h1>
            {!hasSizes(v) && <Price v={v} />}
          </div>
          <div className="pills">
            <span className="pill-loc">{setShort(t, k)}</span>
            {s.lavagna ? <span className="lav-pill">{t("m_special")}</span> : <span className="pill-sec">{titolo}</span>}
            <Tags v={v} />
          </div>
          {v.descrizione && <p className="desc">{trText(v, "descrizione", lang)}</p>}
          {hasSizes(v) && (
            <div className="sizes-big">
              {v.calice != null && (
                <div>
                  <small>{t("m_glass")}</small>
                  <b>{eur(v.calice)}</b>
                </div>
              )}
              {v.bottiglia != null && (
                <div>
                  <small>{t("m_bottle")}</small>
                  <b>{eur(v.bottiglia)}</b>
                </div>
              )}
            </div>
          )}
          {pairing && (
            <div className="pairing">
              <p className="lab">
                <BeerIcon className="i" aria-hidden /> {t("m_pairing")}
              </p>
              <p className="val">{pairing}</p>
            </div>
          )}
          {v.nota && <p className="inote">{trText(v, "nota", lang)}</p>}
          {(k === "cibo" || allergeniOf(v).length > 0 || v.senza_allergeni || v.allergeni) && <Allergeni v={v} />}
        </article>
        {others.length > 0 && (
          <section className="others">
            <h2>
              {t("m_more_in")} “{titolo}”
            </h2>
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
