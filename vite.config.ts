import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/solid-health-questionnaire/",
  plugins: [react()],
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
});

