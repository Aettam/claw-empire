import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8790";
const wsTarget = process.env.VITE_WS_PROXY_TARGET ?? apiTarget.replace(/^http/i, "ws");

type ProxyErrorResponse = ServerResponse<IncomingMessage> | Socket;
type ProxyLike = {
  on(
    event: "error",
    listener: (err: NodeJS.ErrnoException, req: IncomingMessage, res: ProxyErrorResponse) => void,
  ): void;
  on(event: "proxyReqWs", listener: (proxyReq: unknown, req: IncomingMessage, socket: Socket) => void): void;
};

const isServerResponse = (res: ProxyErrorResponse): res is ServerResponse<IncomingMessage> => {
  return typeof (res as ServerResponse<IncomingMessage>).writeHead === "function";
};

const silenceEpipe = (proxy: ProxyLike) => {
  proxy.on("error", (err: NodeJS.ErrnoException, _req, res) => {
    if (err.code === "EPIPE" || err.code === "ECONNRESET") return;
    if (res && isServerResponse(res) && !res.headersSent) {
      res.writeHead(502);
      res.end();
    }
  });
  proxy.on("proxyReqWs", (_proxyReq, _req, socket) => {
    socket.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EPIPE" || err.code === "ECONNRESET") return;
    });
  });
};

const manualChunks = (id: string): string | undefined => {
  if (!id.includes("node_modules")) return undefined;

  // PixiJS — largest dep (~533 KB); deferred via lazy OfficeView
  if (id.includes("/node_modules/@pixi/")) {
    const match = id.match(/\/node_modules\/(@pixi\/[^/]+)\//);
    if (match) return `vendor-${match[1].replace("@pixi/", "pixi-")}`;
  }
  if (id.includes("/node_modules/pixi.js/")) return "vendor-pixi";

  // PowerPoint export — only loaded when feature is used
  if (id.includes("/node_modules/pptxgenjs/")) return "vendor-pptx";

  // Routing
  if (id.includes("/node_modules/react-router-dom/") || id.includes("/node_modules/react-router/"))
    return "vendor-router";

  // React core
  if (
    id.includes("/node_modules/react-dom/") ||
    id.includes("/node_modules/react/") ||
    id.includes("/node_modules/scheduler/")
  )
    return "vendor-react";

  // Icon library — tree-shaken but still sizeable; isolate for long-term caching
  if (id.includes("/node_modules/lucide-react/")) return "vendor-icons";

  // Schema validation — stable, rarely changes
  if (id.includes("/node_modules/zod/")) return "vendor-zod";

  return undefined;
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [".ts.net"],
    watch: {
      ignored: ["**/.climpire-worktrees/**"],
    },
    proxy: {
      "/api": {
        target: apiTarget,
        configure: silenceEpipe,
      },
      "/ws": {
        target: wsTarget,
        ws: true,
        configure: silenceEpipe,
      },
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 550,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
