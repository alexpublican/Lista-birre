import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export const TAP_COUNT = 12; // taps 1..11 + 12 = "Botte a caduta"
export const GRAVITY_TAP = 12;
export const isGravity = (n: number | null | undefined) => n === GRAVITY_TAP;

export type Location = "spina" | "frigo" | "cantina";
export const LOCATIONS: Location[] = ["spina", "frigo", "cantina"];

// Mirrors worker/models.ts → Formato
export type Packaging = "bottiglia" | "lattina";
export const PACKAGINGS: Packaging[] = ["bottiglia", "lattina"];
export interface Formato {
  nome: string;
  prezzo: number;
  tipo: Packaging | null;
}

// Mirrors worker/models.ts → Beer
export interface Beer {
  id: string;
  nome: string;
  birrificio: string;
  stile: string;
  abv: number;
  prezzo: number;
  descrizione: string;
  descrizione_en: string;
  descrizione_de: string;
  descrizione_fr: string;
  descrizione_es: string;
  abbinamento: string;
  abbinamento_en: string;
  abbinamento_de: string;
  abbinamento_fr: string;
  abbinamento_es: string;
  formati: Formato[];
  posizione: Location;
  disponibile: boolean;
  in_evidenza: boolean;
  in_arrivo: boolean;
  senza_glutine: boolean;
  analcolica: boolean;
  cask: boolean;
  annata: number | null; // send 0 to clear
  spina_n: number | null;
  quantita: number | null; // bottiglie rimaste: arriva solo all'area gestione (ai clienti sempre null)
  ultima_bottiglia?: boolean; // solo per i clienti: true quando ne resta una
  archiviata: boolean;
  archiviata_il: string | null;
  foto_version: string | null;
  created_at: string;
  updated_at: string;
}

export type DescKey = "descrizione" | "descrizione_en" | "descrizione_de" | "descrizione_fr" | "descrizione_es";
export const DESC_FIELD: Record<"it" | "en" | "de" | "fr" | "es", DescKey> = {
  it: "descrizione",
  en: "descrizione_en",
  de: "descrizione_de",
  fr: "descrizione_fr",
  es: "descrizione_es",
};

export type PairKey = "abbinamento" | "abbinamento_en" | "abbinamento_de" | "abbinamento_fr" | "abbinamento_es";
export const PAIR_FIELD: Record<"it" | "en" | "de" | "fr" | "es", PairKey> = {
  it: "abbinamento",
  en: "abbinamento_en",
  de: "abbinamento_de",
  fr: "abbinamento_fr",
  es: "abbinamento_es",
};
export const localizedPairing = (b: Beer, lang: keyof typeof PAIR_FIELD) => b[PAIR_FIELD[lang]] || b.abbinamento;

// Description in the current language, falling back to the Italian original.
export const localizedDesc = (b: Beer, lang: keyof typeof DESC_FIELD) => b[DESC_FIELD[lang]] || b.descrizione;

// Mirrors BeerCreate
export type BeerInput = Omit<Beer, "id" | "created_at" | "updated_at" | "archiviata" | "archiviata_il" | "foto_version" | "ultima_bottiglia">;

/** "Ultima bottiglia": solo in Cantina e solo se la birra è disponibile. */
export const isLastBottle = (b: Pick<Beer, "posizione" | "disponibile" | "in_arrivo" | "quantita" | "ultima_bottiglia">) =>
  b.posizione === "cantina" && b.disponibile && !b.in_arrivo && (b.ultima_bottiglia === true || b.quantita === 1);

export const photoUrl = (b: Pick<Beer, "id" | "foto_version">) =>
  b.foto_version ? `/api/beers/${b.id}/photo?v=${b.foto_version}` : null;

/** Frigo e Cantina: la foto è la bottiglia/lattina intera, quindi va mostrata tutta (non ritagliata) su fondo chiaro. */
export const isBottlePhoto = (b: Pick<Beer, "posizione">) => b.posizione === "frigo" || b.posizione === "cantina";
// Mirrors BeerUpdate (spina_n: 0 clears the tap number)
export type BeerPatch = Partial<BeerInput>;

// Mirrors RatingSummary / AdminBeerStats / OkResponse
export interface RatingSummary {
  beer_id: string;
  avg: number;
  count: number;
}
export interface AdminBeerStats {
  ratings: RatingSummary[];
  subscribers: Record<string, number>;
}
export interface OkResponse {
  ok: boolean;
}

// Mirrors routers/backups.py → BackupInfo / RestoreResult
export interface BackupInfo {
  id: string;
  created_at: string;
  kind: "daily" | "manual" | "pre-restore";
  beer_count: number;
}
export interface RestoreResult {
  restored: BackupInfo;
  safety_backup_id: string;
}

export const MY_RATINGS_KEY = ["ratings", "mine"] as const;
export const STATS_KEY = ["admin", "stats"] as const;

export function useMyRatings() {
  return useQuery({ queryKey: MY_RATINGS_KEY, queryFn: () => apiGet<Record<string, number>>("/ratings/mine") });
}

// Tap beers sorted by tap number (unnumbered last), others by name.
export const byTap = (a: Beer, b: Beer) =>
  (a.spina_n ?? 99) - (b.spina_n ?? 99) || a.nome.localeCompare(b.nome);
// Mirrors TranslateAllResult / DescribeIn / DescribeOut
export interface TranslateAllResult {
  translated: number;
  failed: number;
}
export interface DescribeIn {
  nome: string;
  stile: string;
  parole: string[];
}
export interface DescribeOut {
  descrizione: string;
}
// Mirrors PairingIn / PairingOut
export interface PairingIn {
  nome: string;
  stile: string;
  descrizione: string;
  parole: string[];
}
export interface PairingOut {
  abbinamento: string;
}

// Mirrors AdminMe
export interface AdminMe {
  admin: boolean;
}

// Mirrors worker/models.ts → VenueSettings
export interface VenueSettings {
  orari: string;
  orari_en: string;
  orari_de: string;
  orari_fr: string;
  orari_es: string;
  indirizzo: string;
  telefono: string;
  logo_version: string | null;
  stili_filtro: string[];
  handpump_taps: number[];
}

export const BEERS_KEY = ["beers"] as const;
export const SETTINGS_KEY = ["settings"] as const;

export function useSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: () => apiGet<VenueSettings>("/settings") });
}

/** Is tap `n` a hand pump (venue setting)? Shares the settings query cache. */
export function useIsHandpump() {
  const { data } = useSettings();
  const taps = data?.handpump_taps ?? [];
  return (n: number | null | undefined) => n != null && taps.includes(n);
}

export function useBeers() {
  return useQuery({ queryKey: BEERS_KEY, queryFn: () => apiGet<Beer[]>("/beers") });
}

export const LOCATION_STYLE: Record<Location, { badge: string; border: string; card: string; price: string }> = {
  spina: {
    badge: "bg-[#3B260E] text-[#FCD34D] border-[#F59E0B]/40",
    border: "border-l-[#F59E0B]",
    card: "bg-[#1C1713]",
    price: "text-[#F59E0B]",
  },
  frigo: {
    badge: "bg-[#0C2E3A] text-[#7DD3FC] border-[#0EA5E9]/40",
    border: "border-l-[#0EA5E9]",
    card: "bg-[#161B1E]",
    price: "text-[#38BDF8]",
  },
  cantina: {
    badge: "bg-[#31182D] text-[#F0ABFC] border-[#A855F7]/40",
    border: "border-l-[#A855F7]",
    card: "bg-[#1D161A]",
    price: "text-[#C084FC]",
  },
};
