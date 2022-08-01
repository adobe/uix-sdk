const base = {
  entry: ["src/index.ts"],
  tsconfig: "./tsconfig.json",
  format: "esm",
  platform: "browser",
  target: "es2020",
  esbuildOptions: () => ({
    color: true,
    logLimit: 0,
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
    treeshake: true,
  },
};

module.exports = {
  base,
  ...configs,
  config: configs[process.env.NODE_ENV] || configs.development,
};
