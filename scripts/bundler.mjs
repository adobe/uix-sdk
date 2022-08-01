import { spawnSync } from "child_process";
import {
  getWorkspaces,
  highlight,
  logger,
  runWithArg,
} from "./script-runner.mjs";

const modes = ["development", "production"];

async function bundle(mode) {
  const log = mode === "production" ? logger.log : () => {};
  const sdks = await getWorkspaces("packages");
  const completed = [];
  log(
    highlight`Building ${sdks.length} packages:
 - ${sdks.map(({ pkg }) => pkg.name).join("\n - ")}`
  );
  for (const { pkg } of sdks) {
    log(highlight`Building ${pkg.name}`);
    if (
      spawnSync("npm", ["run", "-s", "-w", pkg.name, "build"], {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_ENV: mode,
        },
      }).status !== 0
    ) {
      logger.error(
        highlight`Failed to build ${pkg.name}. ${
          completed.length
        } previous packages succeeded: ${completed.join(",")}`
      );
      break;
    } else {
      completed.push(pkg.name);
    }
  }
  if (completed.length === sdks.length) {
    logger.done(highlight`Built ${completed.length} packages.`);
  }
}

runWithArg(bundle, modes);
