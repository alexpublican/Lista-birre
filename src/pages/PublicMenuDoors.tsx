import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Beer as BeerIcon, Clock, Leaf, Lock, Search, Snowflake, Star, Warehouse, WineOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import HistoricHeader from "@/components/HistoricHeader";
import BeerCard from "@/components/BeerCard";
import BeerRow from "@/components/BeerRow";
import VenueInfo from "@/components/VenueInfo";
import BrandMark from "@/components/BrandMark";
import InstallButton from "@/components/InstallButton";
import { LOCATIONS, byBrewery, byTap, groupByBrewery, useBeers, useSettings } from "@/lib/beers";
import type { Beer, Location } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const img = (id: string) => `https://images.unsplash.com/${id}?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=75&w=1000`;

const DOORS: Record<Location, { photo: string; Icon: LucideIcon; sub: TKey; ring: string; text: string; glow: string; tab: string }> = {
  spina: {
    photo: img("photo-1546622891-02c72c1537b6"),
    Icon: BeerIcon,
    sub: "door_spina_sub",
    ring: "border-[#F59E0B]/60 hover:border-[#F59E0B]",
    text: "text-[#FCD34D]",
    glow: "hover:shadow-[0_18px_50px_-20px_rgba(245,158,11,0.55)]",
    tab: "border-[#F59E0B] bg-[#3B260E] text-[#FCD34D]",
  },
  frigo: {
    photo: img("photo-1753826283735-8c6a249277e8"),
    Icon: Snowflake,
    sub: "door_frigo_sub",
    ring: "border-[#0EA5E9]/50 hover:border-[#0EA5E9]",
    text: "text-[#7DD3FC]",
    glow: "hover:shadow-[0_18px_50px_-20px_rgba(14,165,233,0.5)]",
    tab: "border-[#0EA5E9] bg-[#0C2E3A] text-[#7DD3FC]",
  },
  cantina: {
    photo: img("photo-1790934422619-c0b49ecfdd3c"),
    Icon: Warehouse,
    sub: "door_cantina_sub",
    ring: "border-[#A855F7]/50 hover:border-[#A855F7]",
    text: "text-[#F0ABFC]",
    glow: "hover:shadow-[0_18px_50px_-20px_rgba(168,85,247,0.5)]",
    tab: "border-[#A855F7] bg-[#31182D] text-[#F0ABFC]",
  },
};

const isLocation = (v: string | null): v is Location => LOCATIONS.includes(v as Location);

