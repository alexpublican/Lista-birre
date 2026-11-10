// Area gestione del menù cucina / vini / distillati / caffetteria (/admin/menu).
// Si entra con lo stesso PIN delle birre. Ogni modifica salva l'intero menù (PUT /api/menu).
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import HistoricHeader from "@/components/HistoricHeader";
import { apiGet, apiPut } from "@/lib/api";
import type { AdminMe } from "@/lib/beers";
import {
  MENU_KEY,
  SET,
  SETTORI,
  eur,
  hasSizes,
  norm,
  today,
  uniqueId,
  useMenu,
  type MenuData,
  type SettoreKey,
  type Sezione,
  type Voce,
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
                        n.settori[tab][si].voci = [];
                      }, "Lavagna svuotata");
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
    disponibile: v.disponibile !== false,
    evidenza: !!v.evidenza,
    novita: !!v.novita,
    vegano: !!v.vegano,
    piccante: !!v.piccante,
  });
  const [sureDel, setSureDel] = useState(false);
  const set = <K extends keyof typeof f>(key: K, val: (typeof f)[K]) => setF((o) => ({ ...o, [key]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const nome = f.nome.trim();
    if (!nome) return;
    const nv: Voce = isNew ? { id: uniqueId(m, nome), nome } : { ...clone(v), nome };
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
          {(k === "vini" || f.cantina) && (
            <div className="fld">
              <label>Cantina / produttore</label>
              <input value={f.cantina} onChange={(e) => set("cantina", e.target.value)} />
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
          {k === "cibo" && (
            <div className="fld">
              <label>Allergeni</label>
              <input value={f.allergeni} onChange={(e) => set("allergeni", e.target.value)} placeholder="es. glutine, latte, uova" />
            </div>
          )}
          <div className="checks">
            <Check label="Disponibile" on={f.disponibile} set={(x) => set("disponibile", x)} />
            <Check label="In evidenza" on={f.evidenza} set={(x) => set("evidenza", x)} />
            <Check label="Novità" on={f.novita} set={(x) => set("novita", x)} />
            {k === "cibo" && <Check label="Vegano" on={f.vegano} set={(x) => set("vegano", x)} />}
            {k === "cibo" && <Check label="Piccante" on={f.piccante} set={(x) => set("piccante", x)} />}
          </div>
        </div>
        <div className="dlg-f">
          {!isNew && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (!sureDel) return setSureDel(true);
                commit((n) => {
                  n.settori[k][si0].voci!.splice(vi!, 1);
                }, "Voce eliminata");
                close();
              }}
            >
              <Trash2 className="i" /> {sureDel ? "Conferma eliminazione" : "Elimina"}
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
                  n.settori[k].splice(si, 1);
                }, "Sezione eliminata");
                close();
              }}
            >
              <Trash2 className="i" /> {sureDel ? (s.voci?.length ? `Elimina anche ${s.voci.length} voci?` : "Conferma") : "Elimina sezione"}
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
