import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Languages, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";
import { BEERS_KEY } from "@/lib/beers";
import type { TranslateAllResult } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";

export default function TranslateAllDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: () => apiPost<TranslateAllResult>("/beers/translate-all"),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: BEERS_KEY });
      if (r.failed) toast.warning(`${t("translate_all_done")}: ${r.translated} · ${r.failed} ${t("translate_all_failed")}`);
      else toast.success(`${t("translate_all_done")}: ${r.translated}`);
      onOpenChange(false);
    },
    onError: () => toast.error(t("ai_failed")),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !run.isPending && onOpenChange(o)}>
      <DialogContent className="border-[#3D3126] bg-[#1A1512] sm:max-w-md" data-testid="translate-all-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-2xl">
            <Languages className="size-5 text-[#FBBF24]" /> {t("translate_all_title")}
          </DialogTitle>
          <DialogDescription className="text-[#BFB0A3]" data-testid="translate-all-body">
            {t("translate_all_body")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={run.isPending} data-testid="translate-all-cancel">
            {t("cancel")}
          </Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending} data-testid="translate-all-confirm">
            {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
            {run.isPending ? t("translate_all_running") : t("translate_all_go")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
