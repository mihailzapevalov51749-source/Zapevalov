import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const FRONTEND_PORT_BY_MODE = {
  development: 5173,
  template: 5174,
  client: 5175,
};

/** WI-RUNTIME-ISOLATION-03B: build staging inside DEV workspace only. */
const BUILD_STAGING_OUT_DIR_BY_MODE = {
  template: ".build-staging/template",
  client: ".build-staging/client",
};

const templateRuntimeFrontend = String(
  process.env.YASNOPRO_TEMPLATE_RUNTIME_FRONTEND || "",
).trim();

const clientRuntimeFrontend = String(
  process.env.YASNOPRO_CLIENT_RUNTIME_FRONTEND || "",
).trim();

function resolvePlatformApiChunk(id) {
  const normalized = String(id).replace(/\\/g, "/");
  if (normalized.includes("node_modules/axios")) {
    return "platform-api";
  }
  if (
    normalized.includes("/src/config/apiConfig")
    || normalized.includes("/src/api/")
    || normalized.includes("/src/modules/designer/api/platformApiClient")
  ) {
    return "platform-api";
  }
  return undefined;
}

// https://vite.dev/config/
export default defineConfig(({ mode, command, isPreview }) => {
  const port = FRONTEND_PORT_BY_MODE[mode] ?? FRONTEND_PORT_BY_MODE.development;
  const stagingOutDir = BUILD_STAGING_OUT_DIR_BY_MODE[mode];

  let outDir;
  if (command === "build" && stagingOutDir) {
    outDir = stagingOutDir;
  } else if (isPreview && mode === "template" && templateRuntimeFrontend) {
    outDir = templateRuntimeFrontend;
  } else if (isPreview && mode === "client" && clientRuntimeFrontend) {
    outDir = clientRuntimeFrontend;
  }

  return {
    plugins: [react()],
    server: {
      port,
      strictPort: true,
    },
    build: outDir
      ? {
          outDir,
          emptyOutDir: command === "build",
          rollupOptions: {
            output: {
              manualChunks(id) {
                return resolvePlatformApiChunk(id);
              },
            },
          },
        }
      : undefined,
    preview: {
      port,
      strictPort: true,
    },
  };
});
