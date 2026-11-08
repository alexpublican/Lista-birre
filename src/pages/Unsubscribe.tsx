import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { BellOff } from "lucide-react";
import HistoricHeader from "@/components/HistoricHeader";
import { apiPost } from "@/lib/api";
import type { OkResponse } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";

export default function Unsubscribe() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  // Idempotent server-side (delete by token), so a query is safe even under StrictMode.
  const res = useQuery({
    queryKey: ["unsubscribe", token],
    queryFn: () => apiPost<OkResponse>("/subscriptions/unsubscribe", { token }),
    enabled: token.length >= 10,
    retry: false,
    staleTime: Infinity,
  });

  return (
    <div className="min-h-screen">
      <HistoricHeader />
      <main className="mx-auto max-w-md px-4 pt-20">
        <div className="motion-safe:animate-foam rounded-xl border border-[#3D3126] bg-[#1E1915]/90 p-8">
          <BellOff className="size-8 text-[#F59E0B]" />
          <h1 className="font-heading mt-4 text-3xl font-semibold" data-testid="unsub-title">
            {t("unsub_title")}
          </h1>
          <p className="mt-3 text-[#B5A799]" data-testid="unsub-message">
            {res.isPending && token.length >= 10 ? "…" : res.data?.ok ? t("unsub_body") : t("unsub_done_already")}
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-[#FBBF24] hover:underline" data-testid="unsub-back-link">
            ← {t("back_menu")}
          </Link>
        </div>
      </main>
    </div>
  );
}
