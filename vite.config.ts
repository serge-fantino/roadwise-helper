import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

type ReleaseNote = { version: string; date?: string | null; heure?: string | null };
type Released = { version: string; date: string; heure: string };

// The first released entry of docs/release-notes.json (released: it has a date and a time).
function firstReleased(): Released {
  const notesPath = path.resolve(__dirname, "docs/release-notes.json");
  const notes: ReleaseNote[] = JSON.parse(fs.readFileSync(notesPath, "utf8"));
  const released = notes.find((entry) => entry.date && entry.heure);
  if (!released) {
    throw new Error("docs/release-notes.json has no released entry (date and heure)");
  }
  return released as Released;
}

// Writes version.json at the site's root from the first released entry.
function versionJson(mode: string, released: Released): Plugin {
  return {
    name: "roadwise-version-json",
    apply: "build",
    generateBundle() {
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
export default defineConfig(({ mode }) => {
  const released = firstReleased();
  return {
    base: "/",
    // The version shown in the app (splash screen), the same as version.json.
    define: {
      __APP_VERSION__: JSON.stringify({ numero: released.version, date: released.date }),
    },
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
    plugins: [react(), versionJson(mode, released)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
