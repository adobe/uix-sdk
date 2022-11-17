const { defineConfig } = require("tsup");
const { config } = require("../../configs/common-tsupconfig");
const formats = new Set(config.format);
formats.add('iife'); // the guest library should be highly portable
export default defineConfig({
  ...config,
  format: [...formats],
  globalName: "AdobeUIXGuest",
  treeshake: false, // treeshake and globalName are not compatible in esbuild
});
