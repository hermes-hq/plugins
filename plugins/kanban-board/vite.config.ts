import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/activate.ts"),
      formats: ["iife"],
      name: "__hermes_plugin__",
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["react"],
      output: {
        globals: {
          react: "React",
        },
        footer: `if (typeof window !== "undefined") { window.__hermesPlugins = window.__hermesPlugins || {}; window.__hermesPlugins["hermes-hq.kanban-board"] = { activate: __hermes_plugin__.activate, deactivate: __hermes_plugin__.deactivate }; }`,
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
  },
});
