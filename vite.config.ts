import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Copia offline (public/sw.js): a ogni pubblicazione scrive nel file la versione e l'elenco dei
 * file del sito da salvare sul telefono, così il menù si apre anche senza internet.
 */
function offlineCopy(): Plugin {
  let outDir = "dist";
  return {
    name: "cassina-offline",
    apply: "build",
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const swPath = path.join(outDir, "sw.js");
      if (!fs.existsSync(swPath)) return;
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of fs.readdirSync(dir)) {
          const full = path.join(dir, name);
          const st = fs.statSync(full);
          if (st.isDirectory()) walk(full);
          // codice, stili e caratteri; niente immagini grosse
          else if (/\.(js|css|woff2?|svg)$/.test(name) && st.size < 600_000)
            files.push("/" + path.relative(outDir, full).split(path.sep).join("/"));
        }
      };
      const assets = path.join(outDir, "assets");
      if (fs.existsSync(assets)) walk(assets);
      const sw = fs
        .readFileSync(swPath, "utf8")
        .replace('const VERSION = "dev";', `const VERSION = "${Date.now().toString(36)}";`)
        .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(files.sort())};`);
      fs.writeFileSync(swPath, sw);
    },
  };
}

// Il sito (React) viene compilato in dist/ e servito da Cloudflare insieme al server (worker/).
export default defineConfig({
  plugins: [react(), tailwindcss(), offlineCopy()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 3000,
    // In sviluppo le chiamate /api vanno al server locale avviato con `npm run dev:api`.
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
});
