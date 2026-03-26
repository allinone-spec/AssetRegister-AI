import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "venn.js": path.resolve(
        __dirname,
        "./node_modules/venn.js/build/venn.js"
      ),
    },
    extensions: [".js", ".jsx"], // Support for .js and .jsx files
  },
  server: {
    proxy: {
      "/api": {
        // Proxy backend API calls in dev to avoid CORS.
        // In production, use VITE_BACKEND_BASE_URL to point at the backend directly.
        target: "http://20.244.24.90:9088",
        changeOrigin: true,
        secure: false, // HTTP backend
      },
    },
  },
});
