const { defineConfig } = require("tsup");
const { config } = require("../../configs/common-tsupconfig");
export default defineConfig({
  ...config,
  noExternal: ["eventemitter3"]
});
