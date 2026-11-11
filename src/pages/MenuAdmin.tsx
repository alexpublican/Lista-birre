// Area gestione del menù cucina / vini / distillati / caffetteria (/admin/menu).
// Si entra con lo stesso PIN delle birre. Ogni modifica salva l'intero menù (PUT /api/menu).
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ArrowLeft, ChevronDown, ChevronUp, Eye, History, ImagePlus, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
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
  uniqueId,
  useMenu,
  type AllergeneKey,
  type MenuData,
  type SettoreKey,
  type Sezione,
  type Voce,
  type VoceArchiviata,
} from "@/lib/menu";
import "@/menu.css";

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
      toast.error("Salvataggio non riuscito, riprova");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_KEY }),
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
              <h1>Gestione menù</h1>
              <div className="brass-rule" style={{ width: 96, marginTop: 12 }} />
              <p className="status">
                <span className={`dot${save.isPending ? " warn" : menu.isError ? " err" : ""}`} />
                {save.isPending ? "Salvataggio…" : menu.isError ? "Errore di caricamento" : "Cucina, vini, distillati e caffetteria"}
              </p>
            </div>
            <div className="acts">
              <Link className="btn" to="/admin/dashboard">
                <ArrowLeft className="i" /> Birre
              </Link>
              <Link className="btn" to="/">
                <Eye className="i" /> Vedi menù
              </Link>
              <button type="button" className="btn" onClick={() => setDlg({ kind: "sec", k: tab, si: null })} disabled={!m}>
                <Plus className="i" /> Sezione
              </button>
              <button type="button" className="btn pri" onClick={() => setDlg({ kind: "item", k: tab, si: null, vi: null })} disabled={!m}>
                <Plus className="i" /> Aggiungi
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
                    <b>{x === "cibo" ? "Cibo" : SET[x].short || SET[x].label}</b>
                    <span>
                      {list.length} voci{off ? ` · ${off} esaurite` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="asearch">
            <Search className="i" />
            <input type="search" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {!m && <div className="mt-3 h-40 animate-pulse rounded-xl border border-[#2E241B] bg-[#181412]" />}

          {secs.map((s, si) => {
            const head = s.lavagna ? (
              <div className="asec-h">
                <span className="t">Lavagna</span>
                <span className="n">
                  {s.aggiornata ? (s.aggiornata === today() ? "aggiornata oggi" : "del " + s.aggiornata.split("-").reverse().slice(0, 2).join("/")) : ""}
                </span>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    if (sure === "lav") {
                      setSure(null);
                      commit((n) => {
                        for (let i = (n.settori[tab][si].voci?.length ?? 0) - 1; i >= 0; i--) archivia(n, tab, si, i);
                      }, "Lavagna svuotata: i piatti sono nello storico");
                    } else setSure("lav");
                  }}
                >
                  {sure === "lav" ? "Sicuro?" : "Svuota"}
                </button>
                <button type="button" className="ib" title="Modifica" onClick={() => setDlg({ kind: "sec", k: tab, si })}>
                  <Pencil className="i" />
                </button>
              </div>
            ) : (
              <div className="asec-h">
                <span className="t">{s.titolo}</span>
                <span className="n">{s.voci ? s.voci.length : "testo"}</span>
                <button
                  type="button"
                  className="ib"
                  title="Sposta su"
                  onClick={() =>
                    si > 0 &&
                    commit((n) => {
                      const l = n.settori[tab];
                      [l[si - 1], l[si]] = [l[si], l[si - 1]];
                    }, "Ordine aggiornato")
                  }
                >
                  <ChevronUp className="i" />
                </button>
                <button
                  type="button"
                  className="ib"
                  title="Sposta giù"
                  onClick={() =>
                    si < secs.length - 1 &&
                    commit((n) => {
                      const l = n.settori[tab];
                      [l[si + 1], l[si]] = [l[si], l[si + 1]];
                    }, "Ordine aggiornato")
                  }
                >
                  <ChevronDown className="i" />
                </button>
                <button type="button" className="ib" title="Modifica sezione" onClick={() => setDlg({ kind: "sec", k: tab, si })}>
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
                        title="Disponibile"
                        aria-label="Disponibile"
                        onClick={() =>
                          commit((n) => {
                            const x = n.settori[tab][si].voci![vi];
                            x.disponibile = x.disponibile === false;
                          }, "Disponibilità aggiornata")
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
                        title="Su"
                        onClick={() =>
                          vi > 0 &&
                          commit((n) => {
                            const l = n.settori[tab][si].voci!;
                            [l[vi - 1], l[vi]] = [l[vi], l[vi - 1]];
                          }, "Ordine aggiornato")
                        }
                      >
                        <ChevronUp className="i" />
                      </button>
                      <button type="button" className="ib" title="Modifica" onClick={() => setDlg({ kind: "item", k: tab, si, vi })}>
                        <Pencil className="i" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="textbox">{s.lavagna ? "La lavagna è vuota: nel menù non compare. Aggiungi gli speciali di oggi." : "Nessuna voce."}</div>
                )}
                <div className="addrow">
                  <button type="button" className="btn sm" onClick={() => setDlg({ kind: "item", k: tab, si, vi: null })}>
                    <Plus className="i" /> Aggiungi qui
                  </button>
                </div>
              </section>
            );
          })}

          {m && <Storico m={m} k={tab} needle={needle} commit={commit} />}

          <div style={{ marginTop: 28 }}>
            <button type="button" className="btn sm" onClick={() => setDlg({ kind: "notes" })} disabled={!m}>
              <Pencil className="i" /> Note in fondo al menù
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

