import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import BrandMark from "@/components/BrandMark";
import { ApiError, apiDelete, apiPost } from "@/lib/api";
import { SETTINGS_KEY, useSettings } from "@/lib/beers";
import type { OkResponse } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { logoFormData } from "@/lib/images";

// Upload / replace / remove the venue logo. Saves immediately (independent of the settings form).
export default function LogoUploader() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const hasLogo = !!useSettings().data?.logo_version;

  const onError = (e: Error) => {
    const detail = e instanceof ApiError ? (e.body as { detail?: unknown } | null)?.detail : null;
    toast.error(typeof detail === "string" ? detail : t("error"));
  };

  const upload = useMutation({
    mutationFn: async (file: File) => apiPost<OkResponse>("/logo", await logoFormData(file)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success(t("logo_saved"));
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => apiDelete<OkResponse>("/logo"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success(t("logo_removed"));
    },
    onError,
  });

  return (
    <div className="grid gap-2 rounded-lg border border-dashed border-[#57422F] p-3" data-testid="logo-uploader">
      <Label>{t("logo")}</Label>
      <div className="flex items-center gap-3">
        <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-[#12100E] p-1.5">
          <BrandMark className="size-full" iconClassName="size-6" testId="logo-preview" />
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
            data-testid="logo-upload-button"
          >
            <ImageUp className="size-4" /> {hasLogo ? t("logo_replace") : t("logo_upload")}
          </Button>
          {hasLogo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[#F87171] hover:text-[#F87171]"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
              data-testid="logo-remove-button"
            >
              <Trash2 className="size-4" /> {t("logo_remove")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-[#B8AAA0]">{t("logo_hint")}</p>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload.mutate(f);
          e.target.value = "";
        }}
        data-testid="logo-file-input"
      />
    </div>
  );
}
