import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef } from "react";
import { DatabaseBackup, Download, RotateCcw, Save, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { BackupInfo, RestoreResult } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { exportBackup, importBackup } from "@/lib/transfer";
import { cn } from "@/lib/utils";

const BACKUPS_KEY = ["backups"] as const;

export default function BackupsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: BACKUPS_KEY, queryFn: () => apiGet<BackupInfo[]>("/backups"), enabled: open });
  const fmt = new Intl.DateTimeFormat(lang, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const make = useMutation({
    mutationFn: () => apiPost<BackupInfo>("/backups"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BACKUPS_KEY });
      toast.success(t("backup_done"));
    },
    onError: () => toast.error(t("error")),
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const importFile = useMutation({
    mutationFn: (file: File) => importBackup(file),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(t("import_done"), { duration: 8000 });
    },
    onError: (e) => {
      const detail = e instanceof ApiError ? (e.body as { detail?: unknown } | null)?.detail : null;
      toast.error(typeof detail === "string" ? detail : t("error"));
    },
  });
  const exportFile = useMutation({
    mutationFn: () => exportBackup(),
    onError: () => toast.error(t("error")),
  });
  const restore = useMutation({
    mutationFn: (id: string) => apiPost<RestoreResult>(`/backups/${id}/restore`),
    onSuccess: () => {
      // Everything restored may differ: refetch all cached data.
      qc.invalidateQueries();
      toast.success(t("backup_restored"), { duration: 8000 });
    },
    onError: () => toast.error(t("error")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#3D3126] bg-[#1A1512] sm:max-w-lg" data-testid="backups-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-2xl">
            <DatabaseBackup className="size-5 text-[#F59E0B]" /> {t("backups")}
          </DialogTitle>
          <DialogDescription className="text-[#B8AAA0]">{t("backups_hint")}</DialogDescription>
        </DialogHeader>
        <Button variant="outline" className="w-fit" disabled={make.isPending} onClick={() => make.mutate()} data-testid="backup-now-button">
          <Save className="size-4" /> {t("backup_now")}
        </Button>
        <div className="grid gap-2 rounded-lg border border-dashed border-[#57422F] p-3" data-testid="backup-transfer">
          <p className="text-xs text-[#B8AAA0]">{t("import_hint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={exportFile.isPending}
              onClick={() => exportFile.mutate()}
              data-testid="backup-export-link"
            >
              <Download className="size-4" /> {t("export_file")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={importFile.isPending}
              onClick={() => fileInput.current?.click()}
              data-testid="backup-import-button"
            >
              <Upload className="size-4" /> {t("import_file")}
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f && window.confirm(t("import_confirm"))) importFile.mutate(f);
            }}
            data-testid="backup-import-input"
          />
        </div>
        {list.data?.length === 0 && (
          <p className="rounded-lg border border-dashed border-[#3D3126] p-4 text-sm text-[#786C60]" data-testid="backups-empty">
            {t("backup_empty")}
          </p>
        )}
        <ul className="grid gap-2" data-testid="backups-list">
          {(list.data ?? []).map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-lg border border-[#2E241B] bg-[#181412] p-3" data-testid={`backup-${b.id}`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#FAF5EF] first-letter:uppercase">{fmt.format(new Date(b.created_at))}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-[#AB9C8E]">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-px",
                      b.kind === "daily" && "border-[#34D399]/30 text-[#6EE7B7]",
                      b.kind === "manual" && "border-[#F59E0B]/40 text-[#FCD34D]",
                      b.kind === "pre-restore" && "border-[#A855F7]/40 text-[#F0ABFC]",
                    )}
                  >
                    {t(`kind_${b.kind}`)}
                  </span>
                  {b.beer_count} {t("beers_word")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={restore.isPending}
                onClick={() => window.confirm(t("backup_confirm")) && restore.mutate(b.id)}
                data-testid={`backup-restore-${b.id}`}
              >
                <RotateCcw className="size-4" /> {t("backup_restore")}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
