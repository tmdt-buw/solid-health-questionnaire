import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import sourcePackage from "./package.json";
import { distPackageManifestPlugin } from "./build-config/distPackageManifest";

export default defineConfig({
  plugins: [react(), distPackageManifestPlugin(sourcePackage)],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: "src/embed/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
      cssFileName: "embed",
    },
    rollupOptions: {
      external: (id) =>
        id === "react" ||
        id === "react-dom" ||
        id === "react/jsx-runtime" ||
        id.startsWith("@inrupt/"),
    },
  },
});
