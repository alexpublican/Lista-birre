import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiError, apiDelete, apiPatch, apiPost } from "@/lib/api";
import { resizeImage } from "@/lib/images";
import { ImagePlus, Loader2, Plus, Sparkles, Trash2, UtensilsCrossed, X } from "lucide-react";
import { BEERS_KEY, DESC_FIELD, LOCATIONS, PACKAGINGS, PAIR_FIELD, STATS_KEY, TAP_COUNT, isGravity, photoUrl, useBeers } from "@/lib/beers";
import type { Beer, BeerInput, DescribeIn, DescribeOut, Location, Packaging, PairingIn, PairingOut } from "@/lib/beers";
import { LANGS, useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FormState {
  nome: string;
  birrificio: string;
  stile: string;
  abv: string;
  prezzo: string;
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
  formati: { nome: string; prezzo: string; tipo: Packaging }[];
  posizione: Location;
  disponibile: boolean;
  in_evidenza: boolean;
  in_arrivo: boolean;
  senza_glutine: boolean;
  analcolica: boolean;
  cask: boolean;
  annata: string;
  spina_n: string;
  quantita: string;
}

function toForm(beer: Beer | null, presetTap?: number): FormState {
  return {
    nome: beer?.nome ?? "",
    birrificio: beer?.birrificio ?? "",
    stile: beer?.stile ?? "",
    abv: beer ? String(beer.abv) : "",
    prezzo: beer ? String(beer.prezzo) : "",
    descrizione: beer?.descrizione ?? "",
    descrizione_en: beer?.descrizione_en ?? "",
    descrizione_de: beer?.descrizione_de ?? "",
    descrizione_fr: beer?.descrizione_fr ?? "",
    descrizione_es: beer?.descrizione_es ?? "",
    abbinamento: beer?.abbinamento ?? "",
    abbinamento_en: beer?.abbinamento_en ?? "",
    abbinamento_de: beer?.abbinamento_de ?? "",
    abbinamento_fr: beer?.abbinamento_fr ?? "",
    abbinamento_es: beer?.abbinamento_es ?? "",
    formati: (beer?.formati ?? []).map((f) => ({ nome: f.nome, prezzo: String(f.prezzo), tipo: f.tipo ?? "bottiglia" })),
    posizione: beer?.posizione ?? "spina",
    disponibile: beer?.disponibile ?? true,
    in_evidenza: beer?.in_evidenza ?? false,
    in_arrivo: beer?.in_arrivo ?? false,
    senza_glutine: beer?.senza_glutine ?? false,
    analcolica: beer?.analcolica ?? false,
    cask: beer?.cask ?? false,
    annata: beer?.annata ? String(beer.annata) : "",
    spina_n: beer?.spina_n != null ? String(beer.spina_n) : presetTap ? String(presetTap) : "0",
    quantita: beer?.quantita != null ? String(beer.quantita) : "",
  };
}

const num = (v: string) => Number(v.replace(",", "."));

export default function BeerDialog({
  open,
  beer,
  presetTap,
  onOpenChange,
}: {
  open: boolean;
  beer: Beer | null;
  presetTap?: number;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(beer, presetTap));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const localPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile]);
  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);
  const preview = localPreview ?? (!photoRemoved && beer ? photoUrl(beer) : null);
  const { data: allBeers } = useBeers();
  // A tap has one beer pouring and, separately, one beer waiting ("in arrivo") for it.
  const tapInfo = (n: number) => {
    const others = (allBeers ?? []).filter((b) => b.spina_n === n && !b.archiviata && b.id !== beer?.id);
    const pouring = others.find((b) => !b.in_arrivo)?.nome;
    const waiting = others.find((b) => b.in_arrivo)?.nome;
    if (form.in_arrivo) {
      if (waiting) return { blocked: true, note: `${t("already_waiting")}: ${waiting}` };
      if (pouring) return { blocked: false, note: `${t("tap_pouring")}: ${pouring} — ${t("will_replace")}` };
    } else if (pouring) {
      return { blocked: true, note: `${t("tap_occupied_by")} ${pouring}` };
    }
    return { blocked: false, note: t("tap_free") };
  };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const [descLang, setDescLang] = useState<Lang>("it");
  const descKey = DESC_FIELD[descLang];
  const pairKey = PAIR_FIELD[descLang];
  const isTap = form.posizione === "spina";
  const setSize = (i: number, k: "nome" | "prezzo" | "tipo", v: string) =>
    setForm((f) => ({ ...f, formati: f.formati.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  const [keywords, setKeywords] = useState("");
  const describe = useMutation({
    mutationFn: (body: DescribeIn) => apiPost<DescribeOut>("/beers/ai-description", body),
    onSuccess: (d) => {
      set("descrizione", d.descrizione);
      toast.success(t("ai_done"));
    },
    onError: () => toast.error(t("ai_failed")),
  });
  const pairing = useMutation({
    mutationFn: (body: PairingIn) => apiPost<PairingOut>("/beers/ai-pairing", body),
    onSuccess: (d) => {
      set("abbinamento", d.abbinamento);
      toast.success(t("ai_pairing_done"));
    },
    onError: () => toast.error(t("ai_failed")),
  });
  const parseKeywords = () => keywords.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean).slice(0, 6);
  const suggestPairing = () => {
    const parole = parseKeywords();
    if (!form.stile.trim() && !form.descrizione.trim() && !parole.length) {
      toast.error(t("ai_need_style"));
      return;
    }
    pairing.mutate({ nome: form.nome.trim(), stile: form.stile.trim(), descrizione: form.descrizione.trim(), parole });
  };
  const writeWithAi = () => {
    const parole = parseKeywords();
    if (!parole.length) {
      toast.error(t("ai_need_keywords"));
      return;
    }
    describe.mutate({ nome: form.nome.trim(), stile: form.stile.trim(), parole });
  };

  const save = useMutation({
    mutationFn: async (body: BeerInput) => {
      const saved = beer ? await apiPatch<Beer>(`/beers/${beer.id}`, body) : await apiPost<Beer>("/beers", body);
      // Photo goes after the beer exists; a photo failure must not lose (or duplicate) the saved beer.
      try {
        if (photoFile) {
          const fd = new FormData();
          fd.append("file", await resizeImage(photoFile, 800, "image/webp"), "photo.webp");
          await apiPost<Beer>(`/beers/${saved.id}/photo`, fd);
        } else if (photoRemoved && beer?.foto_version) {
          await apiDelete<Beer>(`/beers/${saved.id}/photo`);
        }
      } catch (e) {
        const detail = e instanceof ApiError ? (e.body as { detail?: unknown } | null)?.detail : null;
        toast.error(`${t("photo_failed")}${typeof detail === "string" ? `: ${detail}` : ""}`);
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BEERS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
      toast.success(t("saved"));
      onOpenChange(false);
    },
    onError: (e) => {
      const detail = e instanceof ApiError && e.status === 409 ? (e.body as { detail?: string } | null)?.detail : null;
      toast.error(detail ?? t("error"));
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const abv = num(form.abv);
    const prezzo = num(form.prezzo);
    if (!form.nome.trim() || form.abv === "" || form.prezzo === "" || Number.isNaN(abv) || Number.isNaN(prezzo)) {
      toast.error(t("required"));
      return;
    }
    // Tap sizes are free names; fridge/cellar sizes carry bottle/can + quantity.
    const formati = form.formati
      .filter((f) => f.nome.trim() || f.prezzo.trim())
      .map((f) => ({ nome: f.nome.trim(), prezzo: num(f.prezzo), tipo: isTap ? null : f.tipo }));
    const annata = form.posizione === "cantina" && form.annata.trim() ? Number(form.annata.trim()) : 0;
    if (annata && (!Number.isInteger(annata) || annata < 1800 || annata > 2100)) {
      toast.error(t("vintage_invalid"));
      return;
    }
    if (formati.some((f) => !f.nome || Number.isNaN(f.prezzo))) {
      toast.error(t("size_invalid"));
      return;
    }
    save.mutate({
      nome: form.nome.trim(),
      birrificio: form.birrificio.trim(),
      stile: form.stile.trim(),
      abv,
      prezzo,
      descrizione: form.descrizione.trim(),
      descrizione_en: form.descrizione_en.trim(),
      descrizione_de: form.descrizione_de.trim(),
      descrizione_fr: form.descrizione_fr.trim(),
      descrizione_es: form.descrizione_es.trim(),
      abbinamento: form.abbinamento.trim(),
      abbinamento_en: form.abbinamento_en.trim(),
      abbinamento_de: form.abbinamento_de.trim(),
      abbinamento_fr: form.abbinamento_fr.trim(),
      abbinamento_es: form.abbinamento_es.trim(),
      formati,
      posizione: form.posizione,
      disponibile: form.disponibile,
      in_evidenza: form.in_evidenza,
      in_arrivo: form.in_arrivo,
      senza_glutine: form.senza_glutine,
      analcolica: form.analcolica,
      cask: form.cask,
      annata,
      spina_n: form.posizione === "spina" ? Number(form.spina_n) : 0,
      quantita: form.posizione === "cantina" && form.quantita.trim() ? Number(form.quantita.trim()) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#3D3126] bg-[#1A1512] sm:max-w-lg" data-testid="beer-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{beer ? t("edit_beer") : t("add_beer")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" data-testid="beer-form">
          <div className="flex items-center gap-3" data-testid="beer-form-photo">
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-[#57422F] bg-[#12100E]">
              {preview ? (
                <img src={preview} alt="" className="size-full object-cover" data-testid="beer-form-photo-preview" />
              ) : (
                <ImagePlus className="size-6 text-[#57422F]" />
              )}
            </span>
            <div className="grid gap-1.5">
              <Label>{t("photo")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} data-testid="beer-form-photo-choose">
                  <ImagePlus className="size-4" /> {preview ? t("photo_replace") : t("photo_choose")}
                </Button>
                {preview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[#F87171] hover:text-[#F87171]"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoRemoved(true);
                    }}
                    data-testid="beer-form-photo-remove"
                  >
                    <Trash2 className="size-4" /> {t("photo_remove")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-[#B8AAA0]">{t("photo_hint")}</p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPhotoFile(f);
                  setPhotoRemoved(false);
                }
                e.target.value = "";
              }}
              data-testid="beer-form-photo-input"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nome">{t("name")} *</Label>
            <Input id="nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} data-testid="beer-form-nome" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="birrificio">{t("brewery")}</Label>
              <Input id="birrificio" value={form.birrificio} onChange={(e) => set("birrificio", e.target.value)} data-testid="beer-form-birrificio" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stile">{t("style")}</Label>
              <Input id="stile" value={form.stile} onChange={(e) => set("stile", e.target.value)} data-testid="beer-form-stile" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="abv">{t("abv")} *</Label>
              <Input id="abv" inputMode="decimal" value={form.abv} onChange={(e) => set("abv", e.target.value)} data-testid="beer-form-abv" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prezzo">{t("price")} *</Label>
              <Input id="prezzo" inputMode="decimal" value={form.prezzo} onChange={(e) => set("prezzo", e.target.value)} data-testid="beer-form-prezzo" />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("location")}</Label>
              <Select value={form.posizione} onValueChange={(v: string) => set("posizione", v as Location)}>
                <SelectTrigger className="w-full" data-testid="beer-form-posizione">
                  <SelectValue>{(v) => t(v as Location)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l} data-testid={`beer-form-posizione-${l}`}>
                      {t(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.posizione === "spina" && (
            <div className="grid gap-1.5">
              <Label>{t("tap_n")}</Label>
              <Select value={form.spina_n} onValueChange={(v: string) => set("spina_n", v)}>
                <SelectTrigger className="w-full" data-testid="beer-form-spina-n">
                  <SelectValue>
                    {(v) => (v === "0" ? t("tap_none") : isGravity(Number(v)) ? t("gravity") : `${t("tap_n")} ${v as string}`)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" data-testid="beer-form-spina-n-0">{t("tap_none")}</SelectItem>
                  {Array.from({ length: TAP_COUNT }, (_, i) => i + 1).map((n) => {
                    const info = tapInfo(n);
                    return (
                      <SelectItem key={n} value={String(n)} disabled={info.blocked} data-testid={`beer-form-spina-n-${n}`}>
                        {isGravity(n) ? t("gravity") : `${t("tap_n")} ${n}`} · {info.note}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          {form.posizione === "cantina" && (
            <div className="grid gap-1.5">
              <Label htmlFor="annata">{t("vintage")}</Label>
              <Input
                id="annata"
                inputMode="numeric"
                maxLength={4}
                placeholder="2018"
                className="w-32"
                value={form.annata}
                onChange={(e) => set("annata", e.target.value.replace(/\D/g, ""))}
                data-testid="beer-form-annata"
              />
              <p className="text-xs text-[#B8AAA0]">{t("vintage_hint")}</p>
            </div>
          )}
          {form.posizione === "cantina" && (
            <div className="grid gap-1.5">
              <Label htmlFor="quantita">{t("stock")}</Label>
              <Input
                id="quantita"
                inputMode="numeric"
                maxLength={4}
                placeholder="3"
                className="w-32"
                value={form.quantita}
                onChange={(e) => set("quantita", e.target.value.replace(/\D/g, ""))}
                data-testid="beer-form-quantita"
              />
              <p className="text-xs text-[#B8AAA0]">{t("stock_hint")}</p>
            </div>
          )}
          {(
            <div className="grid gap-2 rounded-lg border border-dashed border-[#57422F] p-3" data-testid="beer-form-sizes">
              <Label>{isTap ? t("sizes") : t("sizes_pack")}</Label>
              <p className="text-xs text-[#B8AAA0]">{isTap ? t("sizes_hint") : t("sizes_pack_hint")}</p>
              {form.formati.map((f, i) => (
                <div key={i} className="flex gap-2">
                  {!isTap && (
                    <Select value={f.tipo} onValueChange={(v: string) => setSize(i, "tipo", v)}>
                      <SelectTrigger className="w-32 shrink-0" data-testid={`beer-form-size-type-${i}`}>
                        <SelectValue>{(v) => t(v as Packaging)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PACKAGINGS.map((p) => (
                          <SelectItem key={p} value={p} data-testid={`beer-form-size-type-${i}-${p}`}>
                            {t(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    placeholder={isTap ? t("size_name") : t("qty_name")}
                    value={f.nome}
                    onChange={(e) => setSize(i, "nome", e.target.value)}
                    data-testid={`beer-form-size-name-${i}`}
                  />
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    placeholder="€"
                    value={f.prezzo}
                    onChange={(e) => setSize(i, "prezzo", e.target.value)}
                    data-testid={`beer-form-size-price-${i}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("remove_size")}
                    onClick={() => set("formati", form.formati.filter((_, j) => j !== i))}
                    data-testid={`beer-form-size-remove-${i}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              {form.formati.length < 8 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => set("formati", [...form.formati, { nome: "", prezzo: "", tipo: "bottiglia" }])}
                  data-testid="beer-form-add-size"
                >
                  <Plus className="size-4" /> {t("add_size")}
                </Button>
              )}
            </div>
          )}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="descrizione">{t("description")}</Label>
              <div className="flex rounded-full border border-[#3D3126] p-0.5" data-testid="beer-form-desc-lang">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setDescLang(l.code)}
                    aria-pressed={descLang === l.code}
                    data-testid={`beer-form-desc-lang-${l.code}`}
                    className={cn(
                      "h-6 rounded-full px-2 font-mono text-[11px] transition-colors duration-150",
                      descLang === l.code ? "bg-[#D97706] text-white" : "text-[#B8AAA0] hover:text-[#FAF5EF]",
                      l.code !== "it" && (form[DESC_FIELD[l.code]] || form[PAIR_FIELD[l.code]]) && descLang !== l.code && "text-[#6EE7B7]",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              id="descrizione"
              rows={3}
              value={form[descKey]}
              onChange={(e) => set(descKey, e.target.value)}
              placeholder={descLang !== "it" ? form.descrizione : undefined}
              data-testid="beer-form-descrizione"
            />
            {descLang === "it" && (
              <div className="grid gap-1.5 rounded-lg border border-[#3D3126] bg-[#14110F] p-2.5" data-testid="beer-form-ai">
                <Label htmlFor="ai-keywords" className="flex items-center gap-1.5 text-xs text-[#FBBF24]">
                  <Sparkles className="size-3.5" /> {t("ai_keywords")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ai-keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        writeWithAi();
                      }
                    }}
                    placeholder={t("ai_keywords_placeholder")}
                    data-testid="beer-form-ai-keywords"
                  />
                  <Button type="button" variant="outline" className="shrink-0" onClick={writeWithAi} disabled={describe.isPending} data-testid="beer-form-ai-write">
                    {describe.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {t("ai_write")}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit text-[#FBBF24] hover:text-[#FCD34D]"
                  onClick={suggestPairing}
                  disabled={pairing.isPending}
                  data-testid="beer-form-ai-pairing"
                >
                  {pairing.isPending ? <Loader2 className="size-4 animate-spin" /> : <UtensilsCrossed className="size-4" />} {t("ai_pairing")}
                </Button>
              </div>
            )}
            <Label htmlFor="abbinamento" className="mt-2">{t("pairing_label")}</Label>
            <Input
              id="abbinamento"
              value={form[pairKey]}
              onChange={(e) => set(pairKey, e.target.value)}
              placeholder={descLang !== "it" ? form.abbinamento : "Es. formaggi stagionati"}
              data-testid="beer-form-abbinamento"
            />
            <p className="text-xs text-[#B8AAA0]" data-testid="beer-form-translate-hint">{t("desc_hint")}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={form.disponibile} onCheckedChange={(c) => set("disponibile", Boolean(c))} data-testid="beer-form-disponibile" />
              {t("available")}
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={form.in_evidenza} onCheckedChange={(c) => set("in_evidenza", Boolean(c))} data-testid="beer-form-in-evidenza" />
              {t("featured_one")}
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={form.in_arrivo} onCheckedChange={(c) => set("in_arrivo", Boolean(c))} data-testid="beer-form-in-arrivo" />
              {t("arriving")}
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={form.senza_glutine} onCheckedChange={(c) => set("senza_glutine", Boolean(c))} data-testid="beer-form-senza-glutine" />
              {t("gluten_free")}
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={form.analcolica} onCheckedChange={(c) => set("analcolica", Boolean(c))} data-testid="beer-form-analcolica" />
              {t("alcohol_free")}
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={form.cask} onCheckedChange={(c) => set("cask", Boolean(c))} data-testid="beer-form-cask" />
              {t("cask")}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="beer-form-cancel">
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending} data-testid="save-beer-btn">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
