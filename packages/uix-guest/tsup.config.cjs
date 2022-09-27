const { defineConfig } = require("tsup");
const { config } = require("../../configs/common-tsupconfig");
export default defineConfig({
  ...config,
  format: ["cjs", "iife"], // the guest library should be highly portable
  globalName: "AdobeUIXGuest",
  treeshake: false, // treeshake and globalName are not compatible in esbuild
});
