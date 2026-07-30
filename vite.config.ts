import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Set VITE_BASE_PATH=/Halo/ in GitHub Pages deploy. Local default is "/".
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
