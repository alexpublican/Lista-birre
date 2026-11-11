import { useMemo, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  Cylinder,
  DatabaseBackup,
  Eye,
  History,
  KeyRound,
  Languages,
  LogOut,
  Percent,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Star,
  Trash2,
  Tv,
  UtensilsCrossed,
  Wrench,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import HistoricHeader from "@/components/HistoricHeader";
import BeerDialog from "@/components/BeerDialog";
import SettingsDialog from "@/components/SettingsDialog";
import AdminBeerRow, { missingAbv, missingPhoto } from "@/components/AdminBeerRow";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import {
  BEERS_KEY,
  LOCATION_STYLE,
  LOCATIONS,
  STATS_KEY,
  TAP_COUNT,
  byBrewery,
  byTap,
  groupByBrewery,
  isGravity,
  isLastBottle,
  useBeers,
  useIsHandpump,
  useSettings,
} from "@/lib/beers";
import ChangePinDialog from "@/components/ChangePinDialog";
import BackupsDialog from "@/components/BackupsDialog";
import TranslateAllDialog from "@/components/TranslateAllDialog";
import QueueDialog from "@/components/QueueDialog";
import type { AdminBeerStats, AdminMe, Beer, BeerPatch, Location } from "@/lib/beers";
import { endSession } from "@/lib/session";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Filter = "all" | "available" | "last" | "sold_out" | "arriving" | "no_photo" | "no_abv";

const FILTERS: { key: Filter; label: TKey; test: (b: Beer) => boolean; fix?: boolean }[] = [
  { key: "all", label: "all", test: () => true },
  { key: "available", label: "f_available", test: (b) => b.disponibile && !b.in_arrivo },
  { key: "last", label: "f_last", test: (b) => isLastBottle(b) },
  { key: "sold_out", label: "f_sold_out", test: (b) => !b.disponibile && !b.in_arrivo },
  { key: "arriving", label: "f_arriving", test: (b) => b.in_arrivo },
  { key: "no_photo", label: "f_no_photo", test: missingPhoto, fix: true },
  { key: "no_abv", label: "f_no_abv", test: missingAbv, fix: true },
];

const TAB_STORAGE = "cassina_admin_tab";
const readTab = (): Location => {
  try {
    const v = localStorage.getItem(TAB_STORAGE);
    if (v === "spina" || v === "frigo" || v === "cantina") return v;
  } catch {
    /* niente */
  }
  return "spina";
};

/** Toglie accenti e maiuscole, così "gueuze" trova anche "Gueuzérable". */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function RatingCell({ r }: { r?: { avg: number; count: number } }) {
  const { t } = useI18n();
  if (!r) return null;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm whitespace-nowrap" title={`${r.count} ${t("votes")}`}>
      <Star className="size-3.5 fill-[#F59E0B] text-[#F59E0B]" />
      {r.avg.toFixed(1)}
      <span className="text-xs text-[#786C60]">({r.count})</span>
    </span>
  );
}

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<AdminMe>("/auth/me"), retry: false });
  const { data, isPending: beersLoading } = useBeers();
  const stats = useQuery({
    queryKey: STATS_KEY,
    queryFn: () => apiGet<AdminBeerStats>("/admin/stats"),
    enabled: me.data?.admin === true,
  });
  const isHandpump = useIsHandpump();
  const [editing, setEditing] = useState<Beer | null>(null);
  const [presetTap, setPresetTap] = useState<number | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinKey, setPinKey] = useState(0);
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [queueBeer, setQueueBeer] = useState<Beer | null>(null);
  const [queueKey, setQueueKey] = useState(0);

  // Reparto scelto, ricerca, filtro, blocchi aperti, storico
  const [tab, setTabState] = useState<Location>(readTab);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [showHistory, setShowHistory] = useState(false);
  const setTab = (l: Location) => {
    setTabState(l);
    setQuery("");
    setFilter("all");
    setOpenGroups(new Set());
    setShowHistory(false);
    try {
      localStorage.setItem(TAB_STORAGE, l);
    } catch {
      /* niente */
    }
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: BEERS_KEY });
    qc.invalidateQueries({ queryKey: STATS_KEY });
  };

  const queueDirect = useMutation({
    mutationFn: (id: string) => apiPost<Beer>(`/beers/${id}/queue`, { spina_n: 0 }),
    onSuccess: (b) => {
      refresh();
      toast.success(`${b.nome} → ${t("coming_soon")}`);
    },
    onError: () => toast.error(t("error")),
  });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: BeerPatch }) => apiPatch<Beer>(`/beers/${id}`, body),
    // Aggiorno subito la lista, senza aspettare il server: i pulsanti − / + rispondono al volo.
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: BEERS_KEY });
      const prev = qc.getQueryData<Beer[]>(BEERS_KEY);
      if (prev) {
        qc.setQueryData<Beer[]>(
          BEERS_KEY,
          prev.map((b) => {
            if (b.id !== id) return b;
            const next = { ...b, ...body } as Beer;
            if (typeof body.quantita === "number") {
              if (body.quantita === 0) next.disponibile = false;
              else if (b.quantita === 0) next.disponibile = true;
            }
            return next;
          }),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(BEERS_KEY, ctx.prev);
      toast.error(t("error"));
    },
    onSettled: refresh,
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

  const all = useMemo(() => data ?? [], [data]);
  const active = useMemo(() => all.filter((b) => !b.archiviata), [all]);
  const inTab = useMemo(() => active.filter((b) => b.posizione === tab), [active, tab]);

  // Frigo e Cantina: ricerca + filtro, poi gruppi per birrificio
  const q = norm(query.trim());
  const searched = useMemo(
    () =>
      q
        ? inTab.filter((b) =>
            norm([b.nome, b.birrificio, b.stile, b.annata ?? "", ...b.formati.map((f) => f.nome)].join(" ")).includes(q),
          )
        : inTab,
    [inTab, q],
  );
  const filterDef = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const shown = useMemo(() => searched.filter(filterDef.test).sort(byBrewery), [searched, filterDef]);
  const groups = useMemo(() => groupByBrewery(shown), [shown]);
  const forceOpen = q !== "" || filter !== "all";
  const isOpen = (key: string) => forceOpen || openGroups.has(key);
  const toggleGroup = (key: string) =>
    setOpenGroups((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  if (me.isSuccess && !me.data.admin) return <Navigate to="/admin" replace />;
  if (me.isError) return <Navigate to="/admin" replace />;

  const history = all
    .filter((b) => b.archiviata && b.posizione === tab)
    .sort((a, b) => (b.archiviata_il ?? "").localeCompare(a.archiviata_il ?? ""));
  const ratingOf = (id: string) => stats.data?.ratings.find((r) => r.beer_id === id);
  const subsOf = (id: string) => stats.data?.subscribers[id] ?? 0;
  const tapBeer = (n: number) => active.find((b) => b.spina_n === n && !b.in_arrivo);
  const waitingFor = (n: number) => active.find((b) => b.spina_n === n && b.in_arrivo);
  const dateFmt = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "short", year: "numeric" });
  const bottles = (list: Beer[]) => list.reduce((s, b) => s + (b.quantita ?? 0), 0);
  const spinaRows = [...inTab].sort(byTap);

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

  const row = (b: Beer) => (
    <AdminBeerRow
      key={b.id}
      beer={b}
      rating={ratingOf(b.id)}
      subscribers={subsOf(b.id)}
      onEdit={() => openDialog(b)}
      onPatch={(body) => patch.mutate({ id: b.id, body })}
      onArchive={() => archive.mutate(b.id)}
      onDelete={() => window.confirm(`${t("confirm_delete")}\n${b.nome}`) && remove.mutate(b.id)}
      onMarkArrived={() => markArrived(b)}
    />
  );

  const tool = (icon: ReactNode, label: string, onClick: () => void, testId: string) => (
    <button
      type="button"
      onClick={() => {
        setToolsOpen(false);
        onClick();
      }}
      data-testid={testId}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#E7D9CC] transition-colors duration-150 hover:bg-[#2A221C] hover:text-[#FAF5EF]"
    >
      {icon}
      {label}
    </button>
  );
  const toolLink = (icon: ReactNode, label: string, to: string, testId: string, blank?: boolean) => (
    <Link
      to={to}
      target={blank ? "_blank" : undefined}
      onClick={() => setToolsOpen(false)}
      data-testid={testId}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#E7D9CC] transition-colors duration-150 hover:bg-[#2A221C] hover:text-[#FAF5EF]"
    >
      {icon}
      {label}
    </Link>
  );

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
      <main className="mx-auto max-w-5xl px-3 py-8 sm:px-6">
        {/* Titolo e pochi pulsanti: il resto sta in "Strumenti" */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="dashboard-title">
              {t("dashboard")}
            </h1>
            <div className="brass-rule mt-3 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
              <PopoverTrigger className={buttonVariants({ variant: "outline" })} data-testid="tools-button">
                <Wrench className="size-4" /> {t("tools")}
                <ChevronDown className={cn("size-3.5 transition-transform duration-150", toolsOpen && "rotate-180")} />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={6}
                className="w-60 gap-0.5 rounded-xl border border-[#3D3126] bg-[#1E1915] p-1.5 text-[#F5EBE1] shadow-xl ring-0"
              >
                {settings.data &&
                  tool(<Settings className="size-4" />, t("settings"), () => {
                    setSettingsKey((k) => k + 1);
                    setSettingsOpen(true);
                  }, "settings-button")}
                {tool(<DatabaseBackup className="size-4" />, t("backups"), () => setBackupsOpen(true), "backups-button")}
                {tool(<Languages className="size-4" />, t("translate_all"), () => setTranslateOpen(true), "translate-all-button")}
                {tool(<KeyRound className="size-4" />, t("change_pin"), () => {
                  setPinKey((k) => k + 1);
                  setPinOpen(true);
                }, "change-pin-button")}
                {toolLink(<Tv className="size-4" />, t("tv_screen"), "/tv", "tv-link", true)}
                {toolLink(<QrCode className="size-4" />, t("poster"), "/poster", "poster-link")}
              </PopoverContent>
            </Popover>
            <Link to="/admin/menu" className={buttonVariants({ variant: "outline" })} data-testid="food-menu-link">
              <UtensilsCrossed className="size-4" /> <span className="hidden sm:inline">{t("kitchen_bar")}</span>
            </Link>
            <Link to="/" className={buttonVariants({ variant: "outline" })} data-testid="view-menu-link">
              <Eye className="size-4" /> <span className="hidden sm:inline">{t("back_menu")}</span>
            </Link>
            <Button onClick={() => openDialog(null)} data-testid="add-beer-button">
              <Plus className="size-4" /> {t("add_beer")}
            </Button>
          </div>
        </div>

        {/* Schede reparto */}
        <div className="sticky top-0 z-20 -mx-3 mt-6 bg-[#12100E]/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6" data-testid="dashboard-stats">
          <div className="grid grid-cols-3 gap-2" role="tablist">
            {LOCATIONS.map((l) => {
              const list = active.filter((b) => b.posizione === l);
              const on = list.filter((b) => b.disponibile && !b.in_arrivo).length;
              return (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={tab === l}
                  onClick={() => setTab(l)}
                  data-testid={`tab-${l}`}
                  className={cn(
                    "flex flex-col items-center rounded-xl border px-2 py-2 transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]",
                    tab === l ? LOCATION_STYLE[l].badge : "border-[#2E241B] text-[#B5A799] hover:border-[#57422F]",
                  )}
                >
                  <span className="text-sm font-semibold">{t(l)}</span>
                  <span className="font-mono text-[11px] opacity-80" data-testid={`stat-${l}`}>
                    {on}/{list.length}
                    {l === "cantina" && ` · ${bottles(list)} ${t("bottles_short")}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {tab === "spina" ? (
          <>
            {/* Le spine numerate */}
            <section className="mt-6" data-testid="tap-board">
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
                            <span className={cn("mt-0.5 inline-flex items-center gap-1 text-[11px]", b.disponibile ? "text-[#6EE7B7]" : "text-[#A8A29E]")}>
                              {b.disponibile ? t("available") : t("sold_out")}
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
                          <span className="mt-1 flex items-center gap-1 truncate text-[11px] text-[#FCD34D]" title={w.nome} data-testid={`tap-slot-${n}-waiting`}>
                            <Clock className="size-3 shrink-0" /> {t("tap_waiting")}: {w.nome}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Lista spina: stato, voti, in arrivo */}
            {spinaRows.length > 0 && (
              <ul className="mt-6 rounded-xl border border-[#2E241B] bg-[#181412]" data-testid="beers-table">
                {spinaRows.map(row)}
              </ul>
            )}
          </>
        ) : (
          <>
            {/* Ricerca */}
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#786C60]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("admin_search")}
                data-testid="admin-search"
                className="h-11 w-full rounded-xl border border-[#3D3126] bg-[#181412] pr-10 pl-9 text-[15px] text-[#FAF5EF] outline-none placeholder:text-[#786C60] focus:border-[#D97706]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("cancel")}
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-[#AB9C8E] hover:bg-[#2E241B]"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filtri rapidi */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="admin-filters">
              {FILTERS.map((f) => {
                const n = searched.filter(f.test).length;
                if (f.key !== "all" && n === 0 && filter !== f.key) return null;
                const on = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(on ? "all" : f.key)}
                    data-testid={`filter-${f.key}`}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                      on
                        ? f.fix
                          ? "border-[#F59E0B] bg-[#3B260E] text-[#FCD34D]"
                          : LOCATION_STYLE[tab].badge
                        : f.fix
                          ? "border-dashed border-[#B45309]/70 text-[#FBBF24] hover:bg-[#3B260E]/50"
                          : "border-[#3D3126] text-[#B5A799] hover:text-[#F5EBE1]",
                    )}
                  >
                    {f.key === "no_photo" && <Camera className="size-3.5" />}
                    {f.key === "no_abv" && <Percent className="size-3.5" />}
                    {t(f.label)}
                    <span className="font-mono opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>

            {/* Riepilogo e apri/chiudi */}
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-[#AB9C8E]">
              <span>
                {shown.length} {t("beers_word")} · {groups.length} {t("breweries_word")}
                {tab === "cantina" && ` · ${bottles(shown)} ${t("bottles_short")}`}
              </span>
              {!forceOpen && groups.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups(openGroups.size >= groups.length ? new Set() : new Set(groups.map((g) => g.key)))
                  }
                  className="rounded-full px-2 py-1 text-[#FBBF24] hover:bg-[#2E241B]"
                  data-testid="toggle-all-groups"
                >
                  {openGroups.size >= groups.length ? t("collapse_all") : t("expand_all")}
                </button>
              )}
            </div>

            {/* Blocchi per birrificio */}
            {beersLoading ? (
              <div className="mt-3 h-40 animate-pulse rounded-xl border border-[#2E241B] bg-[#181412]" />
            ) : groups.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-[#3D3126] p-6 text-center text-sm text-[#786C60]" data-testid="admin-empty">
                {t("no_results")}
              </p>
            ) : (
              <div className="mt-2 space-y-2" data-testid="beers-table">
                {groups.map((g) => {
                  const open = isOpen(g.key);
                  const left = g.beers.filter((b) => b.disponibile && !b.in_arrivo).length;
                  const noPhoto = g.beers.filter(missingPhoto).length;
                  const noAbv = g.beers.filter(missingAbv).length;
                  return (
                    <section key={g.key} className="overflow-hidden rounded-xl border border-[#2E241B] bg-[#181412]" data-testid={`group-${g.key}`}>
                      <button
                        type="button"
                        onClick={() => !forceOpen && toggleGroup(g.key)}
                        aria-expanded={open}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-3 text-left transition-colors duration-150",
                          !forceOpen && "hover:bg-[#1E1915]",
                          open && "border-b border-[#2E241B] bg-[#1C1713]",
                        )}
                      >
                        {!forceOpen && (
                          <ChevronRight className={cn("size-4 shrink-0 text-[#786C60] transition-transform duration-150", open && "rotate-90")} />
                        )}
                        <span className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-[#FAF5EF]">{g.name}</span>
                        {noPhoto > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-[#FBBF24]" title={t("f_no_photo")}>
                            <Camera className="size-3" />
                            {noPhoto}
                          </span>
                        )}
                        {noAbv > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-[#FBBF24]" title={t("f_no_abv")}>
                            <Percent className="size-3" />
                            {noAbv}
                          </span>
                        )}
                        <span className="shrink-0 font-mono text-xs text-[#AB9C8E]">
                          {left}/{g.beers.length}
                          {tab === "cantina" && ` · ${bottles(g.beers)} ${t("bottles_short")}`}
                        </span>
                      </button>
                      {open && <ul>{g.beers.map(row)}</ul>}
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Storico del reparto, chiuso finché non serve */}
        <section className="mt-10" data-testid="tap-history">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            data-testid="history-toggle"
            className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:text-[#FCD34D]"
          >
            <History className="size-5 text-[#F59E0B]" />
            <span className="font-heading text-xl font-semibold">
              {t("history")} · {t(tab)}
            </span>
            <span className="font-mono text-xs text-[#AB9C8E]">{history.length}</span>
            <ChevronDown className={cn("size-4 text-[#786C60] transition-transform duration-150", showHistory && "rotate-180")} />
          </button>
          {showHistory && (
            <>
              <p className="mt-1 text-sm text-[#AB9C8E]">{t("history_hint")}</p>
              {history.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-[#3D3126] p-6 text-sm text-[#786C60]" data-testid="history-empty">
                  {t("history_empty")}
                </p>
              ) : (
                <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
                  {history.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 rounded-lg border border-[#2E241B] bg-[#181412] p-3" data-testid={`history-item-${b.id}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[#FAF5EF]" data-testid="history-item-name">
                          {b.nome}
                          {b.annata && <span className="ml-1.5 font-mono text-xs text-[#F0ABFC]">{b.annata}</span>}
                        </p>
                        <p className="truncate text-xs text-[#AB9C8E]">
                          {[b.birrificio, b.stile, b.archiviata_il && `${t("last_on_tap")}: ${dateFmt.format(new Date(b.archiviata_il))}`]
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
                        title={t("queue")}
                      >
                        <Clock className="size-4" /> <span className="hidden sm:inline">{t("queue")}</span>
                      </Button>
                      <Button size="sm" onClick={() => restore.mutate(b.id)} disabled={restore.isPending} data-testid={`restore-beer-${b.id}`} title={t("restore")}>
                        <RotateCcw className="size-4" /> <span className="hidden sm:inline">{t("restore")}</span>
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
            </>
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
        presetLocation={tab}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
