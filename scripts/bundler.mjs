import esbuild from "esbuild";
import { getWorkspaces, runWithArg } from "./script-runner.mjs";

const modes = ["development", "production"];

const config = {
  base: {},
  development: {},
  production: {},
};

async function bundle(mode) {
  const sdks = await getWorkspaces("packages");
  for (const { cwd, pkg } of sdks) {
    console.log("Building %s", pkg.name);
    const result = await esbuild.build({
      absWorkingDir: cwd,
      bundle: true,
      entryPoints: ["src/index.ts"],
      sourcemap: true,
      outdir: "dist",
      format: "esm",
      splitting: true,
      external: ["react"],
    });
    console.log(result);
  }
}

runWithArg(bundle, modes);
