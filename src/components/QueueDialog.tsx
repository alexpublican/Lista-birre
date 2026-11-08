import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, apiPost } from "@/lib/api";
import { BEERS_KEY, STATS_KEY, TAP_COUNT, isGravity } from "@/lib/beers";
import type { Beer } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";

// Storico → "In arrivo": pick the tap the beer will wait for (it may be occupied; one waiting beer per tap).
export default function QueueDialog({
  beer,
  allBeers,
  onOpenChange,
}: {
  beer: Beer | null;
  allBeers: Beer[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tap, setTap] = useState("0");

  const queue = useMutation({
    mutationFn: (b: Beer) => apiPost<Beer>(`/beers/${b.id}/queue`, { spina_n: Number(tap) }),
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: BEERS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
      toast.success(`${b.nome} → ${t("coming_soon")}`);
      onOpenChange(false);
    },
    onError: (e) => {
      const detail = e instanceof ApiError ? (e.body as { detail?: unknown } | null)?.detail : null;
      toast.error(typeof detail === "string" ? detail : t("error"));
    },
  });

  const info = (n: number) => {
    const others = allBeers.filter((b) => b.spina_n === n && !b.archiviata && b.id !== beer?.id);
    const waiting = others.find((b) => b.in_arrivo)?.nome;
    const pouring = others.find((b) => !b.in_arrivo)?.nome;
    if (waiting) return { blocked: true, note: `${t("already_waiting")}: ${waiting}` };
    if (pouring) return { blocked: false, note: `${t("tap_pouring")}: ${pouring} — ${t("will_replace")}` };
    return { blocked: false, note: t("tap_free") };
  };

  return (
    <Dialog open={!!beer} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#3D3126] bg-[#1A1512] sm:max-w-md" data-testid="queue-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-2xl">
            <Clock className="size-5 text-[#FBBF24]" /> {t("queue")}
          </DialogTitle>
          <DialogDescription className="text-[#B8AAA0]">
            <b className="text-[#FAF5EF]">{beer?.nome}</b> — {t("queue_hint")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>{t("tap_n")}</Label>
          <Select value={tap} onValueChange={(v: string) => setTap(v)}>
            <SelectTrigger className="w-full" data-testid="queue-tap-select">
              <SelectValue>{(v) => (v === "0" ? t("tap_none") : isGravity(Number(v)) ? t("gravity") : `${t("tap_n")} ${v as string}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0" data-testid="queue-tap-0">{t("tap_none")}</SelectItem>
              {Array.from({ length: TAP_COUNT }, (_, i) => i + 1).map((n) => {
                const x = info(n);
                return (
                  <SelectItem key={n} value={String(n)} disabled={x.blocked} data-testid={`queue-tap-${n}`}>
                    {isGravity(n) ? t("gravity") : `${t("tap_n")} ${n}`} · {x.note}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="queue-cancel">
            {t("cancel")}
          </Button>
          <Button disabled={!beer || queue.isPending} onClick={() => beer && queue.mutate(beer)} data-testid="queue-confirm">
            <Clock className="size-4" /> {t("queue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
