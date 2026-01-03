import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/roadwise-helper/' : '/',
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
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
