import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import PublicMenuDoors from "@/pages/PublicMenuDoors";
import PublicMenu from "@/pages/PublicMenu";
import AdminPin from "@/pages/AdminPin";
import AdminDashboard from "@/pages/AdminDashboard";
import Poster from "@/pages/Poster";
import Unsubscribe from "@/pages/Unsubscribe";
import TvScreen from "@/pages/TvScreen";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<PublicMenuDoors />} />
        <Route path="/classico" element={<PublicMenu />} />
        <Route path="/admin" element={<AdminPin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/prova" element={<PublicMenuDoors />} />
        <Route path="/poster" element={<Poster />} />
        <Route path="/tv" element={<TvScreen />} />
        <Route path="/disiscriviti" element={<Unsubscribe />} />
        <Route path="*" element={<PublicMenuDoors />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}
