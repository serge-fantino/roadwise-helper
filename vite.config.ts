import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

type ReleaseNote = { version: string; date?: string | null; heure?: string | null };

// Writes version.json at the site's root from the first released entry of
// docs/release-notes.json (an entry is released once it has a date and a time).
function versionJson(mode: string): Plugin {
  return {
    name: "roadwise-version-json",
    apply: "build",
    generateBundle() {
      const notesPath = path.resolve(__dirname, "docs/release-notes.json");
      const notes: ReleaseNote[] = JSON.parse(fs.readFileSync(notesPath, "utf8"));
      const released = notes.find((entry) => entry.date && entry.heure);
      if (!released) {
        this.error("docs/release-notes.json has no released entry (date and heure)");
      }
      const version = {
        numero: released.version,
        environnement: mode === "production" ? "production" : "development",
        date: `${released.date}T${released.heure}`,
      };
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(version, null, 2) + "\n",
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    // HTTPS local (mkcert). Needed for Geolocation on mobile over LAN IP.
    https:
      mode === "development" &&
      fs.existsSync(path.resolve(__dirname, "./certs/dev-key.pem")) &&
      fs.existsSync(path.resolve(__dirname, "./certs/dev-cert.pem"))
        ? {
            key: fs.readFileSync(path.resolve(__dirname, "./certs/dev-key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "./certs/dev-cert.pem")),
          }
        : undefined,
  },
  plugins: [react(), versionJson(mode)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
