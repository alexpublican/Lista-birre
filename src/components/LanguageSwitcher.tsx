import { LANGS, setLang, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher() {
  const { lang } = useI18n();
  return (
    <div
      className="flex items-center rounded-full border border-[#3D3126] bg-[#1E1915]/80 p-0.5"
      role="group"
      aria-label="Language"
      data-testid="language-switcher"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          data-testid={`lang-${l.code}`}
          className={cn(
            "h-8 min-w-9 rounded-full px-2 font-mono text-xs tracking-wider transition-colors duration-150 active:scale-95",
            lang === l.code ? "bg-[#D97706] text-white" : "text-[#B5A799] hover:text-[#F5EBE1]",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
