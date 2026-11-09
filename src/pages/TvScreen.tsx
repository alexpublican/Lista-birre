import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Cylinder, Hourglass, Maximize, Snowflake, Star, Beer as BeerIcon } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { apiGet } from "@/lib/api";
import { BEERS_KEY, byTap, isBottlePhoto, isGravity, localizedStyle, photoUrl, useIsHandpump } from "@/lib/beers";
import type { Beer, Location } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ACCENT: Record<Location, { border: string; price: string; badge: string }> = {
  spina: { border: "border-[#F59E0B]", price: "text-[#F59E0B]", badge: "bg-[#3B260E] text-[#FCD34D]" },
  frigo: { border: "border-[#0EA5E9]", price: "text-[#38BDF8]", badge: "bg-[#0C2E3A] text-[#7DD3FC]" },
  cantina: { border: "border-[#A855F7]", price: "text-[#C084FC]", badge: "bg-[#31182D] text-[#F0ABFC]" },
};

const PAGE_SIZE = 9; // featured / fridge slides: 3×3
const DEFAULT_SEC = 15;

type SlideKind = "taps" | "featured" | "frigo";
interface Slide {
  key: string;
  kind: SlideKind;
  title: TKey;
  beers: Beer[];
  next?: Record<number, Beer>;
  page: number;
  pages: number;
}

function chunk(kind: SlideKind, title: TKey, beers: Beer[]): Slide[] {
  const pages = Math.ceil(beers.length / PAGE_SIZE);
  return Array.from({ length: pages }, (_, i) => ({
    key: `${kind}-${i}`,
    kind,
    title,
    beers: beers.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE),
    page: i + 1,
    pages,
  }));
}

function TvClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[2.2vw] text-[#B5A799]" data-testid="tv-clock">
      {now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function NextUp({ beer, tap }: { beer: Beer; tap: number }) {
  const { t } = useI18n();
  return (
    <p
      className="mt-[0.5vw] flex min-w-0 items-center gap-[0.5vw] border-t border-dashed border-[#3D3126] pt-[0.5vw] text-[1.05vw] text-[#D6B98C]"
      data-testid={`tv-next-${tap}`}
    >
      <Hourglass className="size-[1vw] shrink-0 text-[#FBBF24]" />
      <span className="shrink-0 font-semibold tracking-[0.12em] text-[#FBBF24] uppercase">
        {t("tv_next")} {isGravity(tap) ? t("gravity") : `${t("tv_tap")} ${tap}`}:
      </span>
      <span className="truncate font-heading font-bold text-[#FFF9F2]">{beer.nome}</span>
    </p>
  );
}

function BeerTile({ beer, showLocation, next }: { beer: Beer; showLocation: boolean; next?: Beer }) {
  const { t, lang, price, abvOf } = useI18n();
  const a = ACCENT[beer.posizione];
  const tap = beer.posizione === "spina" && beer.spina_n != null ? beer.spina_n : null;
  const gravity = isGravity(tap);
  const handpump = useIsHandpump()(tap);
  const waiting = beer.in_arrivo; // queued on an empty tap
  const out = !beer.disponibile && !waiting;
  const photo = photoUrl(beer);
  return (
    <article
      data-testid={tap != null ? `tv-tap-${tap}` : `tv-beer-${beer.id}`}
      className={cn(
        "relative flex min-h-0 gap-[1.2vw] overflow-hidden rounded-[0.8vw] border-l-[0.4vw] bg-[#1C1713] p-[1.2vw]",
        a.border,
        gravity && "border-[#B45309] bg-[linear-gradient(135deg,#2A1C0C,#1C1713_70%)]",
        out && "opacity-45 saturate-50",
        waiting && "border-dashed bg-[#17130F]",
      )}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          className={cn(
            "h-full max-h-[12vw] shrink-0 rounded-[0.6vw]",
            isBottlePhoto(beer) ? "aspect-[3/4] bg-white object-contain p-[0.3vw]" : "aspect-square object-cover",
          )}
          data-testid="tv-tap-photo"
        />
      )}
      {tap != null && (
        <div
          className={cn(
            "font-heading grid size-[4.6vw] shrink-0 place-items-center rounded-full border-[0.2vw] border-[#F59E0B]/70 bg-[#3B260E] text-[2.4vw] font-bold text-[#FCD34D]",
            gravity && "rounded-[0.6vw] border-[#B45309]",
            photo && "absolute top-[0.6vw] left-[0.6vw] size-[3.4vw] text-[1.7vw] shadow-lg shadow-black/60",
          )}
        >
          {gravity ? <Cylinder className={photo ? "size-[1.7vw]" : "size-[2.4vw]"} /> : tap}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {gravity && <p className="text-[0.9vw] font-semibold tracking-[0.2em] text-[#FBBF24] uppercase">{t("gravity")}</p>}
        {handpump && (
          <p className="text-[0.9vw] font-semibold tracking-[0.2em] text-[#FB923C] uppercase" data-testid={`tv-tap-${tap}-handpump`}>
            {t("handpump")}
          </p>
        )}
        {beer.cask && (
          <p className="text-[0.9vw] font-semibold tracking-[0.2em] text-[#FDE68A] uppercase" data-testid="tv-tap-cask">
            {t("cask")}
          </p>
        )}
        {showLocation && (
          <p className={cn("mb-[0.3vw] w-fit rounded-full px-[0.7vw] text-[0.85vw] font-semibold tracking-[0.15em] uppercase", a.badge)}>
            {t(beer.posizione)}
          </p>
        )}
        <div className="flex items-start justify-between gap-[1vw]">
          <h2 className="font-heading truncate text-[2.1vw] leading-tight font-bold text-[#FFF9F2]" data-testid="tv-tap-name">
            {beer.nome}
          </h2>
          {beer.formati.length === 0 && (
            <span className={cn("font-heading shrink-0 text-[2vw] font-bold", a.price)}>{price(beer.prezzo)}</span>
          )}
        </div>
        <p className="truncate text-[1.15vw] text-[#BFB0A3]">
          {[beer.birrificio, localizedStyle(beer, lang), abvOf(beer)].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-[1.4vw] gap-y-[0.3vw] pt-[0.6vw] text-[1.2vw]">
          {beer.formati.map((f, i) => (
            <span key={i} className="whitespace-nowrap text-[#E5D5C5]">
              {f.nome} <b className={cn("font-mono", a.price)}>{price(f.prezzo)}</b>
            </span>
          ))}
          {out && <span className="ml-auto rounded-full bg-[#292524] px-[0.8vw] text-[#A8A29E]">{t("sold_out")}</span>}
          {waiting && (
            <span className="ml-auto flex items-center gap-[0.4vw] rounded-full bg-[#3B260E] px-[0.8vw] text-[#FCD34D]" data-testid="tv-tap-arriving">
              <Hourglass className="size-[1vw]" /> {t("arriving")}
            </span>
          )}
        </div>
        {next && tap != null && <NextUp beer={next} tap={tap} />}
      </div>
    </article>
  );
}

const SLIDE_ICON: Record<SlideKind, typeof Star> = { taps: BeerIcon, featured: Star, frigo: Snowflake };

export default function TvScreen() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  // ?sec=N sets seconds per slide (taps stay up twice as long); ?solo=spine turns rotation off.
  const sec = Math.min(120, Math.max(5, Number(params.get("sec")) || DEFAULT_SEC));
  const tapsOnly = params.get("solo") === "spine";

  // Refresh every 30 s so the TV follows changes from the dashboard on its own.
  const { data, isError } = useQuery({
    queryKey: BEERS_KEY,
    queryFn: () => apiGet<Beer[]>("/beers"),
    refetchInterval: 30_000,
  });

  const slides = useMemo<Slide[]>(() => {
    const all = (isError ? [] : (data ?? [])).filter((b) => !b.archiviata);
    const live = all.filter((b) => !b.in_arrivo);
    const onTap = (b: Beer) => b.posizione === "spina" && b.spina_n != null;
    const taps = live.filter(onTap);
    const used = new Set(taps.map((b) => b.spina_n));
    // Kegs queued on a tap: shown under the current beer, or as their own tile if the tap is empty.
    const next: Record<number, Beer> = {};
    const emptyTapsQueued: Beer[] = [];
    for (const b of all.filter((x) => x.in_arrivo && onTap(x))) {
      if (used.has(b.spina_n)) next[b.spina_n as number] = b;
      else emptyTapsQueued.push(b);
    }
    const tapBeers = [...taps, ...emptyTapsQueued].sort(byTap);
    const list: Slide[] = [{ key: "taps", kind: "taps", title: "spina", beers: tapBeers, next, page: 1, pages: 1 }];
    if (tapsOnly) return list;
    const featured = live.filter((b) => b.in_evidenza && b.disponibile).sort(byTap);
    const fridge = live.filter((b) => b.posizione === "frigo" && b.disponibile).sort((a, b) => a.nome.localeCompare(b.nome));
    return [...list, ...chunk("featured", "featured", featured), ...chunk("frigo", "frigo", fridge)];
  }, [data, isError, tapsOnly]);

  const [index, setIndex] = useState(0);
  const current = slides[index % slides.length];
  const duration = (current.kind === "taps" ? sec * 2 : sec) * 1000;

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % slides.length), duration);
    return () => clearTimeout(id);
  }, [index, slides.length, duration]);

  const rows = current.beers.length > 9 ? 4 : current.beers.length > 4 ? 3 : 2;
  const Icon = SLIDE_ICON[current.kind];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#12100E] px-[2.5vw] py-[2vw]" data-testid="tv-screen">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <BrandMark className="size-[4.4vw]" iconClassName="size-[1.8vw]" testId="tv-brand" />
          <div>
            <h1 className="font-heading text-[3vw] leading-none font-bold tracking-tight text-[#FFF9F2]">Birreria Cassina</h1>
            <p
              className={cn(
                "mt-[0.4vw] flex items-center gap-[0.5vw] font-mono text-[1.05vw] tracking-[0.3em] uppercase",
                current.kind === "frigo" ? "text-[#7DD3FC]" : "text-[#FBBF24]",
              )}
              data-testid="tv-slide-title"
            >
              <Icon className={cn("size-[1.1vw]", current.kind === "featured" && "fill-current")} />
              {t(current.title)}
              {current.pages > 1 && <span className="text-[#786C60]">{current.page}/{current.pages}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[1.5vw]">
          {slides.length > 1 && (
            <div className="flex gap-[0.4vw]" data-testid="tv-slide-dots">
              {slides.map((s, i) => (
                <span
                  key={s.key}
                  className={cn(
                    "h-[0.5vw] rounded-full transition-[width,background-color] duration-300",
                    i === index % slides.length ? "w-[2vw] bg-[#F59E0B]" : "w-[0.5vw] bg-[#3D3126]",
                  )}
                />
              ))}
            </div>
          )}
          <TvClock />
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="flex items-center gap-2 rounded-full border border-[#3D3126] px-4 py-2 text-sm text-[#B5A799] transition-colors duration-150 hover:text-[#F5EBE1]"
            data-testid="tv-fullscreen-button"
          >
            <Maximize className="size-4" /> {t("tv_fullscreen")}
          </button>
        </div>
      </header>
      <div className="relative mt-[1vw] mb-[1.5vw] h-[2px] w-full overflow-hidden bg-[#2E241B]">
        {slides.length > 1 ? (
          <div
            key={`${current.key}-${index}`}
            className="h-full origin-left bg-[linear-gradient(90deg,#D97706,#F59E0B)]"
            style={{ animation: `tv-progress ${duration}ms linear both` }}
            data-testid="tv-progress"
          />
        ) : (
          <div className="brass-rule w-[14vw]" />
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="flex min-h-0 flex-1 flex-col"
          data-testid={`tv-slide-${current.kind}`}
        >
          {current.beers.length === 0 ? (
            <p className="font-heading grid flex-1 place-items-center text-[3vw] text-[#786C60]" data-testid="tv-empty">
              {t("tv_empty")}
            </p>
          ) : (
            <main
              className="grid min-h-0 flex-1 grid-cols-3 gap-[1.2vw]"
              style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
              data-testid="tv-grid"
            >
              {current.beers.map((b) => (
                <BeerTile
                  key={b.id}
                  beer={b}
                  showLocation={current.kind === "featured"}
                  next={b.spina_n != null && !b.in_arrivo ? current.next?.[b.spina_n] : undefined}
                />
              ))}
            </main>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
