import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, BellRing, DatabaseBackup, Clock, Cylinder, KeyRound, Languages, Tv, Eye, History, LogOut, Pencil, Plus, QrCode, RefreshCw, RotateCcw, Settings, Star, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import HistoricHeader from "@/components/HistoricHeader";
import BeerDialog from "@/components/BeerDialog";
import SettingsDialog from "@/components/SettingsDialog";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { BEERS_KEY, LOCATION_STYLE, LOCATIONS, STATS_KEY, TAP_COUNT, byTap, isBottlePhoto, isGravity, photoUrl, useBeers, useIsHandpump, useSettings } from "@/lib/beers";
import ChangePinDialog from "@/components/ChangePinDialog";
import BackupsDialog from "@/components/BackupsDialog";
import TranslateAllDialog from "@/components/TranslateAllDialog";
import QueueDialog from "@/components/QueueDialog";
import type { AdminBeerStats, AdminMe, Beer, BeerPatch, Location } from "@/lib/beers";
import { endSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function RatingCell({ r }: { r?: { avg: number; count: number } }) {
  const { t } = useI18n();
  if (!r) return <span className="text-xs text-[#786C60]">—</span>;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm whitespace-nowrap" title={`${r.count} ${t("votes")}`}>
      <Star className="size-3.5 fill-[#F59E0B] text-[#F59E0B]" />
      {r.avg.toFixed(1)}
      <span className="text-xs text-[#786C60]">({r.count})</span>
    </span>
  );
}

