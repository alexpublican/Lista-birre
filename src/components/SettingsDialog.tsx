import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPut } from "@/lib/api";
import LogoUploader from "@/components/LogoUploader";
import { GRAVITY_TAP, SETTINGS_KEY } from "@/lib/beers";
import type { VenueSettings } from "@/lib/beers";
import { LANGS, useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type HoursKey = "orari" | "orari_en" | "orari_de" | "orari_fr" | "orari_es";

export default function SettingsDialog({
  open,
  initial,
  onOpenChange,
}: {
  open: boolean;
  initial: VenueSettings;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<VenueSettings>(initial);
  const [newStyle, setNewStyle] = useState("");
  const [hoursLang, setHoursLang] = useState<Lang>("it");
  const hoursKey: HoursKey = hoursLang === "it" ? "orari" : `orari_${hoursLang}`;

  const save = useMutation({
    mutationFn: (body: VenueSettings) => apiPut<VenueSettings>("/settings", body),
    onSuccess: (data) => {
      qc.setQueryData(SETTINGS_KEY, data);
      toast.success(t("settings_saved"));
      onOpenChange(false);
    },
    onError: () => toast.error(t("error")),
  });

  const addStyle = () => {
    const v = newStyle.trim();
    if (!v || form.stili_filtro.some((s) => s.toLowerCase() === v.toLowerCase())) return;
    setForm((f) => ({ ...f, stili_filtro: [...f.stili_filtro, v] }));
    setNewStyle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#3D3126] bg-[#1A1512] sm:max-w-lg" data-testid="settings-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{t("settings")}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          <LogoUploader />
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="orari">{t("hours")}</Label>
              <div className="flex rounded-full border border-[#3D3126] p-0.5" data-testid="settings-hours-lang">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setHoursLang(l.code)}
                    aria-pressed={hoursLang === l.code}
                    data-testid={`settings-hours-lang-${l.code}`}
                    className={cn(
                      "h-6 rounded-full px-2 font-mono text-[11px] transition-colors duration-150",
                      hoursLang === l.code ? "bg-[#D97706] text-white" : "text-[#B8AAA0] hover:text-[#FAF5EF]",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              id="orari"
              rows={3}
              value={form[hoursKey]}
              onChange={(e) => setForm({ ...form, [hoursKey]: e.target.value })}
              placeholder={hoursLang !== "it" ? form.orari : undefined}
              data-testid="settings-orari"
            />
            {hoursLang !== "it" && <p className="text-xs text-[#B8AAA0]">{t("hours_hint")}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="indirizzo">{t("address")}</Label>
            <Input id="indirizzo" value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} data-testid="settings-indirizzo" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="telefono">{t("phone")}</Label>
            <Input id="telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} data-testid="settings-telefono" />
          </div>
          <div className="grid gap-2 rounded-lg border border-dashed border-[#57422F] p-3" data-testid="settings-handpumps">
            <Label>{t("handpump_taps")}</Label>
            <p className="text-xs text-[#B8AAA0]">{t("handpump_hint")}</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: GRAVITY_TAP - 1 }, (_, i) => i + 1).map((n) => {
                const on = form.handpump_taps.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        handpump_taps: on ? f.handpump_taps.filter((x) => x !== n) : [...f.handpump_taps, n].sort((a, b) => a - b),
                      }))
                    }
                    className={cn(
                      "font-heading grid size-9 place-items-center rounded-full border text-sm font-bold transition-[background-color,color,transform] duration-150 active:scale-95",
                      on ? "border-[#D97706] bg-[#D97706] text-[#12100E]" : "border-[#3D3126] text-[#B8AAA0] hover:text-[#F5EBE1]",
                    )}
                    data-testid={`settings-handpump-${n}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2 rounded-lg border border-dashed border-[#57422F] p-3">
            <Label>{t("style_filters")}</Label>
            <p className="text-xs text-[#B8AAA0]">{t("style_filters_hint")}</p>
            <div className="flex flex-wrap gap-2" data-testid="settings-styles">
              {form.stili_filtro.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full border border-[#57422F] py-0.5 pr-1 pl-3 text-sm" data-testid={`settings-style-${s}`}>
                  {s}
                  <button
                    type="button"
                    aria-label={`${t("delete")} ${s}`}
                    onClick={() => setForm((f) => ({ ...f, stili_filtro: f.stili_filtro.filter((x) => x !== s) }))}
                    className="grid size-5 place-items-center rounded-full text-[#B8AAA0] transition-colors duration-150 hover:bg-[#2E241B] hover:text-[#F87171]"
                    data-testid={`settings-style-remove-${s}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newStyle}
                onChange={(e) => setNewStyle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStyle();
                  }
                }}
                placeholder={t("new_style")}
                data-testid="settings-new-style"
              />
              <Button type="button" variant="outline" onClick={addStyle} data-testid="settings-add-style">
                <Plus className="size-4" /> {t("add_style")}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="settings-cancel">
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending} data-testid="settings-save">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
