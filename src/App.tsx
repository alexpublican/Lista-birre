import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import PublicMenuDoors from "@/pages/PublicMenuDoors";
import PublicMenu from "@/pages/PublicMenu";
import AdminPin from "@/pages/AdminPin";
import AdminDashboard from "@/pages/AdminDashboard";
import Poster from "@/pages/Poster";
import Unsubscribe from "@/pages/Unsubscribe";
import TvScreen from "@/pages/TvScreen";
import { MenuBere, MenuIngresso, MenuSettore, MenuVoce } from "@/pages/MenuPublic";
import MenuAdmin from "@/pages/MenuAdmin";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MenuIngresso />} />
        <Route path="/birre" element={<PublicMenuDoors />} />
        <Route path="/bere" element={<MenuBere />} />
        <Route path="/menu/:settore" element={<MenuSettore />} />
        <Route path="/menu/:settore/:id" element={<MenuVoce />} />
        <Route path="/admin/menu" element={<MenuAdmin />} />
        <Route path="/classico" element={<PublicMenu />} />
        <Route path="/admin" element={<AdminPin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/prova" element={<PublicMenuDoors />} />
        <Route path="/poster" element={<Poster />} />
        <Route path="/tv" element={<TvScreen />} />
        <Route path="/disiscriviti" element={<Unsubscribe />} />
        <Route path="*" element={<MenuIngresso />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}