export default function AdminDashboard() {
  const { t, lang, price, abv } = useI18n();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<AdminMe>("/auth/me"), retry: false });
  const { data, isPending: beersLoading } = useBeers();
  const stats = useQuery({
    queryKey: STATS_KEY,
    queryFn: () => apiGet<AdminBeerStats>("/admin/stats"),
    enabled: me.data?.admin === true,
  });
  const [editing, setEditing] = useState<Beer | null>(null);
  const [presetTap, setPresetTap] = useState<number | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);
  const [pinOpen, setPinOpen] = useState(false);
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [historyLoc, setHistoryLoc] = useState<Location>("spina");
  const [queueBeer, setQueueBeer] = useState<Beer | null>(null);
  const [queueKey, setQueueKey] = useState(0);
  const queueDirect = useMutation({
    mutationFn: (id: string) => apiPost<Beer>(`/beers/${id}/queue`, { spina_n: 0 }),
    onSuccess: (b) => {
      refresh();
      toast.success(`${b.nome} → ${t("coming_soon")}`);
    },
    onError: () => toast.error(t("error")),
  });
  const [pinKey, setPinKey] = useState(0);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: BEERS_KEY });
    qc.invalidateQueries({ queryKey: STATS_KEY });
  };

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: BeerPatch }) => apiPatch<Beer>(`/beers/${id}`, body),
    onSuccess: refresh,
    onError: () => toast.error(t("error")),
  });
  const archive = useMutation({
    mutationFn: (id: string) => apiPost<Beer>(`/beers/${id}/archive`),
    onSuccess: () => {
      refresh();
      toast.success(t("archived"));
    },
    onError: () => toast.error(t("error")),
  });
  const restore = useMutation({
    mutationFn: (id: string) => apiPost<Beer>(`/beers/${id}/restore`),
    onSuccess: (b) => {
      refresh();
      if (b.posizione !== "spina") toast.success(`${t("restored")} · ${t(b.posizione)}`);
      else if (b.spina_n == null) toast.warning(t("no_free_tap"));
      else toast.success(`${t("restored")} · ${t("tap_n")} ${b.spina_n}`);
    },
    onError: () => toast.error(t("error")),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/beers/${id}`),
    onSuccess: () => {
      refresh();
      toast.success(t("deleted"));
    },
    onError: () => toast.error(t("error")),
  });

  if (me.isSuccess && !me.data.admin) return <Navigate to="/admin" replace />;
  if (me.isError) return <Navigate to="/admin" replace />;

  const all = data ?? [];
  const active = all.filter((b) => !b.archiviata);
  const history = all
    .filter((b) => b.archiviata)
    .sort((a, b) => (b.archiviata_il ?? "").localeCompare(a.archiviata_il ?? ""));
  const rows = [...active].sort(
    (a, b) => LOCATIONS.indexOf(a.posizione) - LOCATIONS.indexOf(b.posizione) || byTap(a, b),
  );
  const shownHistory = history.filter((b) => b.posizione === historyLoc);
  const ratingOf = (id: string) => stats.data?.ratings.find((r) => r.beer_id === id);
  const subsOf = (id: string) => stats.data?.subscribers[id] ?? 0;
  const isHandpump = useIsHandpump();
  const tapBeer = (n: number) => active.find((b) => b.spina_n === n && !b.in_arrivo);
  const waitingFor = (n: number) => active.find((b) => b.spina_n === n && b.in_arrivo);
  const dateFmt = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "short", year: "numeric" });

  const openDialog = (beer: Beer | null, tap?: number) => {
    setEditing(beer);
    setPresetTap(tap);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const markArrived = (b: Beer) => {
    const n = subsOf(b.id);
    const replaced = b.spina_n != null ? tapBeer(b.spina_n) : undefined;
    patch.mutate(
      { id: b.id, body: { in_arrivo: false, disponibile: true } },
      {
        onSuccess: () => {
          if (replaced) toast.success(`${replaced.nome} ${t("moved_to_history")} · ${b.nome} → ${t("tap_n")} ${b.spina_n}`);
          if (n > 0) toast.success(`${t("notified")} (${n})`);
        },
      },
    );
  };

  return (
    <div className="min-h-screen">
      <HistoricHeader
        right={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()} data-testid="refresh-button">
              <RefreshCw className="size-4" />
              <span className="hidden sm:inline">{t("refresh")}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => endSession("/admin")} data-testid="logout-button">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          </div>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-tight" data-testid="dashboard-title">
              {t("dashboard")}
            </h1>
            <div className="brass-rule mt-3 w-24" />
            <div className="mt-4 flex flex-wrap gap-2 text-xs" data-testid="dashboard-stats">
              {LOCATIONS.map((l) => (
                <span key={l} className={cn("rounded-full border px-2.5 py-1", LOCATION_STYLE[l].badge)} data-testid={`stat-${l}`}>
                  {t(l)}: <b className="font-mono">{active.filter((b) => b.posizione === l && b.disponibile && !b.in_arrivo).length}</b>/
                  {active.filter((b) => b.posizione === l).length}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!settings.data}
              onClick={() => {
                setSettingsKey((k) => k + 1);
                setSettingsOpen(true);
              }}
              data-testid="settings-button"
            >
              <Settings className="size-4" /> {t("settings")}
            </Button>
            <Button variant="outline" onClick={() => setBackupsOpen(true)} data-testid="backups-button">
              <DatabaseBackup className="size-4" /> {t("backups")}
            </Button>
            <Button variant="outline" onClick={() => setTranslateOpen(true)} data-testid="translate-all-button">
              <Languages className="size-4" /> {t("translate_all")}
            </Button>
            <Link to="/tv" target="_blank" className={buttonVariants({ variant: "outline" })} data-testid="tv-link">
              <Tv className="size-4" /> {t("tv_screen")}
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setPinKey((k) => k + 1);
                setPinOpen(true);
              }}
              data-testid="change-pin-button"
            >
              <KeyRound className="size-4" /> {t("change_pin")}
            </Button>
            <Link to="/poster" className={buttonVariants({ variant: "outline" })} data-testid="poster-link">
              <QrCode className="size-4" /> {t("poster")}
            </Link>
            <Link to="/" className={buttonVariants({ variant: "outline" })} data-testid="view-menu-link">
              <Eye className="size-4" /> {t("back_menu")}
            </Link>
            <Button onClick={() => openDialog(null)} data-testid="add-beer-button">
              <Plus className="size-4" /> {t("add_beer")}
            </Button>
          </div>
        </div>

        {/* Tap board: the 10 numbered taps */}
        <section className="mt-8" data-testid="tap-board">
          <h2 className="font-heading text-2xl font-semibold">{t("tap_board")}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: TAP_COUNT }, (_, i) => i + 1).map((n) => {
              const b = tapBeer(n);
              const w = waitingFor(n);
              return (
                <button
                  key={n}
                  type="button"
                  disabled={beersLoading}
                  onClick={() => openDialog(b ?? null, b ? undefined : n)}
                  data-testid={`tap-slot-${n}`}
                  className={cn(
                    beersLoading && "pointer-events-none animate-pulse opacity-50",
                    "flex min-h-20 items-start gap-2.5 rounded-lg border p-3 text-left transition-[border-color,transform,background-color] duration-150 active:scale-[0.98]",
                    b
                      ? "border-[#F59E0B]/40 bg-[#1C1713] hover:border-[#F59E0B]"
                      : "border-dashed border-[#3D3126] bg-transparent hover:border-[#57422F] hover:bg-[#1C1713]/50",
                  )}
                >
                  <span
                    title={isGravity(n) ? t("gravity") : undefined}
                    className={cn(
                      "font-heading grid size-8 shrink-0 place-items-center rounded-full border text-sm font-bold",
                      isGravity(n) && "rounded-md",
                      b ? "border-[#F59E0B]/70 bg-[#3B260E] text-[#FCD34D]" : "border-[#3D3126] text-[#786C60]",
                    )}
                  >
                    {isGravity(n) ? <Cylinder className="size-4" /> : n}
                  </span>
                  <span className="min-w-0">
                    {isGravity(n) && (
                      <span className="block text-[10px] tracking-wide text-[#B45309] uppercase" data-testid="tap-slot-gravity-label">
                        {t("gravity")}
                      </span>
                    )}
                    {isHandpump(n) && (
                      <span className="block text-[10px] font-semibold tracking-wide text-[#FB923C] uppercase" data-testid={`tap-slot-${n}-handpump`}>
                        {t("handpump")}
                      </span>
                    )}
                    {b ? (
                      <>
                        <span className="block truncate text-sm font-medium text-[#FAF5EF]" data-testid={`tap-slot-${n}-name`}>
                          {b.nome}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 inline-flex items-center gap-1 text-[11px]",
                            b.in_arrivo ? "text-[#FCD34D]" : b.disponibile ? "text-[#6EE7B7]" : "text-[#A8A29E]",
                          )}
                        >
                          {b.in_arrivo ? t("arriving") : b.disponibile ? t("available") : t("sold_out")}
                        </span>
                      </>
                    ) : beersLoading ? (
                      <span className="block h-3 w-16 rounded bg-[#2E241B]" />
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-[#786C60]" data-testid={`tap-slot-${n}-free`}>
                        <Plus className="size-3.5" /> {t("tap_free")}
                      </span>
                    )}
                    {w && (
                      <span
                        className="mt-1 flex items-center gap-1 truncate text-[11px] text-[#FCD34D]"
                        title={w.nome}
                        data-testid={`tap-slot-${n}-waiting`}
                      >
                        <Clock className="size-3 shrink-0" /> {t("tap_waiting")}: {w.nome}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-10 rounded-xl border border-[#2E241B] bg-[#181412]">
          <Table data-testid="beers-table">
            <TableHeader>
              <TableRow className="border-[#2E241B] hover:bg-transparent">
                <TableHead>{t("name")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("style")}</TableHead>
                <TableHead>{t("location")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">ABV</TableHead>
                <TableHead className="text-right">€</TableHead>
                <TableHead>{t("rating")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} className="border-[#2E241B]" data-testid={`beer-row-${b.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {b.spina_n != null && (
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#3B260E] font-mono text-[11px] text-[#FCD34D]" data-testid="beer-row-tap">
                          {isGravity(b.spina_n) ? <Cylinder className="size-3" /> : b.spina_n}
                        </span>
                      )}
                      {b.foto_version && (
                        <img
                          src={photoUrl(b) ?? undefined}
                          alt=""
                          className={cn("size-9 shrink-0 rounded", isBottlePhoto(b) ? "bg-white object-contain p-px" : "object-cover")}
                          data-testid="beer-row-photo"
                        />
                      )}
                      <div>
                        <div className="font-medium text-[#FAF5EF]" data-testid="beer-row-name">{b.nome}</div>
                        <div className="text-xs text-[#AB9C8E]">{b.birrificio}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-[#BCAEA2] md:table-cell">{b.stile}</TableCell>
                  <TableCell>
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs", LOCATION_STYLE[b.posizione].badge)}>
                      {t(b.posizione)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono sm:table-cell">{abv(b.abv)}</TableCell>
                  <TableCell className="text-right font-mono" data-testid="beer-row-price">{price(b.prezzo)}</TableCell>
                  <TableCell data-testid={`beer-row-rating-${b.id}`}>
                    <RatingCell r={ratingOf(b.id)} />
                  </TableCell>
                  <TableCell>
                    {b.in_arrivo ? (
                      <div className="flex flex-col items-start gap-1">
                        <button
                          type="button"
                          title={t("mark_arrived")}
                          onClick={() => markArrived(b)}
                          data-testid={`mark-arrived-${b.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-[#FBBF24]/50 bg-[#3B260E] px-3 text-xs font-medium text-[#FCD34D] transition-[background-color,transform] duration-150 hover:bg-[#4A3012] active:scale-95"
                        >
                          <Clock className="size-3" /> {t("arriving")}
                        </button>
                        {subsOf(b.id) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#BCAEA2]" data-testid={`subs-${b.id}`}>
                            <BellRing className="size-3" /> {subsOf(b.id)} {t("subscribers")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={b.disponibile}
                        onClick={() => patch.mutate({ id: b.id, body: { disponibile: !b.disponibile } })}
                        data-testid={`toggle-available-${b.id}`}
                        className={cn(
                          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                          b.disponibile
                            ? "border-[#34D399]/30 bg-[#064E3B] text-[#6EE7B7]"
                            : "border-[#57534E] bg-[#292524] text-[#A8A29E]",
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", b.disponibile ? "bg-[#34D399]" : "bg-[#78716C]")} />
                        {b.disponibile ? t("available") : t("sold_out")}
                      </button>
                    )}
                    {b.posizione === "cantina" && b.quantita != null && (
                      <div className="mt-1 flex items-center gap-1.5" data-testid={`stock-${b.id}`}>
                        <span className={cn("font-mono text-xs", b.quantita === 1 ? "text-[#F9A8D4]" : b.quantita === 0 ? "text-[#78716C]" : "text-[#BCAEA2]")}>
                          {b.quantita} {t("bottles_short")}
                        </span>
                        {b.quantita > 0 && (
                          <button
                            type="button"
                            title={t("sold_one")}
                            aria-label={t("sold_one")}
                            onClick={() => patch.mutate({ id: b.id, body: { quantita: (b.quantita ?? 1) - 1 } })}
                            data-testid={`stock-minus-${b.id}`}
                            className="grid size-6 place-items-center rounded-full border border-[#57422F] text-sm leading-none text-[#E7D9CC] transition-transform duration-150 hover:bg-[#2E241B] active:scale-90"
                          >
                            −
                          </button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("toggle_featured")}
                        aria-pressed={b.in_evidenza}
                        title={t("featured_one")}
                        onClick={() => patch.mutate({ id: b.id, body: { in_evidenza: !b.in_evidenza } })}
                        data-testid={`toggle-featured-${b.id}`}
                        className={b.in_evidenza ? "text-[#F59E0B] hover:text-[#F59E0B]" : "text-[#786C60]"}
                      >
                        <Star className={cn("size-4 transition-transform duration-150 active:scale-90", b.in_evidenza && "fill-current")} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={t("edit_beer")} onClick={() => openDialog(b)} data-testid={`edit-beer-${b.id}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("take_off_tap")}
                        title={t("take_off_tap")}
                        onClick={() => archive.mutate(b.id)}
                        data-testid={`archive-beer-${b.id}`}
                      >
                        <Archive className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("delete")}
                        className="text-[#F87171] hover:text-[#F87171]"
                        onClick={() => window.confirm(`${t("confirm_delete")}\n${b.nome}`) && remove.mutate(b.id)}
                        data-testid={`delete-beer-${b.id}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Storico spine */}
        <section className="mt-12" data-testid="tap-history">
          <div className="flex items-center gap-2.5">
            <History className="size-5 text-[#F59E0B]" />
            <h2 className="font-heading text-2xl font-semibold">{t("history")}</h2>
          </div>
          <p className="mt-1 text-sm text-[#AB9C8E]">{t("history_hint")}</p>
          <div className="mt-4 flex gap-2" data-testid="history-tabs">
            {LOCATIONS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setHistoryLoc(l)}
                aria-pressed={historyLoc === l}
                data-testid={`history-tab-${l}`}
                className={cn(
                  "h-9 rounded-full border px-4 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                  historyLoc === l ? LOCATION_STYLE[l].badge : "border-[#3D3126] text-[#B5A799] hover:text-[#F5EBE1]",
                )}
              >
                {t(l)} <span className="ml-1 font-mono text-xs opacity-70">{history.filter((b) => b.posizione === l).length}</span>
              </button>
            ))}
          </div>
          {shownHistory.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-[#3D3126] p-6 text-sm text-[#786C60]" data-testid="history-empty">
              {t("history_empty")}
            </p>
          ) : (
            <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
              {shownHistory.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-lg border border-[#2E241B] bg-[#181412] p-3"
                  data-testid={`history-item-${b.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#FAF5EF]" data-testid="history-item-name">{b.nome}</p>
                    <p className="truncate text-xs text-[#AB9C8E]">
                      {[
                        b.birrificio,
                        b.stile,
                        b.archiviata_il && `${t("last_on_tap")}: ${dateFmt.format(new Date(b.archiviata_il))}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-1">
                      <RatingCell r={ratingOf(b.id)} />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (b.posizione === "spina") {
                        setQueueKey((k) => k + 1);
                        setQueueBeer(b);
                      } else queueDirect.mutate(b.id);
                    }}
                    disabled={queueDirect.isPending}
                    data-testid={`queue-beer-${b.id}`}
                  >
                    <Clock className="size-4" /> {t("queue")}
                  </Button>
                  <Button size="sm" onClick={() => restore.mutate(b.id)} disabled={restore.isPending} data-testid={`restore-beer-${b.id}`}>
                    <RotateCcw className="size-4" /> {t("restore")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("delete")}
                    className="text-[#F87171] hover:text-[#F87171]"
                    onClick={() => window.confirm(`${t("confirm_delete")}\n${b.nome}`) && remove.mutate(b.id)}
                    data-testid={`delete-history-${b.id}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <QueueDialog key={`queue-${queueKey}`} beer={queueBeer} allBeers={all} onOpenChange={(o) => !o && setQueueBeer(null)} />
      <BackupsDialog open={backupsOpen} onOpenChange={setBackupsOpen} />
      <TranslateAllDialog open={translateOpen} onOpenChange={setTranslateOpen} />
      <ChangePinDialog key={`pin-${pinKey}`} open={pinOpen} onOpenChange={setPinOpen} />
      {settings.data && (
        <SettingsDialog key={`settings-${settingsKey}`} open={settingsOpen} initial={settings.data} onOpenChange={setSettingsOpen} />
      )}
      <BeerDialog
        key={`beer-${dialogKey}`}
        open={dialogOpen}
        beer={editing}
        presetTap={presetTap}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
