// Area gestione del menù cucina / vini / distillati / caffetteria (/admin/menu).
// Si entra con lo stesso PIN delle birre. Ogni modifica salva l'intero menù (PUT /api/menu).
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ArrowLeft, ChevronDown, ChevronUp, Eye, History, ImagePlus, Languages, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import HistoricHeader from "@/components/HistoricHeader";
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { resizeImage } from "@/lib/images";
import type { AdminMe } from "@/lib/beers";
import {
  MENU_KEY,
  SET,
  ALLERGENI,
  SETTORI,
  allergeniOf,
  archivia,
  eur,
  fotoUrl,
  hasSizes,
  norm,
  ripristina,
  today,
  TR_LANGS,
  trHash,
  trValid,
  uniqueId,
  useMenu,
  type TrLang,
  type AllergeneKey,
  type MenuData,
  type SettoreKey,
  type Sezione,
  type Voce,
  type VoceArchiviata,
} from "@/lib/menu";
import { useAdminT } from "@/lib/i18nAdmin";
import type { TKey } from "@/lib/i18n";
import "@/menu.css";

// Nome breve del reparto nella lingua della gestione.
const secName = (tt: (k: TKey) => string, k: SettoreKey) => tt((k === "cibo" || k === "bar" ? `m_${k}_short` : `m_${k}`) as TKey);

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const num = (s: string): number | undefined => {
  const t = s.trim().replace("€", "").replace(",", ".");
  if (!t || Number.isNaN(Number(t))) return undefined;
  return Math.round(parseFloat(t) * 100) / 100;
};
const priceText = (n?: number) => (n == null ? "" : Number(n).toFixed(2).replace(".", ","));

type Dlg =
  | { kind: "item"; k: SettoreKey; si: number | null; vi: number | null }
  | { kind: "sec"; k: SettoreKey; si: number | null }
  | { kind: "notes" }
  | null;

