// Pagina «Il locale»: foto della birreria che scorrono (worker/api.ts → /api/locale).
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Lang } from "@/lib/i18n";

export interface FotoLocale {
  id: string;
  /** Versione del file (cambia a ogni caricamento: serve alla cache). */
  v: string;
  /** Didascalia in italiano (facoltativa). */
  didascalia?: string;
  /** Traduzioni automatiche della didascalia. */
  tr?: Partial<Record<Exclude<Lang, "it">, string>>;
}

export interface LocaleData {
  foto: FotoLocale[];
}

export const LOCALE_KEY = ["locale"] as const;

export const useLocale = () =>
  useQuery({ queryKey: LOCALE_KEY, queryFn: () => apiGet<LocaleData>("/locale"), staleTime: 60_000 });

export const fotoLocaleUrl = (f: FotoLocale) => `/api/locale/photo/${encodeURIComponent(f.id)}?v=${encodeURIComponent(f.v)}`;

/** Didascalia nella lingua scelta (se la traduzione non c'è ancora, quella italiana). */
export const didascalia = (f: FotoLocale, lang: Lang) => (lang === "it" ? f.didascalia : f.tr?.[lang] || f.didascalia) ?? "";
