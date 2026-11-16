import { useState, type ReactNode } from "react";
import { Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Riquadro che compare quando "Stampa" non può partire da qui: spiega cosa fare. */
export default function PrintHelp({ onClose, children }: { onClose: () => void; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      window.prompt("Copia questo indirizzo:", window.location.href);
    }
  };
  return (
    <div
      className="relative mx-auto mb-4 max-w-[210mm] rounded-xl border border-[#D97706]/60 bg-[#2A1E12] p-4 text-sm text-[#F5EBE1] print:hidden"
      role="alert"
      data-testid="print-help"
    >
      <button type="button" onClick={onClose} className="absolute top-2 right-2 p-1 text-[#BFB0A3]" aria-label="Chiudi">
        <X className="size-4" />
      </button>
      <p className="pr-6 font-semibold text-[#FCD34D]">Da qui il telefono non fa partire la stampa</p>
      <p className="mt-1 text-[#E7D9CC]">
        Succede quando il sito è aperto dall'icona sulla schermata Home o dentro WhatsApp, Instagram o Facebook.
        Copia il link e aprilo in <b>Safari</b> (iPhone) o <b>Chrome</b> (Android), oppure dal computer: lì «Stampa» funziona.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" onClick={copy} data-testid="print-help-copy">
          <Copy className="size-4" /> {copied ? "Link copiato" : "Copia link"}
        </Button>
        {children}
      </div>
    </div>
  );
}
