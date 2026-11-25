import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // 相对路径，GitHub Pages 的子路径下也能打开
  base: "./",
  plugins: [react()],
  server: { port: 5174, strictPort: true },
});
