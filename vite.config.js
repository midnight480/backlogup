import { defineConfig, loadEnv, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import nodePolyfills from "vite-plugin-node-stdlib-browser";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  process.env = { ...process.env, ...env };

  return {
    root: "./viewer/",
    publicDir: "../scripts/backlog/dist",
    define: {
      "import.meta.env.BACKLOG_HOST": JSON.stringify(env.BACKLOG_HOST || ""),
      "import.meta.env.BACKLOG_PROJECT_KEY": JSON.stringify(env.BACKLOG_PROJECT_KEY || ""),
    },
    server: {
      hmr: {
        protocol: "ws",
      },
    },
    build: {
      sourcemap: true,
      outDir: "../dist/",
      copyPublicDir: true,
    },
    plugins: [
      nodePolyfills(),
      tsconfigPaths({
        root: __dirname,
      }),
      react({
        babel: {
          parserOpts: {
            plugins: ["decorators-legacy", "classProperties"],
          },
        },
      }),
      splitVendorChunkPlugin(),
    ],
  };
});
