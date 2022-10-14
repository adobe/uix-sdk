const base = {
  entry: ["src/index.ts"], // will be relative to the directory that uses it
  tsconfig: "./tsconfig.json", // see above
  format: ["cjs"],
  platform: "browser",
  shims: true,
  target: "ES6", // TODO: this is cool, right?
  replaceNodeEnv: true,
  legacyOutput: true,
  treeshake: "recommended",
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

configs.production = configs.development; // Disable production build.
/**
 * TODO reenable build minification and optimization.
 * Removed 2022-09-28 to improve debugging experience for extension devs.
 *
 * The following is the output of `node scripts/bundler.mjs report`.
 *
 * Current bundle size reports in development mode:
 *   require('@adobe/uix-core') ← 8.36kb
 *   require('@adobe/uix-guest') ← 16.74kb including core
 *   require('@adobe/uix-host') ← 25.58kb including core
 *   require('@adobe/uix-host-react') ← 38.18kb including host
 *
 * When production mode is enabled in the current state, the bundle sizes are:
 *   require('@adobe/uix-core') ← 4.04kb
 *   require('@adobe/uix-guest') ← 7.07kb including core
 *   require('@adobe/uix-host') ← 11.80kb including core
 *   require('@adobe/uix-host-react') ← 16.10kb including host
 *
 * As of now, the final size of this dependency is fairly small compared to the
 * overall weight of the bundles that consume it. Still, disabling optimization
 * does double the size, which may become a concern as features are added.
 */

if (mode === "report") {
  // pessimistic settings to estimate bundle size when built in some external
  // project, that doesn't tree-shake, etc
  mode = "production";
  configs.production.treeshake = false;
  configs.production.metafile = true;
  configs.production.sourcemap = false;
  configs.production.noExternal = [/@adobe\/uix/];
}

module.exports = {
  base,
  ...configs,
  config: configs[mode],
};
