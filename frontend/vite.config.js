import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const FRONTEND_PORT_BY_MODE = {
  development: 5173,
  template: 5174,
  client: 5175,
};

/** WI-RUNTIME-ISOLATION-02: isolated artifact output per environment mode. */
const ARTIFACT_OUT_DIR_BY_MODE = {
  template: "dist-template",
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const port = FRONTEND_PORT_BY_MODE[mode] ?? FRONTEND_PORT_BY_MODE.development;
  const artifactOutDir = ARTIFACT_OUT_DIR_BY_MODE[mode];

  return {
    plugins: [react()],
    server: {
      port,
      strictPort: true,
    },
    build: artifactOutDir ? { outDir: artifactOutDir, emptyOutDir: true } : undefined,
    preview: {
      port,
      strictPort: true,
    },
  };
});
