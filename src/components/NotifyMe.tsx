import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api";
import type { OkResponse } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NotifyMe({ beerId, className = "mt-4" }: { beerId: string; className?: string }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const sub = useMutation({
    mutationFn: () => apiPost<OkResponse>(`/beers/${beerId}/subscribe`, { email: email.trim(), lang }),
    onError: () => toast.error(t("error")),
  });

  if (sub.isSuccess) {
    return (
      <p className={cn(className, "flex items-center gap-2 text-sm text-[#6EE7B7]")} data-testid={`notify-ok-${beerId}`}>
        <Check className="size-4" /> {t("notify_ok")}
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className={className} onClick={() => setOpen(true)} data-testid={`notify-open-${beerId}`}>
        <BellRing className="size-4" /> {t("notify_me")}
      </Button>
    );
  }

  return (
    <form
      className={cn(className, "grid gap-1.5")}
      onSubmit={(e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.trim())) {
          toast.error(t("invalid_email"));
          return;
        }
        sub.mutate();
      }}
    >
      <div className="flex gap-2">
        <Input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("notify_placeholder")}
          className="h-9"
          data-testid={`notify-email-${beerId}`}
        />
        <Button type="submit" size="sm" className="h-9" disabled={sub.isPending} data-testid={`notify-submit-${beerId}`}>
          {t("notify_send")}
        </Button>
      </div>
      <p className="text-xs text-[#786C60]">{t("notify_privacy")}</p>
    </form>
  );
}