/**
 * Storico del reparto aperto: le voci tolte dal menu, divise per sezione (Primi, Secondi, Dolci…),
 * nello stesso ordine del menu. Da qui si rimettono nel menu con un tocco o si eliminano per sempre.
 */
function Storico({ m, k, needle, commit }: { m: MenuData; k: SettoreKey; needle: string; commit: Commit }) {
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState<string | null>(null);
  const all = m.archivio?.[k] ?? [];
  const list = all.filter((v) => !needle || norm([v.nome, v.descrizione, v.cantina, v.sez_titolo].join(" ")).includes(needle));
  const show = open || (!!needle && list.length > 0);

  // Gruppi: prima le sezioni che esistono ancora (in ordine di menu), poi quelle eliminate (per titolo).
  const groups: { key: string; titolo: string; voci: VoceArchiviata[] }[] = [];
  const used = new Set<VoceArchiviata>();
  for (const s of m.settori[k]) {
    const voci = list.filter((v) => v.sez === s.id);
    voci.forEach((v) => used.add(v));
    if (voci.length) groups.push({ key: s.id, titolo: s.lavagna ? "Speciali del giorno (lavagna)" : s.titolo, voci });
  }
  for (const v of list) {
    if (used.has(v)) continue;
    const t = v.sez_titolo || "Altro";
    let g = groups.find((x) => x.key === "old:" + t);
    if (!g) groups.push((g = { key: "old:" + t, titolo: `${t} (sezione non più nel menu)`, voci: [] }));
    g.voci.push(v);
  }

  const elimina = (v: VoceArchiviata) => {
    if (sure !== v.id) return setSure(v.id);
    setSure(null);
    commit((n) => {
      n.archivio![k] = n.archivio![k].filter((x) => x.id !== v.id);
    }, `${v.nome} eliminata definitivamente`);
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
          Storico · {k === "cibo" ? "Cucina" : SET[k].short || SET[k].label}
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>{all.length}</span>
        <ChevronDown className="i" style={{ color: "var(--dim)", transform: show ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {show && (
        <>
          <p style={{ margin: "4px 2px 0", fontSize: 13, color: "var(--mtx)" }}>
            Voci tolte dal menu, con foto, prezzo, allergeni e descrizione. «Rimetti» le riporta nella loro sezione.
          </p>
          {!list.length ? (
            <div className="textbox" style={{ marginTop: 12, border: "1px dashed var(--border)", borderRadius: 12 }}>
              {needle ? "Nessuna voce dello storico corrisponde alla ricerca." : "Ancora niente nello storico. Quando togli una voce dal menu (Modifica → «Togli dal menu») finisce qui."}
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
                          hasSizes(v)
                            ? [v.calice != null ? eur(v.calice) : "", v.bottiglia != null ? eur(v.bottiglia) : ""].filter(Boolean).join(" / ")
                            : eur(v.prezzo),
                          v.archiviata_il && `tolta il ${dataBreve(v.archiviata_il)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn sm"
                      title="Rimetti nel menu"
                      onClick={() => {
                        const s = m.settori[k].find((x) => x.id === v.sez && x.voci);
                        const dove = s ? (s.lavagna ? "Lavagna" : s.titolo) : v.sez_titolo || "Altro";
                        commit((n) => {
                          ripristina(n, k, v.id);
                        }, `${v.nome} è tornata nel menu, in «${dove}»`);
                      }}
                    >
                      <RotateCcw className="i" /> Rimetti
                    </button>
                    <button
                      type="button"
                      className={sure === v.id ? "btn sm danger" : "ib del"}
                      title="Elimina per sempre"
                      aria-label="Elimina per sempre"
                      onClick={() => elimina(v)}
                    >
                      {sure === v.id ? "Sicuro?" : <Trash2 className="i" />}
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

function ItemDialog({ m, dlg, close, commit }: { m: MenuData; dlg: { k: SettoreKey; si: number | null; vi: number | null }; close: () => void; commit: Commit }) {
  const { k, vi } = dlg;
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
        toast.error(typeof d === "string" ? d : "Non sono riuscito a caricare l'immagine");
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
        toast.error("Il link dell'immagine deve iniziare con https://");
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
    }, isNew ? "Voce aggiunta" : "Modifiche salvate");
    close();
  };

  return (
    <Overlay close={close}>
      <form className={`dlg t-${k}`} onSubmit={submit}>
        <h2>{isNew ? "Nuova voce" : "Modifica voce"}</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mtx)" }}>{SET[k].short || SET[k].label}</p>
        <div className="fgrid">
          <div className="fld">
            <label>Nome *</label>
            <input required value={f.nome} onChange={(e) => set("nome", e.target.value)} autoFocus={isNew} />
          </div>
          <div className="fld">
            <label>Sezione</label>
            <select value={f.sez} onChange={(e) => set("sez", Number(e.target.value))}>
              {secOpts.map((x) => (
                <option key={x.s.id} value={x.i}>
                  {x.s.lavagna ? "Lavagna · Speciali del giorno" : x.s.titolo}
                </option>
              ))}
            </select>
          </div>
          {(k !== "cibo" || f.cantina) && (
            <div className="fld">
              <label>{k === "vini" ? "Cantina / produttore" : "Marca / produttore"}</label>
              <input value={f.cantina} onChange={(e) => set("cantina", e.target.value)} />
            </div>
          )}
          {k !== "cibo" && (
            <div className="fld">
              <label>Logo / foto</label>
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
                  <ImagePlus className="i" /> {preview ? "Cambia" : "Scegli"}
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
                    <X className="i" /> Togli
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
                placeholder="oppure incolla il link di un'immagine (https://…)"
                inputMode="url"
                style={{ marginTop: 8 }}
              />
              {v.foto_src && (v.foto_err ?? 0) >= 3 ? (
                <small style={{ color: "#FDBA74" }}>Non sono riuscito a scaricare questo link: prova con un altro o carica il file.</small>
              ) : v.foto_src ? (
                <small style={{ color: "var(--mtx)" }}>Immagine in arrivo: il sito la scarica da solo entro pochi minuti.</small>
              ) : null}
            </div>
          )}
          <div className="fld">
            <label>Descrizione / ingredienti</label>
            <textarea value={f.descrizione} onChange={(e) => set("descrizione", e.target.value)} />
          </div>
          <div className="fld">
            <label>Tipo di prezzo</label>
            <select value={f.wine ? "2" : "1"} onChange={(e) => set("wine", e.target.value === "2")}>
              <option value="1">Prezzo unico</option>
              <option value="2">Calice e bottiglia</option>
            </select>
          </div>
          {f.wine ? (
            <div className="f2">
              <div className="fld">
                <label>Calice €</label>
                <input inputMode="decimal" value={f.calice} onChange={(e) => set("calice", e.target.value)} />
              </div>
              <div className="fld">
                <label>Bottiglia €</label>
                <input inputMode="decimal" value={f.bottiglia} onChange={(e) => set("bottiglia", e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="f2">
              <div className="fld">
                <label>Prezzo €</label>
                <input inputMode="decimal" value={f.prezzo} onChange={(e) => set("prezzo", e.target.value)} />
              </div>
              <div />
            </div>
          )}
          {(k === "cibo" || f.abbinamento) && (
            <div className="fld">
              <label>Birra in abbinamento</label>
              <input value={f.abbinamento} onChange={(e) => set("abbinamento", e.target.value)} placeholder="es. una Pils o una IPA" />
            </div>
          )}
          <div className="fld">
            <label>Nota</label>
            <input value={f.nota} onChange={(e) => set("nota", e.target.value)} placeholder="es. Non si effettuano aggiunte" />
          </div>
          {(k === "cibo" || f.allergeniLista.length > 0 || f.senzaAllergeni || f.allergeni) && (
            <div className="fld">
              <label>Allergeni (i clienti li vedono toccando "Allergeni" in fondo alla scheda)</label>
              <div className="alg-pick">
                {ALLERGENI.map((a) => (
                  <Check
                    key={a.k}
                    label={`${a.n} · ${a.it}`}
                    on={f.allergeniLista.includes(a.k)}
                    set={(x) =>
                      setF((o) => ({
                        ...o,
                        senzaAllergeni: x ? false : o.senzaAllergeni,
                        allergeniLista: x ? [...o.allergeniLista, a.k] : o.allergeniLista.filter((y) => y !== a.k),
                      }))
                    }
                  />
                ))}
              </div>
              <div className="checks" style={{ marginTop: 8 }}>
                <Check
                  label="Nessuno dei 14 allergeni"
                  on={f.senzaAllergeni && !f.allergeniLista.length}
                  set={(x) => setF((o) => ({ ...o, senzaAllergeni: x, allergeniLista: x ? [] : o.allergeniLista }))}
                />
              </div>
              <input
                style={{ marginTop: 8 }}
                value={f.allergeni}
                onChange={(e) => set("allergeni", e.target.value)}
                placeholder="Note (facoltative), es. può contenere tracce di frutta a guscio"
              />
              <p className="hint">Se non segni nulla, il cliente legge "Chiedi pure al nostro personale".</p>
            </div>
          )}
          <div className="checks">
            <Check label="Disponibile" on={f.disponibile} set={(x) => set("disponibile", x)} />
            <Check label="In evidenza" on={f.evidenza} set={(x) => set("evidenza", x)} />
            <Check label="Novità" on={f.novita} set={(x) => set("novita", x)} />
            {k === "cibo" && <Check label="Vegetariano" on={f.vegano} set={(x) => set("vegano", x)} />}
            {k === "cibo" && <Check label="Piccante" on={f.piccante} set={(x) => set("piccante", x)} />}
          </div>
        </div>
        <div className="dlg-f">
          {!isNew && (
            <button
              type="button"
              className="btn"
              title="La voce sparisce dal menu ma resta nello storico, da dove puoi rimetterla"
              onClick={() => {
                commit((n) => archivia(n, k, si0, vi!), `${v.nome} spostata nello storico`);
                close();
              }}
            >
              <Archive className="i" /> Togli dal menu
            </button>
          )}
          <div className="r">
            <button type="button" className="btn" onClick={close}>
              Annulla
            </button>
            <button type="submit" className="btn pri" disabled={busy}>
              {busy ? "Carico l'immagine…" : "Salva"}
            </button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

function SecDialog({ m, dlg, close, commit }: { m: MenuData; dlg: { k: SettoreKey; si: number | null }; close: () => void; commit: Commit }) {
  const { k, si } = dlg;
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
    }, "Sezione salvata");
    close();
  };

  return (
    <Overlay close={close}>
      <form className={`dlg t-${k}`} onSubmit={submit}>
        <h2>{isNew ? "Nuova sezione" : "Modifica sezione"}</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mtx)" }}>{SET[k].short || SET[k].label}</p>
        <div className="fgrid">
          <div className="fld">
            <label>Titolo *</label>
            <input required value={titolo} onChange={(e) => setTitolo(e.target.value)} />
          </div>
          {isText ? (
            <div className="fld">
              <label>Testo</label>
              <textarea style={{ minHeight: 140 }} value={testo} onChange={(e) => setTesto(e.target.value)} />
            </div>
          ) : (
            <div className="fld">
              <label>{s.lavagna ? "Frase sotto il titolo della lavagna" : "Nota sotto la sezione"}</label>
              <input value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
          )}
          {isNew && (
            <div className="fld">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as "voci" | "testo")}>
                <option value="voci">Elenco di voci</option>
                <option value="testo">Riquadro di testo</option>
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
                }, s.voci?.length ? "Sezione eliminata: le voci sono nello storico" : "Sezione eliminata");
                close();
              }}
            >
              <Trash2 className="i" /> {sureDel ? (s.voci?.length ? `Confermi? Le ${s.voci.length} voci vanno nello storico` : "Conferma") : "Elimina sezione"}
            </button>
          )}
          <div className="r">
            <button type="button" className="btn" onClick={close}>
              Annulla
            </button>
            <button type="submit" className="btn pri">
              Salva
            </button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

function NotesDialog({ m, close, commit }: { m: MenuData; close: () => void; commit: Commit }) {
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
          }, "Note salvate");
          close();
        }}
      >
        <h2>Note in fondo al menù</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mtx)" }}>Una nota per riga</p>
        <div className="fgrid">
          <div className="fld">
            <textarea style={{ minHeight: 200 }} value={t} onChange={(e) => setT(e.target.value)} />
          </div>
        </div>
        <div className="dlg-f">
          <div className="r">
            <button type="button" className="btn" onClick={close}>
              Annulla
            </button>
            <button type="submit" className="btn pri">
              Salva
            </button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}
