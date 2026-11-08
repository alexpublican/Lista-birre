import { Barrel, Hand, Leaf, WineOff } from "lucide-react";
import type { Beer } from "@/lib/beers";
import { useIsHandpump } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TAG = "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5";

/** Gluten free / alcohol free / cask / handpump badges, shared by the full card and the compact row. */
export default function BeerTags({ beer, compact = false }: { beer: Beer; compact?: boolean }) {
  const { t } = useI18n();
  const isHandpump = useIsHandpump();
  const handpump = beer.posizione === "spina" && isHandpump(beer.spina_n);
  const size = compact ? "px-2 text-[10px]" : "";
  const icon = compact ? "size-2.5" : "size-3";
  return (
    <>
      {handpump && (
        <span className={cn(TAG, size, "border-[#D97706]/60 bg-[#2A1C0C] font-semibold tracking-wide text-[#FDBA74] uppercase")} data-testid="beer-card-handpump">
          <Hand className={icon} /> {t("handpump")}
        </span>
      )}
      {beer.cask && (
        <span className={cn(TAG, size, "border-[#A16207]/60 bg-[#29200B] font-semibold tracking-wide text-[#FDE68A] uppercase")} data-testid="beer-card-cask">
          <Barrel className={icon} /> {t("cask")}
        </span>
      )}
      {beer.senza_glutine && (
        <span className={cn(TAG, size, "border-[#84CC16]/40 bg-[#1F2A0E] text-[#BEF264]")} data-testid="beer-card-gluten-free">
          <Leaf className={icon} /> {t("gluten_free")}
        </span>
      )}
      {beer.analcolica && (
        <span className={cn(TAG, size, "border-[#38BDF8]/40 bg-[#0C2E3A] text-[#7DD3FC]")} data-testid="beer-card-alcohol-free">
          <WineOff className={icon} /> {t("alcohol_free")}
        </span>
      )}
    </>
  );
}
