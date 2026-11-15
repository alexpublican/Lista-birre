import { lazy, Suspense, type ComponentType } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import PublicMenuDoors from "@/pages/PublicMenuDoors";
import PublicMenu from "@/pages/PublicMenu";
import { MenuBere, MenuIngresso, MenuLocale, MenuSettore, MenuVoce } from "@/pages/MenuPublic";
import { NavMemory } from "@/lib/nav";
import PullToRefresh from "@/components/PullToRefresh";

// Le pagine dei clienti arrivano subito; quelle di gestione, TV e poster si scaricano solo
// quando servono, così il telefono del cliente scarica meno codice all'apertura.
// Se nel frattempo è uscita una versione nuova del sito, il pezzo vecchio non c'è più: si ricarica la pagina.
const page = (load: () => Promise<{ default: ComponentType }>) =>
  lazy(() =>
    load().catch((e: unknown) => {
      try {
        if (!sessionStorage.getItem("chunk-reload")) {
          sessionStorage.setItem("chunk-reload", "1");
          window.location.reload();
        }
      } catch {
        // navigazione privata: niente ricarica automatica
      }
      throw e;
    }),
  );
const AdminPin = page(() => import("@/pages/AdminPin"));
const AdminDashboard = page(() => import("@/pages/AdminDashboard"));
const MenuAdmin = page(() => import("@/pages/MenuAdmin"));
const LocaleAdmin = page(() => import("@/pages/LocaleAdmin"));
const Poster = page(() => import("@/pages/Poster"));
const TvScreen = page(() => import("@/pages/TvScreen"));
const Unsubscribe = page(() => import("@/pages/Unsubscribe"));

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <NavMemory />
      <PullToRefresh />
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<MenuIngresso />} />
        <Route path="/birre" element={<PublicMenuDoors />} />
        <Route path="/bere" element={<MenuBere />} />
        <Route path="/menu/:settore" element={<MenuSettore />} />
        <Route path="/menu/:settore/:id" element={<MenuVoce />} />
        <Route path="/locale" element={<MenuLocale />} />
        <Route path="/admin/menu" element={<MenuAdmin />} />
        <Route path="/admin/locale" element={<LocaleAdmin />} />
        <Route path="/classico" element={<PublicMenu />} />
        <Route path="/admin" element={<AdminPin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/prova" element={<PublicMenuDoors />} />
        <Route path="/poster" element={<Poster />} />
        <Route path="/tv" element={<TvScreen />} />
        <Route path="/disiscriviti" element={<Unsubscribe />} />
        <Route path="*" element={<MenuIngresso />} />
      </Routes>
      </Suspense>
      <Toaster richColors />
    </>
  );
}
