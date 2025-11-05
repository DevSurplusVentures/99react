import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import dotenv from "dotenv";
import environment from "vite-plugin-environment";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

dotenv.config({ path: ".env" });

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: "src/frontend/dist",
    emptyOutDir: true,
    // Ensure compatibility with IC asset canister
    rollupOptions: {
      output: {
        // Ensure stable chunk naming for IC caching
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@metaplex-foundation/js',
      '@solana/web3.js',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    'global': 'globalThis',
    'process.env': {},
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/frontend/routes",
      generatedRouteTree: "./src/frontend/routeTree.gen.ts",
    }),
    react(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment("all", { prefix: "ICRC99_" }),
    environment("all", { prefix: "CYCLES_LEDGER_" }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/frontend/"),
      buffer: 'buffer/',
    },
  },
});
