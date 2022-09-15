import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import commonExampleConfig from "../../configs/common-viteconfig";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  ...commonExampleConfig(),
});
