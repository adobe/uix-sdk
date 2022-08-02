const base = {
  entry: ["src/index.ts"], // will be relative to the directory that uses it
  tsconfig: "./tsconfig.json", // see above
  format: "esm",
  platform: "browser",
  target: "es2020", // TODO: this is cool, right?
  esbuildOptions: () => ({
    color: true,
  }),
  replaceNodeEnv: true,
};

const configs = {
  development: {
    ...base,
    sourcemap: true,
    splitting: false,
  },
  production: {
    ...base,
    clean: true,
    minify: true,
  },
};

if (process.env.UIX_SDK_BUILDMODE === "report") {
  // pessimistic settings to estimate bundle size when built in some external
  // project, that doesn't tree-shake, etc
  configs.production.treeshake = false;
  configs.production.metafile = true;
  configs.production.noExternal = [/@adobe\/uix/];
}

module.exports = {
  base,
  ...configs,
  config: configs[process.env.NODE_ENV || "production"],
};
