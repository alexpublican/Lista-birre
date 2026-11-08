import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { apiPost } from "@/lib/api";
import { MY_RATINGS_KEY, useMyRatings } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Customer's own 1–5 star vote; one per beer per phone (server cookie), can be changed.
export default function RatingStars({ beerId }: { beerId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const mine = useMyRatings();
  const current = mine.data?.[beerId] ?? 0;

  const rate = useMutation({
    mutationFn: (stars: number) => apiPost<{ stars: number }>(`/beers/${beerId}/rate`, { stars }),
    onMutate: (stars) => {
      qc.setQueryData<Record<string, number>>(MY_RATINGS_KEY, (old) => ({ ...(old ?? {}), [beerId]: stars }));
    },
    onSuccess: () => toast.success(t("rated_thanks")),
    onError: () => {
      toast.error(t("error"));
      qc.invalidateQueries({ queryKey: MY_RATINGS_KEY });
    },
  });

  return (
    <div className="flex items-center gap-2" data-testid={`rating-${beerId}`}>
      <span className="text-xs text-[#BFB0A3]">{t("rate_this")}</span>
      <div className="flex" role="radiogroup" aria-label={t("rate_this")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={current === n}
            aria-label={`${n}/5`}
            onClick={() => rate.mutate(n)}
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
    </div>
  );
}
