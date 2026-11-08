import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Il sito (React) viene compilato in dist/ e servito da Cloudflare insieme al server (worker/).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 3000,
    // In sviluppo le chiamate /api vanno al server locale avviato con `npm run dev:api`.
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
});
