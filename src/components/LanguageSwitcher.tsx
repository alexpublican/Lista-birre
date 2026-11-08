import { useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LANGS, setLang, useI18n, type Lang } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Each language written in its own language, so a foreign customer recognises it.
const NATIVE: Record<Lang, string> = {
  it: "Italiano",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

export default function LanguageSwitcher() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Language: ${NATIVE[current.code]}`}
        data-testid="language-switcher"
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full border border-[#3D3126] bg-[#1E1915]/80 pl-2.5 pr-2",
          "font-mono text-xs tracking-wider text-[#F5EBE1] transition-colors duration-150",
          "hover:border-[#D97706]/60 active:scale-95 data-[popup-open]:border-[#D97706]",
        )}
      >
        <Globe className="size-4 text-[#D97706]" aria-hidden />
        <span>{current.label}</span>
        <ChevronDown
          className={cn("size-3.5 text-[#B5A799] transition-transform duration-150", open && "rotate-180")}
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-48 gap-0.5 rounded-xl border border-[#3D3126] bg-[#1E1915] p-1.5 text-[#F5EBE1] shadow-xl ring-0"
      >
        {LANGS.map((l) => {
          const active = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              aria-pressed={active}
              data-testid={`lang-${l.code}`}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150",
                active ? "bg-[#D97706]/15 text-[#F5EBE1]" : "text-[#B5A799] hover:bg-[#2A221C] hover:text-[#F5EBE1]",
              )}
            >
              <span className="w-6 font-mono text-xs tracking-wider text-[#D97706]">{l.label}</span>
              <span className="flex-1">{NATIVE[l.code]}</span>
              {active && <Check className="size-4 text-[#D97706]" aria-hidden />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
