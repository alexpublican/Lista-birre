import { useState, type ReactNode } from "react";
import { Archive, BellRing, Camera, Clock, Cylinder, Ellipsis, Pencil, Star, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Beer, BeerPatch } from "@/lib/beers";
import { isBottlePhoto, isGravity, photoUrl } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** La birra non ha la foto (conta solo per Frigo e Cantina, dove serve la bottiglia). */
export const missingPhoto = (b: Beer) => b.posizione !== "spina" && !b.foto_version;
/** Gradazione non inserita (0 e non analcolica). */
export const missingAbv = (b: Beer) => !(b.abv > 0) && !b.analcolica;

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  testId,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150",
        danger ? "text-[#F87171] hover:bg-[#3A1A1A]" : "text-[#E7D9CC] hover:bg-[#2A221C] hover:text-[#FAF5EF]",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
    </button>
  );
}

/** Una riga compatta dell'area gestione: tocchi la riga per modificarla, i comandi veloci sono a destra. */
export default function AdminBeerRow({
  beer: b,
  rating,
  subscribers,
  onEdit,
  onPatch,
  onArchive,
  onDelete,
  onMarkArrived,
}: {
  beer: Beer;
  rating?: { avg: number; count: number };
  subscribers: number;
  onEdit: () => void;
  onPatch: (body: BeerPatch) => void;
  onArchive: () => void;
  onDelete: () => void;
  onMarkArrived: () => void;
}) {
  const { t, price, abv } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const photo = photoUrl(b);
  const counted = b.posizione === "cantina" && b.quantita != null;
  const out = !b.disponibile && !b.in_arrivo;
  const sizes = b.formati.map((f) => f.nome).filter(Boolean).join(" / ");
  const close = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <li
      className={cn(
        "flex items-center gap-2 border-b border-[#2E241B] px-2 py-2 last:border-b-0 sm:gap-3 sm:px-3",
        out && "opacity-55",
      )}
      data-testid={`beer-row-${b.id}`}
    >
      {/* Parte sinistra: tocchi e si apre la modifica */}
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left transition-colors duration-150 hover:bg-[#211B16] sm:gap-3"
        data-testid={`edit-beer-${b.id}`}
      >
        {b.spina_n != null && (
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full bg-[#3B260E] font-mono text-xs text-[#FCD34D]"
            data-testid="beer-row-tap"
          >
            {isGravity(b.spina_n) ? <Cylinder className="size-3.5" /> : b.spina_n}
          </span>
        )}
        {photo ? (
          <img
            src={photo}
            alt=""
            loading="lazy"
            className={cn(
              "shrink-0 rounded",
              isBottlePhoto(b) ? "h-12 w-9 bg-white object-contain p-px" : "size-11 object-cover",
            )}
            data-testid="beer-row-photo"
          />
        ) : missingPhoto(b) ? (
          <span
            className="grid h-12 w-9 shrink-0 place-items-center rounded border border-dashed border-[#B45309]/70 text-[#F59E0B]"
            title={t("f_no_photo")}
            data-testid="beer-row-no-photo"
          >
            <Camera className="size-4" />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="truncate font-medium text-[#FAF5EF]" data-testid="beer-row-name">
              {b.nome}
            </span>
            {b.annata && <span className="shrink-0 font-mono text-xs font-semibold text-[#F0ABFC]">{b.annata}</span>}
            {b.in_evidenza && <Star className="size-3.5 shrink-0 fill-[#F59E0B] text-[#F59E0B]" aria-label={t("featured_one")} />}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-[#AB9C8E]">
            {b.posizione === "spina" && b.birrificio && <span className="truncate">{b.birrificio}</span>}
            {sizes && <span className="shrink-0">{sizes}</span>}
            {missingAbv(b) ? (
              <span className="shrink-0 rounded bg-[#3B260E] px-1 font-mono text-[11px] text-[#FBBF24]" title={t("f_no_abv")}>
                {t("abv_missing")}
              </span>
            ) : (
              <span className="shrink-0 font-mono">{abv(b.abv)}</span>
            )}
            {b.stile && <span className="hidden truncate md:inline">· {b.stile}</span>}
          </span>
        </span>
        <span className="shrink-0 font-mono text-sm text-[#E7D9CC]" data-testid="beer-row-price">
          {price(b.prezzo)}
        </span>
      </button>

      {/* Stato: bottiglie (Cantina), in arrivo, oppure disponibile/esaurita */}
      <div className="flex shrink-0 items-center gap-1.5">
        {b.in_arrivo ? (
          <button
            type="button"
            title={t("mark_arrived")}
            onClick={onMarkArrived}
            data-testid={`mark-arrived-${b.id}`}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-[#FBBF24]/50 bg-[#3B260E] px-2.5 text-xs font-medium text-[#FCD34D] transition-[background-color,transform] duration-150 hover:bg-[#4A3012] active:scale-95"
          >
            <Clock className="size-3" /> <span className="hidden sm:inline">{t("arriving")}</span>
            {subscribers > 0 && (
              <span className="inline-flex items-center gap-0.5" data-testid={`subs-${b.id}`}>
                <BellRing className="size-3" />
                {subscribers}
              </span>
            )}
          </button>
        ) : counted ? (
          <div className="flex items-center gap-1" data-testid={`stock-${b.id}`}>
            <button
              type="button"
              title={t("sold_one")}
              aria-label={t("sold_one")}
              disabled={(b.quantita ?? 0) <= 0}
              onClick={() => onPatch({ quantita: Math.max(0, (b.quantita ?? 1) - 1) })}
              data-testid={`stock-minus-${b.id}`}
              className="grid size-8 place-items-center rounded-full border border-[#57422F] text-base leading-none text-[#E7D9CC] transition-transform duration-150 hover:bg-[#2E241B] active:scale-90 disabled:opacity-30"
            >
              −
            </button>
            <span
              className={cn(
                "min-w-9 text-center font-mono text-xs",
                b.quantita === 1 ? "text-[#F9A8D4]" : b.quantita === 0 ? "text-[#78716C]" : "text-[#E7D9CC]",
              )}
            >
              {b.quantita === 0 ? t("sold_out") : `${b.quantita} ${t("bottles_short")}`}
            </span>
            <button
              type="button"
              title={t("added_one")}
              aria-label={t("added_one")}
              onClick={() => onPatch({ quantita: (b.quantita ?? 0) + 1 })}
              data-testid={`stock-plus-${b.id}`}
              className="grid size-8 place-items-center rounded-full border border-[#57422F] text-base leading-none text-[#E7D9CC] transition-transform duration-150 hover:bg-[#2E241B] active:scale-90"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={b.disponibile}
            title={b.disponibile ? t("available") : t("sold_out")}
            onClick={() => onPatch({ disponibile: !b.disponibile })}
            data-testid={`toggle-available-${b.id}`}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
              b.disponibile ? "border-[#34D399]/30 bg-[#064E3B] text-[#6EE7B7]" : "border-[#57534E] bg-[#292524] text-[#A8A29E]",
            )}
          >
            <span className={cn("size-2 rounded-full", b.disponibile ? "bg-[#34D399]" : "bg-[#78716C]")} />
            <span className="hidden sm:inline">{b.disponibile ? t("available") : t("sold_out")}</span>
          </button>
        )}

        {/* Altri comandi, raccolti in un menu per non fare confusione */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            aria-label={t("actions")}
            data-testid={`beer-menu-${b.id}`}
            className="grid size-8 place-items-center rounded-full text-[#AB9C8E] transition-colors duration-150 hover:bg-[#2E241B] hover:text-[#FAF5EF] data-[popup-open]:bg-[#2E241B]"
          >
            <Ellipsis className="size-4" />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-60 gap-0.5 rounded-xl border border-[#3D3126] bg-[#1E1915] p-1.5 text-[#F5EBE1] shadow-xl ring-0"
          >
            <p className="truncate px-3 pt-1.5 pb-1 text-xs text-[#AB9C8E]">
              {b.nome}
              {rating && (
                <span className="ml-2 inline-flex items-center gap-0.5 font-mono">
                  <Star className="size-3 fill-[#F59E0B] text-[#F59E0B]" />
                  {rating.avg.toFixed(1)} ({rating.count})
                </span>
              )}
            </p>
            <MenuItem icon={<Pencil className="size-4" />} label={t("edit_beer")} onClick={close(onEdit)} />
            <MenuItem
              icon={<Star className={cn("size-4", b.in_evidenza && "fill-[#F59E0B] text-[#F59E0B]")} />}
              label={t("featured_one")}
              onClick={close(() => onPatch({ in_evidenza: !b.in_evidenza }))}
              testId={`toggle-featured-${b.id}`}
            />
            {counted && (
              <MenuItem
                icon={<span className="grid size-4 place-items-center rounded-full bg-[#34D399]/20 text-[10px] text-[#6EE7B7]">●</span>}
                label={b.disponibile ? t("sold_out") : t("available")}
                onClick={close(() => onPatch({ disponibile: !b.disponibile }))}
                testId={`toggle-available-${b.id}`}
              />
            )}
            <MenuItem
              icon={<Archive className="size-4" />}
              label={t("take_off_tap")}
              onClick={close(onArchive)}
              testId={`archive-beer-${b.id}`}
            />
            <MenuItem
              icon={<Trash2 className="size-4" />}
              label={t("delete")}
              danger
              onClick={close(onDelete)}
              testId={`delete-beer-${b.id}`}
            />
          </PopoverContent>
        </Popover>
      </div>
    </li>
  );
}
