import { Beer as BeerIcon } from "lucide-react";
import { useSettings } from "@/lib/beers";
import { cn } from "@/lib/utils";

/**
 * The venue's logo when one is uploaded, otherwise the brass beer-mug mark.
 * `className` sizes the box; `iconClassName` sizes the fallback icon.
 */
export default function BrandMark({
  className,
  iconClassName,
  tone = "dark",
  testId = "brand-mark",
  hideFallback = false,
}: {
  hideFallback?: boolean;
  className?: string;
  iconClassName?: string;
  tone?: "dark" | "light";
  testId?: string;
}) {
  const { data, isError } = useSettings();
  const v = !isError ? data?.logo_version : null;

  if (v) {
    return (
      <img
        src={`/api/logo?v=${v}`}
        alt="Birreria Cassina"
        className={cn("shrink-0 object-contain", className)}
        data-testid={`${testId}-logo`}
      />
    );
  }
  if (hideFallback) return null;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border",
        tone === "dark" ? "border-[#D97706]/60 bg-[#3B260E] text-[#F59E0B]" : "border-2 border-[#B45309] text-[#B45309]",
        className,
      )}
      data-testid={`${testId}-fallback`}
    >
      <BeerIcon className={iconClassName} />
    </span>
  );
}
