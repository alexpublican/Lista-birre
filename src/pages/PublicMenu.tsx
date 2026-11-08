import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Leaf, Search, Lock, Star, WineOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import HistoricHeader from "@/components/HistoricHeader";
import BeerCard from "@/components/BeerCard";
import { LOCATIONS, byTap, useBeers, useSettings } from "@/lib/beers";
import VenueInfo from "@/components/VenueInfo";
import BrandMark from "@/components/BrandMark";
import InstallButton from "@/components/InstallButton";
import type { Location } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const HERO =
  "https://images.unsplash.com/photo-1567696911980-2eed69a46042?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=1600";

type Filter = "all" | Location;

const PILL_ACTIVE: Record<Filter, string> = {
  all: "bg-[#D97706] text-white border-[#D97706]",
  spina: "bg-[#3B260E] text-[#FCD34D] border-[#F59E0B]",
  frigo: "bg-[#0C2E3A] text-[#7DD3FC] border-[#0EA5E9]",
  cantina: "bg-[#31182D] text-[#F0ABFC] border-[#A855F7]",
};

export default function PublicMenu() {
  const { t } = useI18n();
  const { data, isError, isLoading } = useBeers();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [style, setStyle] = useState<string | null>(null);
  const [glutenFree, setGlutenFree] = useState(false);
  const [alcoholFree, setAlcoholFree] = useState(false);
  const settings = useSettings();
  const styleChips = settings.isError ? [] : (settings.data?.stili_filtro ?? []);

  const beers = isError ? [] : (data ?? []);
  const live = beers.filter((b) => !b.archiviata);
  const onMenu = live.filter((b) => !b.in_arrivo);
  const tapCount = onMenu.filter((b) => b.posizione === "spina" && b.disponibile).length;
  const availCount = onMenu.filter((b) => b.disponibile).length;

  const matching = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const st = style?.toLowerCase();
    return live.filter(
      (b) =>
        (filter === "all" || b.posizione === filter) &&
        (!st || b.stile.toLowerCase().includes(st)) &&
        (!glutenFree || b.senza_glutine) &&
        (!alcoholFree || b.analcolica) &&
        (!needle || [b.nome, b.birrificio, b.stile].some((f) => f.toLowerCase().includes(needle))),
    );
  }, [live, filter, q, style, glutenFree, alcoholFree]);
  const dietChips = [
    { key: "gluten-free", on: glutenFree, toggle: () => setGlutenFree((v) => !v), label: t("gluten_free"), Icon: Leaf, show: live.some((b) => b.senza_glutine), active: "border-[#84CC16] bg-[#BEF264] text-[#12100E]" },
    { key: "alcohol-free", on: alcoholFree, toggle: () => setAlcoholFree((v) => !v), label: t("alcohol_free"), Icon: WineOff, show: live.some((b) => b.analcolica), active: "border-[#38BDF8] bg-[#7DD3FC] text-[#12100E]" },
  ].filter((c) => c.show || c.on);

  const visible = matching.filter((b) => !b.in_arrivo && (!onlyAvailable || b.disponibile));
  const coming = matching.filter((b) => b.in_arrivo);

  const featured = onMenu.filter((b) => b.in_evidenza && b.disponibile);
  const showFeatured = filter === "all" && !q.trim() && !style && !glutenFree && !alcoholFree && featured.length > 0;

  const sections = (filter === "all" ? LOCATIONS : [filter]).map((loc) => ({
    loc,
    items: visible.filter((b) => b.posizione === loc).sort(byTap),
  }));

  return (
    <div className="min-h-screen">
      <HistoricHeader
        right={
          <Link
            to="/admin"
            aria-label={t("staff")}
            data-testid="staff-link"
            className="grid size-9 place-items-center rounded-full border border-[#3D3126] text-[#B5A799] transition-colors duration-150 hover:text-[#F59E0B]"
          >
            <Lock className="size-4" />
          </Link>
        }
      />

      <section className="relative overflow-hidden border-b border-[#2E241B]" data-testid="hero">
        <img src={HERO} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,14,0.65)_0%,rgba(18,16,14,0.95)_100%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
          <BrandMark hideFallback className="mb-5 size-24 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] sm:size-28" testId="hero-brand" />
          <p className="font-mono text-xs tracking-[0.25em] text-[#FBBF24] uppercase">{t("since")}</p>
          <h1 className="font-heading mt-3 text-5xl leading-[1.05] font-bold tracking-tight text-[#FFF9F2] sm:text-6xl" data-testid="hero-title">
            Birreria Cassina
          </h1>
          <div className="brass-rule mt-4 w-40" />
          <p className="mt-4 max-w-md text-base text-[#DFCFC0]" data-testid="hero-tagline">
            {t("tagline")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-[#F59E0B]/40 bg-[#3B260E]/80 px-3 py-1 text-[#FCD34D]" data-testid="hero-tap-count">
              <span className="font-mono font-semibold">{tapCount}</span> {t("on_tap_now")}
            </span>
            <span className="rounded-full border border-[#34D399]/30 bg-[#064E3B]/70 px-3 py-1 text-[#6EE7B7]" data-testid="hero-available-count">
              <span className="font-mono font-semibold">{availCount}</span> {t("beers_available")}
            </span>
          </div>
          <div className="mt-5">
            <InstallButton />
</div>
        </div>
      </section>

      <div className="sticky top-[61px] z-20 border-b border-[#2E241B] bg-[#12100E]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5" data-testid="location-tabs">
            {(["all", ...LOCATIONS] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                data-testid={`filter-${f}`}
                aria-pressed={filter === f}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                  filter === f ? PILL_ACTIVE[f] : "border-[#3D3126] text-[#B5A799] hover:text-[#F5EBE1]",
                )}
              >
                {t(f)}
              </button>
            ))}
          </div>
          <div className="flex flex-1 items-center gap-3 md:justify-end">
            <div className="relative flex-1 md:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#786C60]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_placeholder")}
                className="h-10 pl-9"
                data-testid="search-input"
              />
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm text-[#B5A799]">
              <Checkbox checked={onlyAvailable} onCheckedChange={(c) => setOnlyAvailable(Boolean(c))} data-testid="available-only-toggle" />
              {t("available_only")}
            </label>
          </div>
        </div>
        {(styleChips.length > 0 || dietChips.length > 0) && (
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6" data-testid="style-chips">
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
            {dietChips.length > 0 && styleChips.length > 0 && <span className="my-1 w-px shrink-0 bg-[#3D3126]" />}
            {styleChips.length > 0 && [null, ...styleChips].map((c) => (
              <button
                key={c ?? "__all"}
                type="button"
                onClick={() => setStyle(c)}
                aria-pressed={style === c}
                data-testid={c ? `style-chip-${c}` : "style-chip-all"}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                  style === c
                    ? "border-[#E5D5C5] bg-[#E5D5C5] text-[#12100E]"
                    : "border-[#3D3126] border-dashed text-[#B5A799] hover:text-[#F5EBE1]",
                )}
              >
                {c ?? t("all_styles")}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6" data-testid="menu">
        {isError && (
          <p className="rounded-lg border border-[#3D3126] bg-[#1E1915] p-6 text-[#B5A799]" data-testid="menu-error">
            {t("load_error")}
          </p>
        )}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg bg-[#1C1713]" />
            ))}
          </div>
        )}
        {!isLoading && !isError && visible.length === 0 && coming.length === 0 && (
          <p className="py-16 text-center text-[#B5A799]" data-testid="menu-empty">
            {t("no_results")}
          </p>
        )}
        {showFeatured && (
          <section className="mb-12 rounded-xl border border-[#D97706]/40 bg-[#1E1915]/70 p-5 sm:p-6" data-testid="section-featured">
            <div className="mb-5 flex items-center gap-3">
              <Star className="size-5 fill-[#F59E0B] text-[#F59E0B]" />
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#FCD34D]">{t("featured")}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {featured.map((b, i) => (
                <BeerCard key={b.id} beer={b} index={i} featured />
              ))}
            </div>
          </section>
        )}
        {sections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section key={s.loc} className="mb-12" data-testid={`section-${s.loc}`}>
              <div className="mb-5 flex items-baseline gap-3">
                <h2 className="font-heading text-3xl font-semibold tracking-tight">{t(s.loc)}</h2>
                <span className="font-mono text-sm text-[#786C60]">{s.items.length}</span>
              </div>
              <div className="brass-rule mb-6 w-24 opacity-70" />
              <div className="grid gap-4 md:grid-cols-2">
                {s.items.map((b, i) => (
                  <BeerCard key={b.id} beer={b} index={i} />
                ))}
              </div>
            </section>
          ))}
        {coming.length > 0 && (
          <section className="mb-12 rounded-xl border border-dashed border-[#57422F] bg-[#181412]/70 p-5 sm:p-6" data-testid="section-coming-soon">
            <div className="mb-1 flex items-center gap-3">
              <Clock className="size-5 text-[#FBBF24]" />
              <h2 className="font-heading text-3xl font-semibold tracking-tight">{t("coming_soon")}</h2>
              <span className="font-mono text-sm text-[#786C60]">{coming.length}</span>
            </div>
            <p className="mb-5 text-sm text-[#B5A799]">{t("coming_soon_hint")}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {coming.map((b, i) => (
                <BeerCard key={b.id} beer={b} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-[#2E241B] bg-[#181412]/80" data-testid="menu-footer">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="font-heading text-2xl font-semibold">Birreria Cassina</p>
          <div className="brass-rule mt-3 mb-6 w-20" />
          <VenueInfo />
          <p className="mt-8 text-xs tracking-[0.15em] text-[#786C60] uppercase">{t("since")}</p>
        </div>
      </footer>
    </div>
  );
}
