import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

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
      sourcemap: mode !== "production",
      outDir: "../dist/",
      copyPublicDir: true,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      react({
        babel: {
          parserOpts: {
            plugins: ["decorators-legacy", "classProperties"],
          },
        },
      }),
    ],
  };
});
