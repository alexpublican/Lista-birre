import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { photoUrl, type Beer, type VenueSettings } from "@/lib/beers";
import { fotoLocaleUrl, type LocaleData } from "@/lib/locale";
import { fotoUrl, SETTORI, type MenuData, type Voce } from "@/lib/menu";
import { logoFormData, resizeImage } from "@/lib/images";
import { useI18n } from "@/lib/i18n";

// "Alleggerisci foto": riprende le foto già caricate (logo, galleria del locale, birre, menù),
// le ricomprime nel browser e le ricarica solo se il file nuovo è davvero più leggero.

interface Job {
  url: string;
  /** Sotto questo peso la foto va già bene e non si tocca. */
  limit: number;
  /** Il file compresso da caricare (null = non conviene). */
  shrink: (orig: Blob) => Promise<Blob | FormData | null>;
  upload: (body: FormData) => Promise<unknown>;
}

const KB = 1024;

/** Ricomprime; restituisce il nuovo file solo se pesa almeno il 20% in meno. */
const shrinkTo = (maxSide: number) => async (orig: Blob) => {
  const out = await resizeImage(orig, maxSide);
  return out.size < orig.size * 0.8 ? out : null;
};

const asForm = (b: Blob) => {
  const fd = new FormData();
  fd.append("file", b, "foto");
  return fd;
};

async function collectJobs(): Promise<Job[]> {
  const [settings, locale, beers, menu] = await Promise.all([
    apiGet<VenueSettings>("/settings"),
    apiGet<LocaleData>("/locale"),
    apiGet<Beer[]>("/beers"),
    apiGet<MenuData | null>("/menu"),
  ]);
  const jobs: Job[] = [];

  if (settings.logo_version)
    jobs.push({
      url: `/api/logo?v=${settings.logo_version}`,
      limit: 200 * KB,
      shrink: async (orig) => {
        const fd = await logoFormData(orig);
        const logo = fd.get("file");
        return logo instanceof Blob && logo.size < orig.size * 0.8 ? fd : null;
      },
      upload: (fd) => apiPost("/logo", fd),
    });

  for (const f of locale.foto)
    jobs.push({
      url: fotoLocaleUrl(f),
      limit: 600 * KB,
      shrink: shrinkTo(1920),
      upload: (fd) => apiPost(`/locale/photo/${encodeURIComponent(f.id)}/replace`, fd),
    });

  for (const b of beers) {
    const url = photoUrl(b);
    if (url)
      jobs.push({
        url,
        limit: 200 * KB,
        shrink: shrinkTo(800),
        upload: (fd) => apiPost(`/beers/${b.id}/photo`, fd),
      });
  }

  // Voci del menù (anche quelle nello storico), una volta sola per voce.
  const voci = new Map<string, Voce>();
  for (const k of SETTORI) {
    for (const s of menu?.settori?.[k] ?? []) for (const v of s.voci ?? []) if (v.foto) voci.set(v.id, v);
    for (const v of menu?.archivio?.[k] ?? []) if (v.foto && !voci.has(v.id)) voci.set(v.id, v);
  }
  for (const v of voci.values())
    jobs.push({
      url: fotoUrl(v)!,
      limit: 150 * KB,
      shrink: shrinkTo(600),
      upload: (fd) => apiPost(`/menu/photo/${encodeURIComponent(v.id)}/replace`, fd),
    });

  return jobs;
}

type State =
  | { phase: "idle" }
  | { phase: "running"; n: number; tot: number }
  | { phase: "done"; count: number; saved: number; failed: number };

export default function SlimPhotosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [state, setState] = useState<State>({ phase: "idle" });
  const running = state.phase === "running";

  async function run() {
    setState({ phase: "running", n: 0, tot: 0 });
    let count = 0;
    let saved = 0;
    let failed = 0;
    try {
      const jobs = await collectJobs();
      for (let i = 0; i < jobs.length; i++) {
        setState({ phase: "running", n: i + 1, tot: jobs.length });
        const job = jobs[i];
        try {
          const res = await fetch(job.url);
          if (!res.ok) continue;
          const orig = await res.blob();
          if (orig.size <= job.limit) continue;
          const out = await job.shrink(orig);
          if (!out) continue;
          const body = out instanceof FormData ? out : asForm(out);
          const newFile = body.get("file");
          await job.upload(body);
          count++;
          saved += orig.size - (newFile instanceof Blob ? newFile.size : 0);
        } catch (e) {
          console.warn("alleggerisci foto:", job.url, e);
          failed++;
        }
      }
    } catch (e) {
      console.warn("alleggerisci foto:", e);
      failed++;
    }
    qc.invalidateQueries();
    setState({ phase: "done", count, saved, failed });
  }

  const fill = (s: string, vars: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (running) return; // non si chiude a metà lavoro
        if (!o) setState({ phase: "idle" });
        onOpenChange(o);
      }}
    >
      <DialogContent className="border-[#3D3126] bg-[#1A1512] sm:max-w-lg" data-testid="slim-photos-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-2xl">
            <Feather className="size-5 text-[#F59E0B]" /> {t("slim")}
          </DialogTitle>
          <DialogDescription className="text-[#B8AAA0]">{t("slim_hint")}</DialogDescription>
        </DialogHeader>

        {state.phase === "running" && (
          <div className="grid gap-2" data-testid="slim-progress">
            <p className="text-sm text-[#E7D9CC]">
              {state.tot ? fill(t("slim_progress"), { n: state.n, tot: state.tot }) : "…"}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-[#2A221C]">
              <div
                className="h-full bg-[#D97706] transition-[width] duration-300"
                style={{ width: `${state.tot ? Math.round((state.n / state.tot) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {state.phase === "done" && (
          <div className="grid gap-1 text-sm" data-testid="slim-result">
            <p className="text-[#F5EBE1]">
              {fill(t("slim_done"), { n: state.count, mb: (state.saved / (KB * KB)).toFixed(1) })}
            </p>
            {state.failed > 0 && <p className="text-[#F59E0B]">{fill(t("slim_failed"), { n: state.failed })}</p>}
          </div>
        )}

        {state.phase !== "done" && (
          <Button onClick={run} disabled={running} data-testid="slim-start">
            <Feather className="size-4" /> {t("slim_start")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
