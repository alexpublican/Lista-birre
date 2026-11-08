import { Clock, MapPin, Phone } from "lucide-react";
import { useSettings } from "@/lib/beers";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Opening hours, address and phone — renders nothing until settings load (never blocks the page).
export default function VenueInfo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { t, lang } = useI18n();
  const { data, isError } = useSettings();
  if (!data || isError) return null;
  const light = variant === "light";
  const label = cn("font-mono text-[10px] tracking-[0.25em] uppercase", light ? "text-[#B45309]" : "text-[#FBBF24]");
  const icon = cn("mt-0.5 size-4 shrink-0", light ? "text-[#B45309]" : "text-[#D97706]");
  const text = light ? "text-[#1C1713]" : "text-[#E5D5C5]";
  // Poster (light) is always Italian; the menu follows the chosen language, falling back to Italian.
  const localized = { it: data.orari, en: data.orari_en, de: data.orari_de, fr: data.orari_fr, es: data.orari_es }[lang];
  const hours = (!light && localized) || data.orari;
  const tel = data.telefono.replace(/[^\d+]/g, "");

  return (
    <div
      className={cn("grid gap-5 text-left text-sm sm:grid-cols-3", light && "w-full")}
      data-testid={`venue-info-${variant}`}
    >
      {hours && (
        <div className="flex gap-2.5">
          <Clock className={icon} />
          <div>
            <p className={label}>{t("hours")}</p>
            <p className={cn("mt-1 whitespace-pre-line", text)} data-testid="venue-hours">{hours}</p>
          </div>
        </div>
      )}
      {data.indirizzo && (
        <div className="flex gap-2.5">
          <MapPin className={icon} />
          <div>
            <p className={label}>{t("address")}</p>
            {light ? (
              <p className={cn("mt-1", text)} data-testid="venue-address">{data.indirizzo}</p>
            ) : (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.indirizzo)}`}
                target="_blank"
                rel="noreferrer"
                className={cn("mt-1 block underline-offset-4 hover:underline", text)}
                data-testid="venue-address"
              >
                {data.indirizzo}
              </a>
            )}
          </div>
        </div>
      )}
      {data.telefono && (
        <div className="flex gap-2.5">
          <Phone className={icon} />
          <div>
            <p className={label}>{t("phone")}</p>
            {light ? (
              <p className={cn("mt-1", text)} data-testid="venue-phone">{data.telefono}</p>
            ) : (
              <a href={`tel:${tel}`} className={cn("mt-1 block underline-offset-4 hover:underline", text)} data-testid="venue-phone">
                {data.telefono}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
