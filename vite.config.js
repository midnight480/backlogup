import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/**
 * 開発サーバー (npm run dev) から共有ファイルを Backlog API 経由で取得するためのプラグイン。
 * API キーはサーバー側 (.env) でのみ使用し、ブラウザには公開しない。
 *  - GET  /api/shared-files/status   … 設定有無と、既にローカルへ取得済みのファイルIDを返す
 *  - POST /api/shared-files/download … { ids: number[] } を受け取り、API から取得して dist へ保存
 */
function sharedFilesApiPlugin(env) {
  const host = env.BACKLOG_HOST;
  const apiKey = env.BACKLOG_API_KEY;
  const projectKey = env.BACKLOG_PROJECT_KEY;
  const baseDir = path.resolve(__dirname, "scripts/backlog/dist/assets/shared-files");
  const listPath = path.resolve(baseDir, "list.json");

  const relPathOf = (f) => `${f.dir}/${f.name}`.replace(/\/+/g, "/").replace(/^\//, "");

  // baseDir 配下に安全に解決する（パストラバーサル防止）
  const safeTarget = (rel) => {
    const segments = rel.split("/").filter((s) => s && s !== "." && s !== "..");
    const target = path.resolve(baseDir, ...segments);
    if (target !== baseDir && !target.startsWith(baseDir + path.sep)) {
      throw new Error(`unsafe path: ${rel}`);
    }
    return target;
  };

  const loadList = () => {
    try {
      return JSON.parse(fs.readFileSync(listPath, "utf-8"));
    } catch {
      return [];
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchSharedFile = async (id) => {
    const url = `https://${host}/api/v2/projects/${projectKey}/files/${id}?apiKey=${apiKey}`;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url);
      // レート制限は 1 分でリセットされるため、429 のときは待機して再試行する
      if (res.status === 429 && attempt < 2) {
        await sleep(60000);
        continue;
      }
      if (!res.ok) throw new Error(`Backlog API error: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }
  };

  const sendJson = (res, code, obj) => {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
  };

  const readJsonBody = (req) =>
    new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on("error", reject);
    });

  return {
    name: "shared-files-api",
    configureServer(server) {
      server.middlewares.use("/api/shared-files/status", (_req, res) => {
        const configured = Boolean(host && apiKey && projectKey);
        const downloadedIds = [];
        for (const f of loadList()) {
          try {
            // バイト数が一致する場合のみ「取得済み」とみなす（不完全ファイルの誤判定防止）
            const target = safeTarget(relPathOf(f));
            if (fs.existsSync(target) && fs.statSync(target).size === f.size) downloadedIds.push(f.id);
          } catch {}
        }
        sendJson(res, 200, { configured, downloadedIds });
      });

      server.middlewares.use("/api/shared-files/download", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "method not allowed" });
          return;
        }
        if (!host || !apiKey || !projectKey) {
          sendJson(res, 400, {
            error: "BACKLOG_HOST / BACKLOG_API_KEY / BACKLOG_PROJECT_KEY が未設定です (.env を確認してください)",
          });
          return;
        }

        let body;
        try {
          body = await readJsonBody(req);
        } catch {
          sendJson(res, 400, { error: "invalid request body" });
          return;
        }

        const ids = Array.isArray(body.ids) ? body.ids : [];
        const byId = new Map(loadList().map((f) => [f.id, f]));
        const results = [];
        for (const id of ids) {
          const f = byId.get(id);
          if (!f) {
            results.push({ id, ok: false, error: "not in list" });
            continue;
          }
          try {
            const rel = relPathOf(f);
            const target = safeTarget(rel);
            const buf = await fetchSharedFile(id);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            // 一時ファイルに書き込んでから rename し、中断時に不完全ファイルが残らないようにする
            const tempPath = `${target}.part`;
            try {
              fs.writeFileSync(tempPath, buf);
              fs.renameSync(tempPath, target);
            } catch (e) {
              try {
                fs.unlinkSync(tempPath);
              } catch {}
              throw e;
            }
            results.push({ id, ok: true, path: rel });
          } catch (e) {
            results.push({ id, ok: false, error: String(e?.message || e) });
          }
        }
        sendJson(res, 200, { results });
      });

      server.middlewares.use("/api/user-mapping/save", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "method not allowed" });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const mapping = body.mapping || body;
          const jsonContent = JSON.stringify(mapping, null, 2);

          const targetPath1 = path.resolve(__dirname, "scripts/backlog/dist/assets/user-mapping.json");
          const targetPath2 = path.resolve(__dirname, "user-mapping.json");

          fs.mkdirSync(path.dirname(targetPath1), { recursive: true });
          fs.writeFileSync(targetPath1, jsonContent, "utf-8");
          fs.writeFileSync(targetPath2, jsonContent, "utf-8");

          sendJson(res, 200, { ok: true, message: "user-mapping.json saved directly to server workspace" });
        } catch (e) {
          sendJson(res, 500, { error: String(e?.message || e) });
        }
      });
    },
  };
}

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
      sharedFilesApiPlugin(env),
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
