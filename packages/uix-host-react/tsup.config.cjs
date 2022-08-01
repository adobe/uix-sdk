const { defineConfig } = require("tsup");
const { config } = require("../../scripts/common-tsupconfig");
export default defineConfig({
  ...config,
  external: ["react"],
});
