import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HistoricHeader from "@/components/HistoricHeader";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { AdminMe } from "@/lib/beers";
import { beginSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";

export default function AdminPin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<AdminMe>("/auth/me"), retry: false });

  const login = useMutation({
    mutationFn: (p: string) => apiPost<AdminMe>("/auth/pin", { pin: p }),
    onSuccess: () => {
      beginSession();
      navigate("/admin/dashboard");
    },
    onError: (e) => {
      setErr(e instanceof ApiError && e.status === 429 ? t("pin_locked") : t("pin_wrong"));
      setPin("");
    },
  });

  if (me.data?.admin) return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="min-h-screen">
      <HistoricHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 pt-16 sm:pt-24">
        <div className="motion-safe:animate-foam rounded-xl border border-[#3D3126] bg-[#1E1915]/90 p-8 shadow-2xl shadow-black/40">
          <span className="grid size-12 place-items-center rounded-full border border-[#D97706]/60 bg-[#3B260E] text-[#F59E0B]">
            <KeyRound className="size-5" />
          </span>
          <h1 className="font-heading mt-5 text-3xl font-semibold tracking-tight" data-testid="pin-title">
            {t("pin_title")}
          </h1>
          <div className="brass-rule mt-3 w-20" />
          <p className="mt-3 text-sm text-[#B5A799]">{t("pin_prompt")}</p>
          <form
            className="mt-6 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              if (pin) login.mutate(pin);
            }}
          >
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="h-12 text-center font-mono text-2xl tracking-[0.5em]"
              data-testid="pin-input"
              aria-label="PIN"
            />
            {err && (
              <p className="text-sm text-[#F87171]" data-testid="pin-error">
                {err}
              </p>
            )}
            <Button type="submit" size="lg" className="h-12" disabled={login.isPending || !pin} data-testid="pin-submit">
              {t("enter")}
            </Button>
          </form>
          <Link to="/" className="mt-5 inline-block text-sm text-[#FBBF24] hover:underline" data-testid="back-to-menu-link">
            ← {t("back_menu")}
          </Link>
        </div>
      </main>
    </div>
  );
}
