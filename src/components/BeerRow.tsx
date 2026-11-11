import { ChevronRight } from "lucide-react";
import type { Beer } from "@/lib/beers";
import { LOCATION_STYLE, isBottlePhoto, isGravity, localizedStyle, photoUrl } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import BeerTags from "@/components/BeerTags";
import NotifyMe from "@/components/NotifyMe";

/** Compact one-line beer entry for the sector layout; tapping opens the full card. */
export default function BeerRow({
  beer,
  index,
  onOpen,
}: {
  beer: Beer;
  index: number;
  onOpen: (b: Beer) => void;
}) {
  const { t, lang, price, abvOf } = useI18n();
  const s = LOCATION_STYLE[beer.posizione];
  const photo = photoUrl(beer);
  const out = !beer.disponibile && !beer.in_arrivo;
  const onTap = beer.posizione === "spina" && beer.spina_n != null;

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      className={cn(
        "motion-safe:animate-foam min-w-0 rounded-lg border border-[#2E241B] bg-[#1A1512]/80 p-3",
        "transition-[border-color,background-color] duration-150 hover:border-[#57422F] hover:bg-[#1E1915]",
        out && "opacity-50 saturate-50",
        beer.in_arrivo && "border-dashed",
      )}
      data-testid={`beer-row-${beer.id}`}
    >
      <button
        type="button"
        onClick={() => onOpen(beer)}
        className="group flex w-full min-w-0 items-center gap-3 text-left transition-transform duration-150 active:scale-[0.99]"
        data-testid={`beer-row-open-${beer.id}`}
      >
        {photo ? (
          <span className="relative shrink-0" data-testid="beer-row-photo">
            <img
              src={photo}
              alt={beer.nome}
              loading="lazy"
              className={cn(
                "rounded-md border border-[#3D3126]",
                isBottlePhoto(beer)
                  ? "h-16 w-12 bg-white object-contain p-0.5 sm:h-[4.5rem] sm:w-14"
                  : "size-16 object-cover sm:size-[4.5rem]",
              )}
            />
            {onTap && (
              <span
                className={cn(
                  "font-heading absolute -bottom-1.5 -left-1.5 grid min-w-7 place-items-center rounded-full border-2 border-[#F59E0B] bg-[#3B260E] px-1 text-sm leading-6 font-bold text-[#FCD34D] shadow-[0_2px_8px_rgba(0,0,0,0.6)]",
                  isGravity(beer.spina_n) && "rounded-md px-1.5 text-[8px] leading-4 tracking-wide uppercase",
                )}
                data-testid="beer-row-tap"
              >
                {isGravity(beer.spina_n) ? t("gravity") : beer.spina_n}
              </span>
            )}
          </span>
        ) : onTap ? (
          <span
            className={cn(
              "font-heading grid size-11 shrink-0 place-items-center rounded-full border-2 border-[#F59E0B]/70 bg-[#3B260E] text-lg font-bold text-[#FCD34D]",
              isGravity(beer.spina_n) &&
                "rounded-md border-[#B45309] text-[9px] leading-tight tracking-wide uppercase",
            )}
            data-testid="beer-row-tap"
          >
            {isGravity(beer.spina_n) ? t("gravity") : beer.spina_n}
          </span>
        ) : (
          <span
            className={cn("size-11 shrink-0 rounded-md border", s.badge)}
            aria-hidden
          />
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span
              className="font-heading line-clamp-2 min-w-0 text-lg leading-tight font-semibold break-words text-[#FAF4EE]"
              data-testid="beer-row-name"
            >
              {beer.nome}
            </span>
            {beer.posizione === "cantina" && beer.annata && (
              <span
                className="font-heading shrink-0 text-sm font-bold text-[#F0ABFC]"
                data-testid="beer-row-vintage"
              >
                {beer.annata}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[#BFB0A3]">
            {[beer.birrificio, localizedStyle(beer, lang), abvOf(beer)]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
            <BeerTags beer={beer} compact />
            {out && (
              <span className="rounded-full bg-[#292524] px-2 text-[10px] text-[#A8A29E]">
                {t("sold_out")}
              </span>
            )}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          {beer.formati.length > 0 ? (
            <span
              className="grid gap-0.5 text-right"
              data-testid="beer-row-sizes"
            >
              {beer.formati.map((f, i) => (
                <span
                  key={i}
                  className="flex flex-col items-end whitespace-nowrap sm:flex-row sm:items-baseline sm:justify-end sm:gap-1.5"
                  data-testid={`beer-row-size-${i}`}
                >
                  <span className="text-[11px] leading-tight text-[#BFB0A3]">
                    {f.tipo ? `${t(f.tipo)} ` : ""}
                    {f.nome}
                  </span>
                  <span
                    className={cn(
                      "font-heading text-base leading-tight font-bold",
                      s.price,
                    )}
                  >
                    {price(f.prezzo)}
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span
              className={cn(
                "font-heading text-lg font-bold whitespace-nowrap",
                s.price,
              )}
              data-testid="beer-row-price"
            >
              {price(beer.prezzo)}
            </span>
          )}
          <span className="inline-flex items-center text-[11px] tracking-wide text-[#B5A799] uppercase transition-colors duration-150 group-hover:text-[#FBBF24]">
            {t("open_card")}{" "}
            <ChevronRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </span>
        </span>
      </button>
      {beer.in_arrivo && (
        <NotifyMe beerId={beer.id} className="mt-2.5 sm:ml-14" />
      )}
    </div>
  );
}
