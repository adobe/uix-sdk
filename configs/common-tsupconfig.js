const base = {
  entry: ["src/index.ts"], // will be relative to the directory that uses it
  tsconfig: "./tsconfig.json", // see above
  format: ["esm", "cjs"],
  platform: "browser",
  target: "es2020", // TODO: this is cool, right?
  replaceNodeEnv: true,
};

const allowedModes = ["development", "production", "report"];

let mode = process.env.UIX_SDK_BUILDMODE;
if (!mode) {
  console.error(
    "No explicit mode was passed to the build via $UIX_SDK_BUILDMODE or $NODE_ENV. Using 'development' by default"
  );
  mode = "development";
} else if (!allowedModes.includes(mode)) {
  console.error(
    'Unrecognised build mode "%s". Allowed build modes are: %s',
    mode,
    allowedModes
  );
  process.exit(1);
}

const configs = {
  development: {
    ...base,
    sourcemap: true,
    declarationMap: false,
    splitting: false,
  },
  production: {
    ...base,
    clean: true,
    minify: true,
  },
};

if (mode === "report") {
  // pessimistic settings to estimate bundle size when built in some external
  // project, that doesn't tree-shake, etc
  mode = "production";
  configs.production.treeshake = false;
  configs.production.metafile = true;
  configs.production.noExternal = [/@adobe\/uix/];
}

module.exports = {
  base,
  ...configs,
  config: configs[mode],
};
