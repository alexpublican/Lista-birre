import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api";
import type { OkResponse } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";

export default function ChangePinDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: () => apiPost<OkResponse>("/auth/change-pin", { current_pin: current, new_pin: next }),
    onSuccess: () => {
      toast.success(t("pin_changed"));
      onOpenChange(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 400) setErr(t("pin_current_wrong"));
      else if (e instanceof ApiError && e.status === 429) setErr(t("pin_locked"));
      else setErr(t("error"));
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^\d{4,12}$/.test(next)) return setErr(t("pin_format"));
    if (next !== confirm) return setErr(t("pin_mismatch"));
    change.mutate();
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete={id === "current-pin" ? "current-password" : "new-password"}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="font-mono tracking-[0.3em]"
        data-testid={id}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#3D3126] bg-[#1A1512] sm:max-w-sm" data-testid="change-pin-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{t("change_pin")}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {field("current-pin", t("current_pin"), current, setCurrent)}
          {field("new-pin", t("new_pin"), next, setNext)}
          {field("confirm-pin", t("confirm_pin"), confirm, setConfirm)}
          {err && (
            <p className="text-sm text-[#F87171]" data-testid="change-pin-error">
              {err}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="change-pin-cancel">
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={change.isPending || !current || !next} data-testid="change-pin-submit">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
