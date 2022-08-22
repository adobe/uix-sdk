import { resolve, relative } from "path";
import { getSdks, logger, runWithArg, sh, shResult } from "./script-runner.mjs";

let absDependentDir;
let dependentName;

async function publishLocalTo(dependent, workDir) {
  const yalc = resolve(await shResult("npm", ["bin"]), "yalc");
  try {
    await shResult(yalc, ['--version']); 
  } catch (e) {
    throw new Error(`Could not find "yalc" in npm path: ${e.message}`);
  }

  const absDependentDir = resolve(workDir, dependent);
  const sdks = await getSdks();
  const unlinked = new Set(sdks.map((_, pkg) => pkg.name));
  logger.log(
    "Checking if %s has already yalc-added SDK packages",
    dependentName
  );
  try {
    const found = JSON.parse(
      await shResult("npm", ["explain", "--json", ...unlinked], {
        cwd: absDependentDir,
      })
    );
    for (const entry of found) {
      if (unlinked.has(entry.name)) {
        unlinked.delete(entry.name);
      }
    }
    if (unlinked.size > 0) {
      logger.warn(
        `${unlinked.size} SDKs were not linked and will be added: %s`,
        [...unlinked]
      );
    }
  } catch (e) {}
  await Promise.all(
    sdks.map(async (sdk) => {
      await sh(yalc, ["push", relative(workDir, sdk.cwd)]);
      if (unlinked.has(sdk.pkg.name)) {
        await sh(yalc, ["add", sdk.pkg.name], { cwd: absDependentDir });
      }
    })
  );
  logger.done("All changes to all SDKs pushed.");
}

runWithArg(publishLocalTo, async (dependent, highlight) => {
  absDependentDir = resolve(dependent);
  try {
    dependentName = await shResult("npm", ["pkg", "-s", "get", "name"], {
      cwd: absDependentDir,
    });
  } catch (e) {
    let problem = e.stdout;
    try {
      const { error } = JSON.parse(problem);
      problem = error.summary;
    } catch (e) {}
    return highlight`A valid NPM package could not be found in ${absDependentDir}, so we cannot continue. Error was:\n  ${problem}`;
  }
});
