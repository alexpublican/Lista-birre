import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

// Android/Chrome: native install prompt. iPhone & others: short how-to.
export default function InstallButton() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const cls =
    "inline-flex h-10 items-center gap-2 rounded-full border border-[#D97706]/50 bg-[#3B260E]/60 px-4 text-sm font-medium text-[#FCD34D] transition-[background-color,transform] duration-150 hover:bg-[#3B260E] active:scale-95";

  if (deferred) {
    return (
      <button
        type="button"
        className={cls}
        onClick={async () => {
          await deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === "accepted") setInstalled(true);
          setDeferred(null);
        }}
        data-testid="install-button"
      >
        <Smartphone className="size-4" /> {t("install")}
      </button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger className={cls} data-testid="install-button">
        <Smartphone className="size-4" /> {t("install")}
      </PopoverTrigger>
      <PopoverContent className="w-72 border-[#3D3126] bg-[#1E1915] text-sm text-[#E5D5C5]" data-testid="install-help">
        {isIOS() ? t("install_ios") : t("install_other")}
      </PopoverContent>
    </Popover>
  );
}
