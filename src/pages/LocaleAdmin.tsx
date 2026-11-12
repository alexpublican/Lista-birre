// Gestione delle foto della pagina «Il locale» (/admin/locale). Stesso PIN delle birre.
// Le foto vengono ridimensionate nel telefono prima dell'invio (lato lungo 1920 px, WEBP).
import { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, ImagePlus, Trash2 } from "lucide-react";
import HistoricHeader from "@/components/HistoricHeader";
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { resizeImage } from "@/lib/images";
import type { AdminMe } from "@/lib/beers";
import { LOCALE_KEY, fotoLocaleUrl, useLocale, type LocaleData } from "@/lib/locale";
import { useAdminT } from "@/lib/i18nAdmin";
import "@/menu.css";

const MAX = 40;

const errText = (e: unknown, fallback: string) => {
  const d = e instanceof ApiError ? (e.body as { detail?: unknown } | null)?.detail : null;
  return typeof d === "string" ? d : fallback;
};

export default function LocaleAdmin() {
  const { a, t } = useAdminT();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<AdminMe>("/auth/me"), retry: false });
  const locale = useLocale();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (me.isLoading) return <div className="min-h-screen" />;
  if (!me.data?.admin) return <Navigate to="/admin" replace />;

  const foto = locale.data?.foto ?? [];
  const set = (d: LocaleData) => qc.setQueryData(LOCALE_KEY, d);

  const upload = async (files: FileList | null) => {
    const list = [...(files ?? [])];
    if (!list.length) return;
    if (foto.length + list.length > MAX) {
      toast.error(a("loc_max"));
      list.splice(Math.max(0, MAX - foto.length));
      if (!list.length) return;
    }
    let ok = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        setBusy(a("loc_uploading", { n: i + 1, m: list.length }));
        const fd = new FormData();
        fd.append("file", await resizeImage(list[i], 1920, "image/webp"), "foto.webp");
        set(await apiPost<LocaleData>("/locale/photo", fd));
        ok++;
      }
      toast.success(a("loc_uploaded"));
    } catch (e) {
      toast.error(errText(e, a("save_err")));
      if (ok) qc.invalidateQueries({ queryKey: LOCALE_KEY });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  /** Salva ordine e didascalie. */
  const save = async (next: LocaleData["foto"], msg?: string) => {
    const prev = locale.data;
    set({ foto: next });
    try {
      set(await apiPut<LocaleData>("/locale", { foto: next.map((f) => ({ id: f.id, didascalia: f.didascalia ?? "" })) }));
      if (msg) toast.success(msg);
    } catch (e) {
      if (prev) set(prev);
      toast.error(errText(e, a("save_err")));
    }
  };

  const moveTo = (i: number, j: number) => {
    if (j < 0 || j >= foto.length) return;
    const next = [...foto];
    const [x] = next.splice(i, 1);
    next.splice(j, 0, x);
    save(next);
  };

  const saveCaption = (id: string) => {
    const text = drafts[id];
    if (text === undefined) return;
    const f = foto.find((x) => x.id === id);
    if (!f || (f.didascalia ?? "") === text.trim()) return;
    save(
      foto.map((x) => (x.id === id ? { ...x, didascalia: text.trim() } : x)),
      a("loc_saved"),
    );
  };

  const remove = async (id: string) => {
    if (sure !== id) {
      setSure(id);
      setTimeout(() => setSure((s) => (s === id ? null : s)), 3000);
      return;
    }
    setSure(null);
    try {
      set(await apiDelete<LocaleData>(`/locale/photo/${encodeURIComponent(id)}`));
      toast.success(a("loc_removed"));
    } catch (e) {
      toast.error(errText(e, a("save_err")));
    }
  };

  return (
    <div className="min-h-screen">
      <HistoricHeader />
      <div className="mx">
        <main className="adm t-locale">
          <div className="adm-h">
            <div>
              <h1>{t("loc_photos")}</h1>
              <div className="brass-rule" style={{ width: 96, marginTop: 12 }} />
              <p className="status">
                <span className={`dot${busy ? " warn" : locale.isError ? " err" : ""}`} />
                {busy ?? (locale.isError ? a("load_err") : a("loc_sub"))}
              </p>
            </div>
            <div className="acts">
              <Link className="btn" to="/admin/dashboard">
                <ArrowLeft className="i" /> {t("m_beers")}
              </Link>
              <Link className="btn" to="/locale">
                <Eye className="i" /> {a("loc_view")}
              </Link>
              <button
                type="button"
                className="btn pri"
                onClick={() => input.current?.click()}
                disabled={!!busy || !locale.data || foto.length >= MAX}
                data-testid="locale-add"
              >
                <ImagePlus className="i" /> {a("loc_add")}
              </button>
              <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={(e) => upload(e.target.files)}
              />
            </div>
          </div>

          <p className="lhint">{a("loc_tips")}</p>

          {locale.data && foto.length === 0 && <p className="lhint">{a("loc_none")}</p>}

          <div className="lgrid">
            {foto.map((f, i) => (
              <div className="lcard" key={f.id} data-testid="locale-card">
                <div className="ph">
                  <img src={fotoLocaleUrl(f)} alt="" loading="lazy" decoding="async" />
                  <b>{String(i + 1).padStart(2, "0")}</b>
                </div>
                <div className="bd">
                  <input
                    value={drafts[f.id] ?? f.didascalia ?? ""}
                    maxLength={140}
                    placeholder={a("loc_caption")}
                    onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                    onBlur={() => saveCaption(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                  <div className="row2">
                    <button type="button" className="ib" onClick={() => moveTo(i, i - 1)} disabled={i === 0} aria-label="Su">
                      <ArrowUp className="i" />
                    </button>
                    <button
                      type="button"
                      className="ib"
                      onClick={() => moveTo(i, i + 1)}
                      disabled={i === foto.length - 1}
                      aria-label="Giù"
                    >
                      <ArrowDown className="i" />
                    </button>
                    <span className="sp" />
                    <button type="button" className={`btn sm${sure === f.id ? " danger" : ""}`} onClick={() => remove(f.id)}>
                      <Trash2 className="i" /> {sure === f.id ? a("sure") : t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
