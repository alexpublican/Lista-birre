import { Clock, Star, UtensilsCrossed } from "lucide-react";
import BeerTags from "@/components/BeerTags";
import type { Beer } from "@/lib/beers";
import { LOCATION_STYLE, isBottlePhoto, isGravity, localizedDesc, localizedPairing, photoUrl } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";
import NotifyMe from "@/components/NotifyMe";

export default function BeerCard({
  beer,
  index,
  featured = false,
  showNotify = true,
}: {
  beer: Beer;
  index: number;
  featured?: boolean;
  showNotify?: boolean; // the sector layout shows "Avvisami" on the row instead
}) {
  const { t, lang, price, abv } = useI18n();
  const s = LOCATION_STYLE[beer.posizione];
  const desc = localizedDesc(beer, lang);
  const pairing = localizedPairing(beer, lang);
  const hasSizes = beer.formati.length > 0;
  const dim = !beer.disponibile && !beer.in_arrivo;
  const photo = photoUrl(beer);
  const vintage = beer.posizione === "cantina" ? beer.annata : null;
  const tapMark = beer.posizione === "spina" && beer.spina_n != null ? (
    <>
        {isGravity(beer.spina_n) && (
          <span
            className="shrink-0 rounded-md border-2 border-[#B45309] bg-[#2A1C0C] px-2 py-1 text-center text-[10px] leading-tight font-semibold tracking-wide text-[#FCD34D] uppercase"
            data-testid="beer-card-tap-number"
          >
            {t("gravity")}
          </span>
        )}
        {!isGravity(beer.spina_n) && (
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-[#F59E0B]/70 bg-[#3B260E] text-center leading-none text-[#FCD34D]"
            data-testid="beer-card-tap-number"
            aria-label={`${t("tap_n")} ${beer.spina_n}`}
          >
            <span>
              <span className="block text-[8px] tracking-[0.15em] uppercase">{t("tap_n")}</span>
              <span className="font-heading block text-lg font-bold">{beer.spina_n}</span>
            </span>
          </span>
        )}
    </>
  ) : null;
  return (
    <article
      data-testid={`${featured ? "featured" : "beer"}-card-${beer.id}`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className={cn(
        "motion-safe:animate-foam group relative rounded-lg border border-[#2E241B] border-l-4 p-5",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-950/30",
        s.card,
        s.border,
        featured && "border-[#D97706]/60 bg-[linear-gradient(135deg,#2A1C0C_0%,#1C1713_60%)] shadow-lg shadow-amber-950/40",
        dim && "opacity-55 saturate-50",
        beer.in_arrivo && "border-dashed",
      )}
    >
      {beer.in_evidenza && (
        <span
          className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/60 bg-[#3B260E] px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-[#FCD34D] uppercase"
          data-testid="beer-card-featured-badge"
        >
          <Star className="size-3 fill-current" /> {t("featured_one")}
        </span>
      )}
      <div className="flex items-start justify-between gap-4">
        {photo ? (
          <div className="relative shrink-0">
            <img
              src={photo}
              alt={beer.nome}
              loading="lazy"
              className={cn(
                "rounded-md border border-[#3D3126]",
                isBottlePhoto(beer)
                  ? "h-24 w-[4.5rem] bg-white object-contain p-1 sm:h-28 sm:w-20"
                  : "size-20 object-cover sm:size-24",
              )}
              data-testid="beer-card-photo"
            />
            {tapMark && <div className="absolute -right-2.5 -bottom-2.5 origin-bottom-right scale-90">{tapMark}</div>}
          </div>
        ) : (
          tapMark
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-xl leading-tight font-semibold text-[#FAF4EE]" data-testid="beer-card-name">
            {beer.nome}
          </h3>
          {vintage && (
            <p
              className="font-heading mt-1.5 inline-flex items-baseline gap-1.5 rounded-sm border border-[#C084FC]/50 bg-[linear-gradient(135deg,#3B1736,#24121F)] px-2 py-0.5 text-[#F0ABFC] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]"
              data-testid="beer-card-vintage"
            >
              <span className="text-[10px] tracking-[0.2em] uppercase">{t("vintage")}</span>
              <span className="text-lg leading-none font-bold">{vintage}</span>
            </p>
          )}
          <p className="mt-1 text-sm text-[#BFB0A3]" data-testid="beer-card-brewery">
            {beer.birrificio}
          </p>
        </div>
        {!hasSizes && (
          <p className={cn("font-heading text-xl font-bold whitespace-nowrap", s.price)} data-testid="beer-card-price">
            {price(beer.prezzo)}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-full border px-2.5 py-0.5 font-medium", s.badge)} data-testid="beer-card-location">
          {t(beer.posizione)}
        </span>
        {beer.stile && (
          <span className="rounded-full border border-[#57422F] px-2.5 py-0.5 text-[#E5D5C5]" data-testid="beer-card-style">
            {beer.stile}
          </span>
        )}
        <span className="font-mono text-[#E5D5C5]" data-testid="beer-card-abv">
          {abv(beer.abv)}
        </span>
        <BeerTags beer={beer} />
        {beer.in_arrivo ? (
          <span
            data-testid="beer-card-availability"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#FBBF24]/40 bg-[#3B260E] px-2.5 py-0.5 text-[#FCD34D]"
          >
            <Clock className="size-3" /> {t("arriving")}
          </span>
        ) : (
        <span
          data-testid="beer-card-availability"
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
            beer.disponibile
              ? "border-[#34D399]/30 bg-[#064E3B] text-[#6EE7B7]"
              : "border-[#57534E] bg-[#292524] text-[#A8A29E]",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              beer.disponibile ? "bg-[#34D399] motion-safe:animate-tap-pulse" : "bg-[#78716C]",
            )}
          />
          {beer.disponibile ? t("available") : t("sold_out")}
        </span>
        )}
      </div>

      {desc && (
        <p className="mt-3 text-sm leading-relaxed text-[#BFB0A3]" data-testid="beer-card-description">
          {desc}
        </p>
      )}

      {pairing && (
        <p className="mt-2.5 flex items-start gap-2 text-sm text-[#E5D5C5]" data-testid="beer-card-pairing">
          <UtensilsCrossed className="mt-0.5 size-3.5 shrink-0 text-[#FBBF24]" />
          <span>
            <span className="font-medium text-[#FBBF24]">{t("pairing")}:</span> {pairing}
          </span>
        </p>
      )}

      {hasSizes && (
        <ul className="mt-4 grid gap-1.5 border-t border-dashed border-[#57422F] pt-3 text-sm" data-testid="beer-card-sizes">
          {beer.formati.map((f, i) => (
            <li key={i} className="flex items-baseline gap-2" data-testid={`beer-card-size-${i}`}>
              {f.tipo && (
                <span className="rounded border border-[#57422F] px-1.5 text-[11px] tracking-wide text-[#FBBF24] uppercase" data-testid={`beer-card-size-type-${i}`}>
                  {t(f.tipo)}
                </span>
              )}
              <span className="text-[#E5D5C5]">{f.nome}</span>
              <span className="flex-1 border-b border-dotted border-[#57422F]" />
              <span className={cn("font-mono font-semibold", s.price)}>{price(f.prezzo)}</span>
            </li>
          ))}
        </ul>
      )}

      {beer.in_arrivo ? (
        showNotify && <NotifyMe beerId={beer.id} />
      ) : beer.disponibile ? (
        <div className="mt-4 border-t border-[#2E241B] pt-2">
          <RatingStars beerId={beer.id} />
        </div>
      ) : null}
    </article>
  );
}