/** Trial layout: three big "doors" (Spina / Frigo / Cantina) → compact list → full card on request. */
export default function PublicMenuDoors() {
  const { t } = useI18n();
  const { data, isError, isLoading } = useBeers();
  const settings = useSettings();
  const styleChips = settings.isError ? [] : (settings.data?.stili_filtro ?? []);
  const [params, setParams] = useSearchParams();
  const sector = isLocation(params.get("s")) ? (params.get("s") as Location) : null;
  const [open, setOpen] = useState<Beer | null>(null);
  const [q, setQ] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [glutenFree, setGlutenFree] = useState(false);
  const [alcoholFree, setAlcoholFree] = useState(false);

  const live = (isError ? [] : (data ?? [])).filter((b) => !b.archiviata);
  const onMenu = live.filter((b) => !b.in_arrivo);
  const coming = live.filter((b) => b.in_arrivo);
  const featured = onMenu.filter((b) => b.in_evidenza && b.disponibile);
  const bySector = (loc: Location) =>
    onMenu
      .filter((b) => b.posizione === loc)
      .sort(loc === "cantina" ? byBrewery : (a, b) => Number(b.disponibile) - Number(a.disponibile) || byTap(a, b));

  const go = (s: Location | null) => {
    setParams(s ? { s } : {});
    setQ("");
    setStyle(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => setOpen(null), [sector]);

  const needle = q.trim().toLowerCase();
  const st = style?.toLowerCase();
  const items = !sector
    ? []
    : bySector(sector).filter(
        (b) =>
          (!st || b.stile.toLowerCase().includes(st)) &&
          (!glutenFree || b.senza_glutine) &&
          (!alcoholFree || b.analcolica) &&
          (!needle || [b.nome, b.birrificio, b.stile].some((f) => f.toLowerCase().includes(needle))),
      );

  const sectorBeers = sector ? bySector(sector) : [];
  // Cantina: blocchi per birrificio con scorciatoie in alto.
  const breweryGroups = sector === "cantina" ? groupByBrewery(items) : [];
  const jumpTo = (key: string) =>
    document.getElementById(`brewery-${key.replace(/[^a-z0-9]+/g, "-")}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const dietChips = [
    { key: "gluten-free", on: glutenFree, toggle: () => setGlutenFree((v) => !v), label: t("gluten_free"), Icon: Leaf, show: sectorBeers.some((b) => b.senza_glutine), active: "border-[#84CC16] bg-[#BEF264] text-[#12100E]" },
    { key: "alcohol-free", on: alcoholFree, toggle: () => setAlcoholFree((v) => !v), label: t("alcohol_free"), Icon: WineOff, show: sectorBeers.some((b) => b.analcolica), active: "border-[#38BDF8] bg-[#7DD3FC] text-[#12100E]" },
  ].filter((c) => c.show || c.on);
  const sectorStyles = styleChips.filter((c) => sectorBeers.some((b) => b.stile.toLowerCase().includes(c.toLowerCase())));
  const sectorComing = sector ? coming.filter((b) => b.posizione === sector) : [];

  return (
    <div className="min-h-screen">
      <HistoricHeader />

      {!sector ? (
        <main className="mx-auto max-w-6xl px-4 pb-14 sm:px-6" data-testid="doors-home">
          <section className="flex items-center gap-4 pt-8 pb-6 sm:pt-12">
            <BrandMark hideFallback className="size-16 shrink-0 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] sm:size-20" testId="hero-brand" />
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-[0.25em] text-[#FBBF24] uppercase">{t("since")}</p>
              <h1 className="font-heading text-4xl leading-none font-bold tracking-tight text-[#FFF9F2] sm:text-5xl" data-testid="hero-title">
                Birreria Cassina
              </h1>
              <p className="mt-2 text-sm text-[#DFCFC0]" data-testid="hero-tagline">
                {t("tagline")}
              </p>
            </div>
          </section>

          {featured.length > 0 && (
            <section className="mb-7" data-testid="doors-featured">
              <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[#FCD34D] uppercase">
                <Star className="size-3.5 fill-current" /> {t("featured")}
              </p>
              <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {featured.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setOpen(b)}
                    className="shrink-0 rounded-full border border-[#D97706]/60 bg-[linear-gradient(135deg,#2A1C0C,#1C1713)] px-4 py-2 text-left transition-[border-color,transform] duration-150 hover:border-[#F59E0B] active:scale-95"
                    data-testid={`doors-featured-${b.id}`}
                  >
                    <span className="font-heading block text-base leading-tight font-semibold text-[#FFF9F2]">{b.nome}</span>
                    <span className="block text-[11px] text-[#D6B98C]">
                      {b.posizione === "spina" && b.spina_n ? `${t("tap_n")} ${b.spina_n} · ` : `${t(b.posizione)} · `}
                      {b.stile}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-3" data-testid="doors">
            {LOCATIONS.map((loc, i) => {
              const d = DOORS[loc];
              const list = bySector(loc);
              const avail = list.filter((b) => b.disponibile);
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => go(loc)}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={cn(
                    "motion-safe:animate-foam group relative isolate flex min-h-44 flex-col justify-end overflow-hidden rounded-2xl border-2 p-5 text-left md:min-h-[26rem] md:rounded-t-[12rem]",
                    "transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 active:scale-[0.98]",
                    d.ring,
                    d.glow,
                  )}
                  data-testid={`door-${loc}`}
                >
                  <img
                    src={d.photo}
                    alt=""
                    className="absolute inset-0 -z-20 size-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,16,14,0.25)_0%,rgba(18,16,14,0.75)_45%,rgba(18,16,14,0.97)_100%)]" />
                  <div className="absolute top-4 right-4 rounded-full md:top-12 md:right-1/2 md:translate-x-1/2 border border-white/10 bg-[#12100E]/70 px-3 py-1 font-mono text-xs text-[#F5EBE1] backdrop-blur-md" data-testid={`door-${loc}-count`}>
                    <span className="font-semibold">{avail.length}</span> {t("beers_word")}
                  </div>
                  <d.Icon className={cn("mb-2 size-6", d.text)} />
                  <h2 className={cn("font-heading text-4xl leading-none font-bold tracking-tight", d.text)}>{t(loc)}</h2>
                  <p className="mt-1.5 text-sm text-[#DFCFC0]">{t(d.sub)}</p>
                  {avail.length > 0 ? (
                    <p className="mt-3 line-clamp-1 text-xs text-[#B5A799]" data-testid={`door-${loc}-preview`}>
                      {avail.slice(0, 3).map((b) => b.nome).join(" · ")}
                      {avail.length > 3 && " …"}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-[#786C60]">{isLoading ? "…" : t("door_empty")}</p>
                  )}
                  <span className={cn("mt-4 inline-flex items-center gap-1.5 text-sm font-semibold tracking-wide uppercase", d.text)}>
                    {t("open_door")} <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </button>
              );
            })}
          </div>

          {coming.length > 0 && (
            <section className="mt-10 rounded-xl border border-dashed border-[#57422F] bg-[#181412]/70 p-4 sm:p-5" data-testid="doors-coming-soon">
              <div className="mb-1 flex items-center gap-2.5">
                <Clock className="size-5 text-[#FBBF24]" />
                <h2 className="font-heading text-2xl font-semibold">{t("coming_soon")}</h2>
                <span className="font-mono text-sm text-[#786C60]">{coming.length}</span>
              </div>
              <p className="mb-4 text-sm text-[#B5A799]">{t("coming_soon_hint")}</p>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {coming.map((b, i) => (
                  <BeerRow key={b.id} beer={b} index={i} onOpen={setOpen} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-8">
            <InstallButton />
          </div>
        </main>
      ) : (
        <>
          <div className="sticky top-[61px] z-20 border-b border-[#2E241B] bg-[#12100E]/90 backdrop-blur-xl" data-testid="sector-bar">
            <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-3 sm:px-6">
              <button
                type="button"
                onClick={() => go(null)}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#3D3126] px-3 text-sm text-[#DFCFC0] transition-[color,border-color,transform] duration-150 hover:border-[#57422F] hover:text-[#FFF9F2] active:scale-95"
                data-testid="sector-back"
              >
                <ArrowLeft className="size-4" /> {t("all_sectors")}
              </button>
              <div className="-mr-4 flex flex-1 gap-1.5 overflow-x-auto pr-4 sm:mr-0 sm:pr-0" data-testid="sector-tabs">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => go(loc)}
                    aria-pressed={sector === loc}
                    className={cn(
                      "h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                      sector === loc ? DOORS[loc].tab : "border-[#3D3126] text-[#B5A799] hover:text-[#F5EBE1]",
                    )}
                    data-testid={`sector-tab-${loc}`}
                  >
                    {t(loc)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6" data-testid="sector-chips">
              <div className="relative w-44 shrink-0 sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#786C60]" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="h-8 pl-9 text-sm" data-testid="search-input" />
              </div>
              {dietChips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.toggle}
                  aria-pressed={c.on}
                  data-testid={`diet-chip-${c.key}`}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                    c.on ? c.active : "border-[#3D3126] text-[#B5A799] hover:text-[#F5EBE1]",
                  )}
                >
                  <c.Icon className="size-3.5" /> {c.label}
                </button>
              ))}
              {sectorStyles.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setStyle(style === c ? null : c)}
                  aria-pressed={style === c}
                  data-testid={`style-chip-${c}`}
                  className={cn(
                    "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                    style === c ? "border-[#E5D5C5] bg-[#E5D5C5] text-[#12100E]" : "border-dashed border-[#3D3126] text-[#B5A799] hover:text-[#F5EBE1]",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6" data-testid={`sector-${sector}`}>
            <div className="relative mb-6 overflow-hidden rounded-xl border border-[#2E241B]">
              <img src={DOORS[sector].photo} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,16,14,0.95)_0%,rgba(18,16,14,0.6)_100%)]" />
              <div className="relative flex items-end justify-between gap-4 px-5 py-5">
                <div>
                  <h1 className={cn("font-heading text-4xl leading-none font-bold tracking-tight", DOORS[sector].text)} data-testid="sector-title">
                    {t(sector)}
                  </h1>
                  <p className="mt-1.5 text-sm text-[#DFCFC0]">{t(DOORS[sector].sub)}</p>
                </div>
                <span className="font-mono text-sm text-[#DFCFC0]" data-testid="sector-count">
                  {items.length} {t("beers_word")}
                </span>
              </div>
            </div>

            {isError && (
              <p className="rounded-lg border border-[#3D3126] bg-[#1E1915] p-6 text-[#B5A799]" data-testid="menu-error">
                {t("load_error")}
              </p>
            )}
            {isLoading && (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-[#1C1713]" />
                ))}
              </div>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <p className="py-14 text-center text-[#B5A799]" data-testid="menu-empty">
                {t("no_results")}
              </p>
            )}
            {sector === "cantina" ? (
              <>
                {breweryGroups.length > 1 && (
                  <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" data-testid="brewery-shortcuts">
                    {breweryGroups.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => jumpTo(g.key)}
                        className="h-8 shrink-0 rounded-full border border-[#A855F7]/40 bg-[#31182D]/60 px-3 text-xs font-medium text-[#F0ABFC] transition-[background-color,transform] duration-150 hover:bg-[#31182D] active:scale-95"
                        data-testid={`brewery-shortcut-${g.key}`}
                      >
                        {g.short}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid gap-8" data-testid="sector-list">
                  {breweryGroups.map((g, gi) => {
                    const offset = breweryGroups.slice(0, gi).reduce((n, x) => n + x.beers.length, 0);
                    return (
                      <section
                        key={g.key}
                        id={`brewery-${g.key.replace(/[^a-z0-9]+/g, "-")}`}
                        className="scroll-mt-48"
                        data-testid={`brewery-group-${g.key}`}
                      >
                        <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-[#A855F7]/30 pb-2">
                          <h2 className="font-heading text-2xl leading-tight font-semibold text-[#F0ABFC]">{g.name}</h2>
                          <span className="shrink-0 font-mono text-xs text-[#B5A799]">
                            {g.beers.length} {t(g.beers.length === 1 ? "beer_word_one" : "beers_word")}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                          {g.beers.map((b, i) => (
                            <BeerRow key={b.id} beer={b} index={offset + i} onOpen={setOpen} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2" data-testid="sector-list">
                {items.map((b, i) => (
                  <BeerRow key={b.id} beer={b} index={i} onOpen={setOpen} />
                ))}
              </div>
            )}

            {sectorComing.length > 0 && (
              <section className="mt-10" data-testid="sector-coming-soon">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[#FCD34D] uppercase">
                  <Clock className="size-3.5" /> {t("coming_soon")}
                </p>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {sectorComing.map((b, i) => (
                    <BeerRow key={b.id} beer={b} index={i} onOpen={setOpen} />
                  ))}
                </div>
              </section>
            )}
          </main>
        </>
      )}

      <footer className="border-t border-[#2E241B] bg-[#181412]/80" data-testid="menu-footer">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="font-heading text-2xl font-semibold">Birreria Cassina</p>
          <div className="brass-rule mt-3 mb-6 w-20" />
          <VenueInfo />
          <div className="mt-8 flex items-center justify-between gap-4">
            <p className="text-xs tracking-[0.15em] text-[#786C60] uppercase">{t("since")}</p>
            <Link
              to="/admin"
              aria-label={t("staff")}
              data-testid="staff-link"
              className="grid size-8 place-items-center rounded-full text-[#4A3F35] transition-colors duration-150 hover:text-[#B5A799]"
            >
              <Lock className="size-3.5" />
            </Link>
          </div>
        </div>
      </footer>

      <Sheet open={open != null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-[#3D3126] bg-[#12100E] p-4 pt-10 sm:p-6 sm:pt-12"
          data-testid="beer-sheet"
        >
          <SheetTitle className="sr-only">{open?.nome ?? ""}</SheetTitle>
          {open && <BeerCard beer={open} index={0} featured={open.in_evidenza} showNotify={false} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