export default function MenuAdmin() {
  const { a, t: tt, lang } = useAdminT();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<AdminMe>("/auth/me"), retry: false });
  const menu = useMenu();
  const qc = useQueryClient();
  const [tab, setTab] = useState<SettoreKey>("cibo");
  const [q, setQ] = useState("");
  const [dlg, setDlg] = useState<Dlg>(null);
  const [sure, setSure] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (next: MenuData) => apiPut<MenuData>("/menu", next),
    onMutate: async (next: MenuData) => {
      await qc.cancelQueries({ queryKey: MENU_KEY });
      const prev = qc.getQueryData<MenuData>(MENU_KEY);
      qc.setQueryData(MENU_KEY, next);
      return { prev };
    },
    onError: (_e, _n, ctx) => {
      if (ctx?.prev) qc.setQueryData(MENU_KEY, ctx.prev);
      toast.error(a("save_err"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENU_KEY });
      // il server traduce i testi nuovi in sottofondo: ricontrollo tra poco
      setTimeout(() => qc.invalidateQueries({ queryKey: TR_KEY }), 1500);
    },
  });

  if (me.isLoading) return <div className="min-h-screen" />;
  if (!me.data?.admin) return <Navigate to="/admin" replace />;

  const m = menu.data;
  const commit = (fn: (n: MenuData) => void, msg: string) => {
    if (!m) return;
    const next = clone(m);
    fn(next);
    const lp = m.settori.cibo.find((s) => s.lavagna);
    const ln = next.settori.cibo.find((s) => s.lavagna);
    if (ln && JSON.stringify(lp?.voci ?? []) !== JSON.stringify(ln.voci ?? [])) ln.aggiornata = today();
    save.mutate(next, { onSuccess: () => toast.success(msg) });
  };

  const needle = norm(q.trim());
  const secs = m?.settori[tab] ?? [];

  return (
    <div className="min-h-screen">
      <HistoricHeader />
      <div className="mx">
        <main className={`adm t-${tab}`}>
          <div className="adm-h">
            <div>
              <h1>{a("title")}</h1>
              <div className="brass-rule" style={{ width: 96, marginTop: 12 }} />
              <p className="status">
                <span className={`dot${save.isPending ? " warn" : menu.isError ? " err" : ""}`} />
                {save.isPending ? a("saving") : menu.isError ? a("load_err") : a("subtitle")}
              </p>
              <TranslateStatus />
            </div>
            <div className="acts">
              <Link className="btn" to="/admin/dashboard">
                <ArrowLeft className="i" /> {tt("m_beers")}
              </Link>
              <Link className="btn" to="/">
                <Eye className="i" /> {a("view_menu")}
              </Link>
              <button type="button" className="btn" onClick={() => setDlg({ kind: "sec", k: tab, si: null })} disabled={!m}>
                <Plus className="i" /> {a("section")}
              </button>
              <button type="button" className="btn pri" onClick={() => setDlg({ kind: "item", k: tab, si: null, vi: null })} disabled={!m}>
                <Plus className="i" /> {a("add")}
              </button>
            </div>
          </div>

          <div className="stats">
            <div className="g">
              {SETTORI.map((x) => {
                const list = (m?.settori[x] ?? []).flatMap((s) => s.voci ?? []);
                const off = list.filter((v) => v.disponibile === false).length;
                return (
                  <button
                    key={x}
                    type="button"
                    className={`stat t-${x}${x === tab ? " on" : ""}`}
                    onClick={() => {
                      setTab(x);
                      setQ("");
                    }}
                  >
                    <b>{secName(tt, x)}</b>
                    <span>
                      {a("n_items", { n: list.length })}
                      {off ? ` · ${a("n_out", { n: off })}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="asearch">
            <Search className="i" />
            <input type="search" placeholder={tt("m_search")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {!m && <div className="mt-3 h-40 animate-pulse rounded-xl border border-[#2E241B] bg-[#181412]" />}

          {secs.map((s, si) => {
            const head = s.lavagna ? (
              <div className="asec-h">
                <span className="t">{a("board")}</span>
                <span className="n">
                  {s.aggiornata ? (s.aggiornata === today() ? a("updated_today") : a("of_date", { d: s.aggiornata.split("-").reverse().slice(0, 2).join("/") })) : ""}
                </span>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    if (sure === "lav") {
                      setSure(null);
                      commit((n) => {
                        for (let i = (n.settori[tab][si].voci?.length ?? 0) - 1; i >= 0; i--) archivia(n, tab, si, i);
                      }, a("board_cleared"));
                    } else setSure("lav");
                  }}
                >
                  {sure === "lav" ? a("sure") : a("clear")}
                </button>
                <button type="button" className="ib" title={a("edit")} onClick={() => setDlg({ kind: "sec", k: tab, si })}>
                  <Pencil className="i" />
                </button>
              </div>
            ) : (
              <div className="asec-h">
                <span className="t">{s.titolo}</span>
                <span className="n">{s.voci ? s.voci.length : a("text")}</span>
                <button
                  type="button"
                  className="ib"
                  title={a("move_up")}
                  onClick={() =>
                    si > 0 &&
                    commit((n) => {
                      const l = n.settori[tab];
                      [l[si - 1], l[si]] = [l[si], l[si - 1]];
                    }, a("order_saved"))
                  }
                >
                  <ChevronUp className="i" />
                </button>
                <button
                  type="button"
                  className="ib"
                  title={a("move_down")}
                  onClick={() =>
                    si < secs.length - 1 &&
                    commit((n) => {
                      const l = n.settori[tab];
                      [l[si + 1], l[si]] = [l[si], l[si + 1]];
                    }, a("order_saved"))
                  }
                >
                  <ChevronDown className="i" />
                </button>
                <button type="button" className="ib" title={a("edit_section")} onClick={() => setDlg({ kind: "sec", k: tab, si })}>
                  <Pencil className="i" />
                </button>
              </div>
            );
            if (!s.voci)
              return needle ? null : (
                <section key={s.id} className="asec">
                  {head}
                  <div className="textbox">{s.testo}</div>
                </section>
              );
            const vs = s.voci.map((v, vi) => ({ v, vi })).filter(({ v }) => !needle || norm([v.nome, v.descrizione, v.cantina].join(" ")).includes(needle));
            if (needle && !vs.length) return null;
            return (
              <section key={s.id} className={`asec${s.lavagna ? " lav" : ""}`}>
                {head}
                {vs.length ? (
                  vs.map(({ v, vi }) => (
                    <div key={v.id} className={`arow${v.disponibile === false ? " out" : ""}`}>
                      <button
                        type="button"
                        className={`switch${v.disponibile !== false ? " on" : ""}`}
                        title={a("available")}
                        aria-label={a("available")}
                        onClick={() =>
                          commit((n) => {
                            const x = n.settori[tab][si].voci![vi];
                            x.disponibile = x.disponibile === false;
                          }, a("avail_saved"))
                        }
                      />
                      {fotoUrl(v) && (
                        <img
                          src={fotoUrl(v)!}
                          alt=""
                          loading="lazy"
                          style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 6, background: "#F6F0E8", padding: 3, flex: "none" }}
                        />
                      )}
                      <div className="an">
                        <b>
                          {v.nome}
                          {v.evidenza ? " ★" : ""}
                        </b>
                        <small>{[v.cantina, v.descrizione].filter(Boolean).join(" · ") || "—"}</small>
                      </div>
                      <span className="ap">
                        {hasSizes(v) ? [v.calice != null ? eur(v.calice) : "", v.bottiglia != null ? eur(v.bottiglia) : ""].filter(Boolean).join(" / ") : eur(v.prezzo)}
                      </span>
                      <button
                        type="button"
                        className="ib"
                        title={a("up")}
                        onClick={() =>
                          vi > 0 &&
                          commit((n) => {
                            const l = n.settori[tab][si].voci!;
                            [l[vi - 1], l[vi]] = [l[vi], l[vi - 1]];
                          }, a("order_saved"))
                        }
                      >
                        <ChevronUp className="i" />
                      </button>
                      <button type="button" className="ib" title={a("edit")} onClick={() => setDlg({ kind: "item", k: tab, si, vi })}>
                        <Pencil className="i" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="textbox">{s.lavagna ? a("board_empty") : a("no_items")}</div>
                )}
                <div className="addrow">
                  <button type="button" className="btn sm" onClick={() => setDlg({ kind: "item", k: tab, si, vi: null })}>
                    <Plus className="i" /> {a("add_here")}
                  </button>
                </div>
              </section>
            );
          })}

          {m && <Storico m={m} k={tab} needle={needle} commit={commit} />}

          <div style={{ marginTop: 28 }}>
            <button type="button" className="btn sm" onClick={() => setDlg({ kind: "notes" })} disabled={!m}>
              <Pencil className="i" /> {a("notes_btn")}
            </button>
          </div>
        </main>

        {m && dlg?.kind === "item" && <ItemDialog m={m} dlg={dlg} close={() => setDlg(null)} commit={commit} />}
        {m && dlg?.kind === "sec" && <SecDialog m={m} dlg={dlg} close={() => setDlg(null)} commit={commit} />}
        {m && dlg?.kind === "notes" && <NotesDialog m={m} close={() => setDlg(null)} commit={commit} />}
      </div>
    </div>
  );
}

type Commit = (fn: (n: MenuData) => void, msg: string) => void;

const dataBreve = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");

/** Marca di una voce: la parte del campo «Marca / produttore» prima del «·» (es. "Lagavulin · Islay" → "Lagavulin"). */
const marcaDi = (v: Voce) => (v.cantina ?? "").split("·")[0].trim();
const chiaveMarca = (s: string) => norm(s).replace(/\s+/g, " ").trim();

/**
 * Storico del reparto bere diviso per marca, A→Z; le voci senza marca in «Altro», in fondo.
 * Se una voce non ha marca ma il nome comincia con una marca conosciuta (es. "Coca-Cola"), va con quella.
 */
function gruppiPerMarca(m: MenuData, k: SettoreKey, list: VoceArchiviata[], altro: string) {
  const note = new Map<string, string>();
  const tutte = [...m.settori[k].flatMap((s) => s.voci ?? []), ...(m.archivio?.[k] ?? [])];
  for (const v of tutte) {
    const mk = marcaDi(v);
    if (mk && !note.has(chiaveMarca(mk))) note.set(chiaveMarca(mk), mk);
  }
  const conosciute = [...note.entries()].sort((x, y) => y[0].length - x[0].length);
  const map = new Map<string, { key: string; titolo: string; voci: VoceArchiviata[]; marca: true }>();
  for (const v of list) {
    let mk = marcaDi(v);
    if (!mk) {
      const n = chiaveMarca(v.nome);
      mk = conosciute.find(([c]) => n === c || n.startsWith(c + " "))?.[1] ?? "";
    }
    const key = mk ? chiaveMarca(mk) : "";
    let g = map.get(key);
    if (!g) map.set(key, (g = { key: "brand:" + key, titolo: mk ? (note.get(key) ?? mk) : altro, voci: [], marca: true }));
    g.voci.push(v);
  }
  const out = [...map.entries()]
    .sort(([x], [y]) => (!x ? 1 : !y ? -1 : x.localeCompare(y, "it")))
    .map(([, g]) => g);
  for (const g of out) g.voci.sort((x, y) => x.nome.localeCompare(y.nome, "it", { sensitivity: "base" }));
  return out;
}

/**
 * Storico del reparto aperto: le voci tolte dal menu, divise per sezione (Primi, Secondi, Dolci…),
 * nello stesso ordine del menu. Da qui si rimettono nel menu con un tocco o si eliminano per sempre.
 */
function Storico({ m, k, needle, commit }: { m: MenuData; k: SettoreKey; needle: string; commit: Commit }) {
  const { a, t: tt, lang } = useAdminT();
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState<string | null>(null);
  const all = m.archivio?.[k] ?? [];
  const list = all.filter((v) => !needle || norm([v.nome, v.descrizione, v.cantina, v.sez_titolo].join(" ")).includes(needle));
  const show = open || (!!needle && list.length > 0);

  // Cucina: gruppi per sezione. Reparto bere (vini, distillati, bar): gruppi per marca.
  const perMarca = k !== "cibo";
  const groups: { key: string; titolo: string; voci: VoceArchiviata[]; marca?: boolean }[] = perMarca ? gruppiPerMarca(m, k, list, a("other")) : [];
  const used = new Set<VoceArchiviata>(perMarca ? list : []);
  if (!perMarca) for (const s of m.settori[k]) {
    const voci = list.filter((v) => v.sez === s.id);
    voci.forEach((v) => used.add(v));
    if (voci.length) groups.push({ key: s.id, titolo: s.lavagna ? a("hist_board") : s.titolo, voci });
  }
  for (const v of list) {
    if (used.has(v)) continue;
    const t = v.sez_titolo || a("other");
    let g = groups.find((x) => x.key === "old:" + t);
    if (!g) groups.push((g = { key: "old:" + t, titolo: a("sec_gone", { t }), voci: [] }));
    g.voci.push(v);
  }

  const elimina = (v: VoceArchiviata) => {
    if (sure !== v.id) return setSure(v.id);
    setSure(null);
    commit((n) => {
      n.archivio![k] = n.archivio![k].filter((x) => x.id !== v.id);
    }, a("deleted_forever", { name: v.nome }));
    if (v.foto) apiDelete(`/menu/photo/${encodeURIComponent(v.id)}`).catch(() => {});
  };

  return (
    <section style={{ marginTop: 32 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={show}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px", textAlign: "left" }}
      >
        <History className="i" style={{ color: "#F59E0B", width: 20, height: 20 }} />
        <span style={{ fontFamily: "var(--head)", fontSize: 20, fontWeight: 600, color: "#FAF5EF" }}>
          {a("hist")} · {secName(tt, k)}
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>{all.length}</span>
        <ChevronDown className="i" style={{ color: "var(--dim)", transform: show ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {show && (
        <>
          <p style={{ margin: "4px 2px 0", fontSize: 13, color: "var(--mtx)" }}>
            {a(perMarca ? "hist_hint_brand" : "hist_hint")}
          </p>
          {!list.length ? (
            <div className="textbox" style={{ marginTop: 12, border: "1px dashed var(--border)", borderRadius: 12 }}>
              {needle ? a("hist_nomatch") : a("hist_empty")}
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.key} className="asec">
                <div className="asec-h">
                  <span className="t">{g.titolo}</span>
                  <span className="n">{g.voci.length}</span>
                </div>
                {g.voci.map((v) => (
                  <div key={v.id} className="arow">
                    {fotoUrl(v) && (
                      <img
                        src={fotoUrl(v)!}
                        alt=""
                        loading="lazy"
                        style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 6, background: "#F6F0E8", padding: 3, flex: "none" }}
                      />
                    )}
                    <div className="an">
                      <b>{v.nome}</b>
                      <small>
                        {[
                          g.marca && (m.settori[k].find((x) => x.id === v.sez)?.titolo || v.sez_titolo),
                          hasSizes(v)
                            ? [v.calice != null ? eur(v.calice) : "", v.bottiglia != null ? eur(v.bottiglia) : ""].filter(Boolean).join(" / ")
                            : eur(v.prezzo),
                          v.archiviata_il && a("removed_on", { d: dataBreve(v.archiviata_il) }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn sm"
                      title={a("restore_title")}
                      onClick={() => {
                        const s = m.settori[k].find((x) => x.id === v.sez && x.voci);
                        const dove = s ? (s.lavagna ? a("board") : s.titolo) : v.sez_titolo || a("other");
                        commit((n) => {
                          ripristina(n, k, v.id);
                        }, a("restored", { name: v.nome, where: dove }));
                      }}
                    >
                      <RotateCcw className="i" /> {a("restore")}
                    </button>
                    <button
                      type="button"
                      className={sure === v.id ? "btn sm danger" : "ib del"}
                      title={a("delete_forever")}
                      aria-label={a("delete_forever")}
                      onClick={() => elimina(v)}
                    >
                      {sure === v.id ? a("sure") : <Trash2 className="i" />}
                    </button>
                  </div>
                ))}
              </section>
            ))
          )}
        </>
      )}
    </section>
  );
}

function Overlay({ children, close }: { children: ReactNode; close: () => void }) {
  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === "Escape" && close()}>
      {children}
    </div>
  );
}

function Check({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className={`ck${on ? " on" : ""}`}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
}

// ------------------------------------------------------------------ traduzioni automatiche
const TR_KEY = ["menu-tr"] as const;
const LANG_NAME: Record<TrLang, string> = { en: "English", de: "Deutsch", fr: "Français", es: "Español" };

/** Quanti testi aspettano la traduzione + pulsante "Traduci adesso". */
function TranslateStatus() {
  const { a, t: tt, lang } = useAdminT();
  const qc = useQueryClient();
  const st = useQuery({
    queryKey: TR_KEY,
    queryFn: () => apiGet<{ remaining: number }>("/menu/translate"),
    refetchInterval: (q) => ((q.state.data?.remaining ?? 0) > 0 ? 60_000 : false),
  });
  const [busy, setBusy] = useState(false);
  const left = st.data?.remaining ?? 0;

  const run = async () => {
    setBusy(true);
    try {
      for (let i = 0; i < 30; i++) {
        const r = await apiPost<{ translated: number; remaining: number; error?: string }>("/menu/translate");
        qc.setQueryData(TR_KEY, { remaining: r.remaining });
        if (r.error) {
          toast.error(/429|quota|RESOURCE_EXHAUSTED/i.test(r.error) ? a("tr_pause") : r.error.includes("chiave") ? r.error : a("tr_later"));
          break;
        }
        if (r.remaining === 0) {
          toast.success(a("tr_done"));
          break;
        }
        if (r.translated === 0) break;
      }
    } catch {
      toast.error(a("tr_err"));
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: MENU_KEY });
    }
  };

  if (!st.data) return null;
  return (
    <p className="status">
      <Languages className="i" />
      {busy ? a("tr_busy") : left === 0 ? a("tr_complete") : left === 1 ? a("tr_left1") : a("tr_left", { n: left })}
      {left > 0 && (
        <button type="button" className="btn sm" onClick={run} disabled={busy}>
          {a("tr_now")}
        </button>
      )}
    </p>
  );
}

const TR_FIELDS = [
  { f: "nome", label: "f_name", long: false },
  { f: "descrizione", label: "f_desc", long: true },
  { f: "abbinamento", label: "f_pairing", long: false },
  { f: "nota", label: "f_note", long: false },
  { f: "allergeni", label: "f_allerg_note", long: false },
] as const;
type TrField = (typeof TR_FIELDS)[number]["f"];
type TrForm = Record<TrLang, Record<TrField, string>>;

function trForm(v: Voce): TrForm {
  const out = {} as TrForm;
  for (const l of TR_LANGS) {
    out[l] = {} as Record<TrField, string>;
    for (const { f } of TR_FIELDS) out[l][f] = trValid(v, l, f, v[f]) ?? "";
  }
  return out;
}

function ItemDialog({ m, dlg, close, commit }: { m: MenuData; dlg: { k: SettoreKey; si: number | null; vi: number | null }; close: () => void; commit: Commit }) {
  const { k, vi } = dlg;
  const { a, t: tt, lang } = useAdminT();
  const secOpts = m.settori[k].map((s, i) => ({ s, i })).filter((x) => x.s.voci);
  const si0 = dlg.si != null && m.settori[k][dlg.si]?.voci ? dlg.si : (secOpts[0]?.i ?? 0);
  const isNew = vi == null;
  const v: Voce = isNew ? { id: "", nome: "", disponibile: true } : m.settori[k][si0].voci![vi];
  const [f, setF] = useState({
    nome: v.nome,
    sez: si0,
    cantina: v.cantina ?? "",
    descrizione: v.descrizione ?? "",
    wine: hasSizes(v) || (isNew && k === "vini"),
    prezzo: priceText(v.prezzo),
    calice: priceText(v.calice),
    bottiglia: priceText(v.bottiglia),
    abbinamento: v.abbinamento ?? "",
    nota: v.nota ?? "",
    allergeni: v.allergeni ?? "",
    allergeniLista: allergeniOf(v).map((a) => a.k) as AllergeneKey[],
    senzaAllergeni: !!v.senza_allergeni,
    disponibile: v.disponibile !== false,
    evidenza: !!v.evidenza,
    novita: !!v.novita,
    vegano: !!v.vegano,
    piccante: !!v.piccante,
  });
  const [busy, setBusy] = useState(false);
  // Traduzioni: quelle attuali, correggibili a mano (vuoto = la rifà il sito in automatico)
  const [tr0] = useState(() => trForm(v));
  const [tr, setTr] = useState(() => trForm(v));
  const [trLang, setTrLang] = useState<TrLang>("en");
  // Logo / foto: file scelto ora (da caricare al salvataggio) oppure "togli" quello esistente.
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoGone, setPhotoGone] = useState(false);
  const [preview, setPreview] = useState<string | null>(fotoUrl(v));
  const [link, setLink] = useState(v.foto_src ?? "");
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(key: K, val: (typeof f)[K]) => setF((o) => ({ ...o, [key]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nome = f.nome.trim();
    if (!nome || busy) return;
    const nv: Voce = isNew ? { id: uniqueId(m, nome), nome } : { ...clone(v), nome };
    if (photoFile) {
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", await resizeImage(photoFile, 600, "image/webp"), "logo.webp");
        const r = await apiPost<{ foto: string }>(`/menu/photo/${encodeURIComponent(nv.id)}`, fd);
        nv.foto = r.foto;
      } catch (err) {
        const d = err instanceof ApiError ? (err.body as { detail?: unknown } | null)?.detail : null;
        toast.error(typeof d === "string" ? d : a("img_err"));
        setBusy(false);
        return;
      }
      setBusy(false);
    } else if (photoGone && nv.foto) {
      delete nv.foto;
      apiDelete(`/menu/photo/${encodeURIComponent(nv.id)}`).catch(() => {});
    }
    const l = link.trim();
    if (photoFile || !l) {
      delete nv.foto_src;
      delete nv.foto_err;
    } else if (l !== v.foto_src) {
      if (!/^https:\/\//i.test(l)) {
        toast.error(a("img_https"));
        return;
      }
      nv.foto_src = l;
      delete nv.foto_err;
    }
    for (const key of ["cantina", "descrizione", "abbinamento", "nota", "allergeni"] as const) {
      const t = f[key].trim();
      if (t) nv[key] = t;
      else delete nv[key];
    }
    delete nv.prezzo;
    delete nv.calice;
    delete nv.bottiglia;
    if (f.wine) {
      const c = num(f.calice);
      const b = num(f.bottiglia);
      if (c != null) nv.calice = c;
      if (b != null) nv.bottiglia = b;
    } else {
      const p = num(f.prezzo);
      if (p != null) nv.prezzo = p;
    }
    const al = ALLERGENI.filter((a) => f.allergeniLista.includes(a.k)).map((a) => a.k);
    if (al.length) nv.allergeni_lista = al;
    else delete nv.allergeni_lista;
    if (f.senzaAllergeni && !al.length) nv.senza_allergeni = true;
    else delete nv.senza_allergeni;
    // Traduzioni toccate a mano: valgono per il testo italiano attuale.
    for (const l of TR_LANGS)
      for (const { f: field } of TR_FIELDS) {
        const it = nv[field];
        const val = tr[l][field].trim();
        if (!it || val === tr0[l][field].trim()) continue;
        if (val) {
          nv.tr = { ...nv.tr, [l]: { ...nv.tr?.[l], [field]: val } };
          nv.trh = { ...nv.trh, [l]: { ...nv.trh?.[l], [field]: trHash(it) } };
        } else if (nv.tr?.[l]) {
          const rest = { ...nv.tr[l] };
          delete rest[field];
          nv.tr = { ...nv.tr, [l]: rest };
        }
      }
    nv.disponibile = f.disponibile;
    for (const key of ["evidenza", "novita", "vegano", "piccante"] as const) {
      if (f[key]) nv[key] = true;
      else delete nv[key];
    }
    const to = Number(f.sez);
    commit((n) => {
      if (!isNew) n.settori[k][si0].voci!.splice(vi!, 1);
      if (!isNew && to === si0) n.settori[k][to].voci!.splice(vi!, 0, nv);
      else n.settori[k][to].voci!.push(nv);
    }, isNew ? a("item_added") : a("changes_saved"));
    close();
  };

  return (
    <Overlay close={close}>
      <form className={`dlg t-${k}`} onSubmit={submit}>
        <h2>{isNew ? a("new_item") : a("edit_item")}</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mtx)" }}>{secName(tt, k)}</p>
        <div className="fgrid">
          <div className="fld">
            <label>{a("name_req")}</label>
            <input required value={f.nome} onChange={(e) => set("nome", e.target.value)} autoFocus={isNew} />
          </div>
          <div className="fld">
            <label>{a("section")}</label>
            <select value={f.sez} onChange={(e) => set("sez", Number(e.target.value))}>
              {secOpts.map((x) => (
                <option key={x.s.id} value={x.i}>
                  {x.s.lavagna ? a("board_specials") : x.s.titolo}
                </option>
              ))}
            </select>
          </div>
          {(k !== "cibo" || f.cantina) && (
            <div className="fld">
              <label>{k === "vini" ? a("winery") : a("brand")}</label>
              <input value={f.cantina} onChange={(e) => set("cantina", e.target.value)} />
            </div>
          )}
          {k !== "cibo" && (
            <div className="fld">
              <label>{a("logo")}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    background: "#F6F0E8",
                    display: "grid",
                    placeItems: "center",
                    padding: 6,
                    flex: "none",
                    overflow: "hidden",
                  }}
                >
                  {preview ? (
                    <img src={preview} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <ImagePlus className="i" style={{ color: "#8A7B6C" }} />
                  )}
                </div>
                <button type="button" className="btn sm" onClick={() => fileInput.current?.click()}>
                  <ImagePlus className="i" /> {preview ? a("change") : a("choose")}
                </button>
                {preview && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoGone(true);
                      setPreview(null);
                    }}
                  >
                    <X className="i" /> {a("remove")}
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setPhotoFile(file);
                    setPhotoGone(false);
                    setPreview(URL.createObjectURL(file));
                  }}
                />
              </div>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={a("img_link_ph")}
                inputMode="url"
                style={{ marginTop: 8 }}
              />
              {v.foto_src && (v.foto_err ?? 0) >= 3 ? (
                <small style={{ color: "#FDBA74" }}>{a("img_link_fail")}</small>
              ) : v.foto_src ? (
                <small style={{ color: "var(--mtx)" }}>{a("img_link_wait")}</small>
              ) : null}
            </div>
          )}
          <div className="fld">
            <label>{a("desc_ingr")}</label>
            <textarea value={f.descrizione} onChange={(e) => set("descrizione", e.target.value)} />
          </div>
          <div className="fld">
            <label>{a("price_type")}</label>
            <select value={f.wine ? "2" : "1"} onChange={(e) => set("wine", e.target.value === "2")}>
              <option value="1">{a("single_price")}</option>
              <option value="2">{a("glass_bottle")}</option>
            </select>
          </div>
          {f.wine ? (
            <div className="f2">
              <div className="fld">
                <label>{a("glass_eur")}</label>
                <input inputMode="decimal" value={f.calice} onChange={(e) => set("calice", e.target.value)} />
              </div>
              <div className="fld">
                <label>{a("bottle_eur")}</label>
                <input inputMode="decimal" value={f.bottiglia} onChange={(e) => set("bottiglia", e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="f2">
              <div className="fld">
                <label>{a("price_eur")}</label>
                <input inputMode="decimal" value={f.prezzo} onChange={(e) => set("prezzo", e.target.value)} />
              </div>
              <div />
            </div>
          )}
          {(k === "cibo" || f.abbinamento) && (
            <div className="fld">
              <label>{a("beer_pairing")}</label>
              <input value={f.abbinamento} onChange={(e) => set("abbinamento", e.target.value)} placeholder={a("beer_pairing_ph")} />
            </div>
          )}
          <div className="fld">
            <label>{a("note")}</label>
            <input value={f.nota} onChange={(e) => set("nota", e.target.value)} placeholder={a("note_ph")} />
          </div>
          {(k === "cibo" || f.allergeniLista.length > 0 || f.senzaAllergeni || f.allergeni) && (
            <div className="fld">
              <label>{a("allerg_label")}</label>
              <div className="alg-pick">
                {ALLERGENI.map((al) => (
                  <Check
                    key={al.k}
                    label={`${al.n} · ${lang === "it" ? al.it : al[lang]}`}
                    on={f.allergeniLista.includes(al.k)}
                    set={(x) =>
                      setF((o) => ({
                        ...o,
                        senzaAllergeni: x ? false : o.senzaAllergeni,
                        allergeniLista: x ? [...o.allergeniLista, al.k] : o.allergeniLista.filter((y) => y !== al.k),
                      }))
                    }
                  />
                ))}
              </div>
              <div className="checks" style={{ marginTop: 8 }}>
                <Check
                  label={a("no_allerg")}
                  on={f.senzaAllergeni && !f.allergeniLista.length}
                  set={(x) => setF((o) => ({ ...o, senzaAllergeni: x, allergeniLista: x ? [] : o.allergeniLista }))}
                />
              </div>
              <input
                style={{ marginTop: 8 }}
                value={f.allergeni}
                onChange={(e) => set("allergeni", e.target.value)}
                placeholder={a("allerg_note_ph")}
              />
              <p className="hint">{a("allerg_hint")}</p>
            </div>
          )}
          <details className="trbox">
            <summary>
              <Languages className="i" /> {a("tr_box")}
            </summary>
            <p className="hint">
              {a("tr_hint")}
            </p>
            <div className="checks" style={{ margin: "8px 0" }}>
              {TR_LANGS.map((l) => (
                <button key={l} type="button" className={`ck${trLang === l ? " on" : ""}`} onClick={() => setTrLang(l)}>
                  {LANG_NAME[l]}
                </button>
              ))}
            </div>
            {TR_FIELDS.filter(({ f: field }) => (f[field] ?? "").trim()).map(({ f: field, label, long }) => (
              <div className="fld" key={field} style={{ marginTop: 8 }}>
                <label>
                  {a(label)} <span style={{ color: "var(--dim)" }}>· {(f[field] as string).trim().slice(0, 60)}</span>
                </label>
                {long ? (
                  <textarea
                    value={tr[trLang][field]}
                    placeholder={a("tr_auto")}
                    onChange={(e) => setTr((o) => ({ ...o, [trLang]: { ...o[trLang], [field]: e.target.value } }))}
                  />
                ) : (
                  <input
                    value={tr[trLang][field]}
                    placeholder={field === "nome" ? a("tr_name_ph") : a("tr_auto")}
                    onChange={(e) => setTr((o) => ({ ...o, [trLang]: { ...o[trLang], [field]: e.target.value } }))}
                  />
                )}
              </div>
            ))}
          </details>
          <div className="checks">
            <Check label={a("available")} on={f.disponibile} set={(x) => set("disponibile", x)} />
            <Check label={tt("m_featured")} on={f.evidenza} set={(x) => set("evidenza", x)} />
            <Check label={tt("m_new")} on={f.novita} set={(x) => set("novita", x)} />
            {k === "cibo" && <Check label={tt("m_veg")} on={f.vegano} set={(x) => set("vegano", x)} />}
            {k === "cibo" && <Check label={tt("m_hot")} on={f.piccante} set={(x) => set("piccante", x)} />}
          </div>
        </div>
        <div className="dlg-f">
          {!isNew && (
            <button
              type="button"
              className="btn"
              title={a("archive_title")}
              onClick={() => {
                commit((n) => archivia(n, k, si0, vi!), a("archived", { name: v.nome }));
                close();
              }}
            >
              <Archive className="i" /> {a("archive")}
            </button>
          )}
          <div className="r">
            <button type="button" className="btn" onClick={close}>
              {a("cancel")}
            </button>
            <button type="submit" className="btn pri" disabled={busy}>
              {busy ? a("uploading") : a("save")}
            </button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

function SecDialog({ m, dlg, close, commit }: { m: MenuData; dlg: { k: SettoreKey; si: number | null }; close: () => void; commit: Commit }) {
  const { k, si } = dlg;
  const { a, t: tt, lang } = useAdminT();
  const isNew = si == null;
  const s: Sezione = isNew ? { id: "", titolo: "", voci: [] } : m.settori[k][si];
  const isText = !isNew && !s.voci;
  const [titolo, setTitolo] = useState(s.titolo);
  const [testo, setTesto] = useState(s.testo ?? "");
  const [nota, setNota] = useState(s.nota ?? "");
  const [tipo, setTipo] = useState<"voci" | "testo">("voci");
  const [sureDel, setSureDel] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = titolo.trim();
    if (!t) return;
    commit((n) => {
      if (isNew) {
        const ns: Sezione = { id: uniqueId(m, "s-" + t), titolo: t };
        if (tipo === "testo") ns.testo = "";
        else ns.voci = [];
        n.settori[k].push(ns);
      } else {
        const ns = n.settori[k][si];
        ns.titolo = t;
        if (isText) ns.testo = testo.trim();
        else if (nota.trim()) ns.nota = nota.trim();
        else delete ns.nota;
      }
    }, a("sec_saved"));
    close();
  };

  return (
    <Overlay close={close}>
      <form className={`dlg t-${k}`} onSubmit={submit}>
        <h2>{isNew ? a("new_sec") : a("edit_section")}</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mtx)" }}>{secName(tt, k)}</p>
        <div className="fgrid">
          <div className="fld">
            <label>{a("title_req")}</label>
            <input required value={titolo} onChange={(e) => setTitolo(e.target.value)} />
          </div>
          {isText ? (
            <div className="fld">
              <label>{a("sec_text")}</label>
              <textarea style={{ minHeight: 140 }} value={testo} onChange={(e) => setTesto(e.target.value)} />
            </div>
          ) : (
            <div className="fld">
              <label>{s.lavagna ? a("board_line") : a("sec_note")}</label>
              <input value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
          )}
          {isNew && (
            <div className="fld">
              <label>{a("type")}</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as "voci" | "testo")}>
                <option value="voci">{a("type_list")}</option>
                <option value="testo">{a("type_text")}</option>
              </select>
            </div>
          )}
        </div>
        <div className="dlg-f">
          {!isNew && !s.lavagna && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (!sureDel) return setSureDel(true);
                commit((n) => {
                  for (let i = (n.settori[k][si].voci?.length ?? 0) - 1; i >= 0; i--) archivia(n, k, si, i);
                  n.settori[k].splice(si, 1);
                }, s.voci?.length ? a("sec_deleted_items") : a("sec_deleted"));
                close();
              }}
            >
              <Trash2 className="i" /> {sureDel ? (s.voci?.length ? a("confirm_items", { n: s.voci.length }) : a("confirm")) : a("delete_sec")}
            </button>
          )}
          <div className="r">
            <button type="button" className="btn" onClick={close}>
              {a("cancel")}
            </button>
            <button type="submit" className="btn pri">
              {a("save")}
            </button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

function NotesDialog({ m, close, commit }: { m: MenuData; close: () => void; commit: Commit }) {
  const { a } = useAdminT();
  const [t, setT] = useState((m.note_finali ?? []).join("\n"));
  return (
    <Overlay close={close}>
      <form
        className="dlg"
        onSubmit={(e) => {
          e.preventDefault();
          commit((n) => {
            n.note_finali = t
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean);
          }, a("notes_saved"));
          close();
        }}
      >
        <h2>{a("notes_btn")}</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mtx)" }}>{a("one_per_line")}</p>
        <div className="fgrid">
          <div className="fld">
            <textarea style={{ minHeight: 200 }} value={t} onChange={(e) => setT(e.target.value)} />
          </div>
        </div>
        <div className="dlg-f">
          <div className="r">
            <button type="button" className="btn" onClick={close}>
              {a("cancel")}
            </button>
            <button type="submit" className="btn pri">
              {a("save")}
            </button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}
