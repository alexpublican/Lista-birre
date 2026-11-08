import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, X } from "lucide-react";
import { apiDelete, apiPost } from "@/lib/api";
import { MY_RATINGS_KEY, useMyRatings } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Customer's own 1–5 star vote; one per beer per phone (server cookie).
// Tap another star to change it, tap "Rimuovi" to delete it.
export default function RatingStars({ beerId }: { beerId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const mine = useMyRatings();
  const current = mine.data?.[beerId] ?? 0;

  const setMine = (stars: number) =>
    qc.setQueryData<Record<string, number>>(MY_RATINGS_KEY, (old) => {
      const next = { ...(old ?? {}) };
      if (stars) next[beerId] = stars;
      else delete next[beerId];
      return next;
    });

  const rate = useMutation({
    mutationFn: (stars: number) => apiPost<{ stars: number }>(`/beers/${beerId}/rate`, { stars }),
    onMutate: (stars) => {
      const before = current;
      setMine(stars);
      return { before };
    },
    onSuccess: (_d, _stars, ctx) => toast.success(t(ctx?.before ? "rating_updated" : "rated_thanks")),
    onError: () => {
      toast.error(t("error"));
      qc.invalidateQueries({ queryKey: MY_RATINGS_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: () => apiDelete<{ ok: boolean }>(`/beers/${beerId}/rate`),
    onMutate: () => setMine(0),
    onSuccess: () => toast.success(t("rating_removed")),
    onError: () => {
      toast.error(t("error"));
      qc.invalidateQueries({ queryKey: MY_RATINGS_KEY });
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1" data-testid={`rating-${beerId}`}>
      <span className="text-xs text-[#BFB0A3]">{t("rate_this")}</span>
      <div className="flex" role="radiogroup" aria-label={t("rate_this")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={current === n}
            aria-label={`${n}/5`}
            onClick={() => n !== current && rate.mutate(n)}
            data-testid={`rate-${beerId}-${n}`}
            className="grid size-8 place-items-center transition-transform duration-150 active:scale-90"
          >
            <Star
              className={cn(
                "size-5 transition-colors duration-150",
                n <= current ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#57422F] hover:text-[#B45309]",
              )}
            />
          </button>
        ))}
      </div>
      {current > 0 && (
        <button
          type="button"
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          data-testid={`rate-remove-${beerId}`}
          className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[#BFB0A3] underline-offset-2 transition-colors hover:text-[#F59E0B] hover:underline"
        >
          <X className="size-3.5" />
          {t("rating_remove")}
        </button>
      )}
    </div>
  );
}
