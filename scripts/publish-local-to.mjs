import { resolve, relative } from "path";
import { readFileSync } from "fs";
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

  const sdks = await getSdks();

  if (dependent) {
    const absDependentDir = resolve(workDir, dependent);
    const sdkPackages = new Set(sdks.map(sdkPart => sdkPart.pkg.name));
    const usedSdkPackages = new Set();
    const unlinkedSdkPackages = new Set();
    const yalcConfigDir = await shResult(yalc, ["dir"], {
      cwd: absDependentDir,
    });
    const yalcInstallations = JSON.parse(
      readFileSync(resolve(yalcConfigDir, 'installations.json'))
    );

    logger.log(
      "Checking if %s has already yalc-added SDK packages",
      dependentName
    );
    try {
      const found = JSON.parse(
        await shResult("npm", ["explain", "--json", ...sdkPackages], {
          cwd: absDependentDir,
        })
      );
      for (const entry of found) {
        if (sdkPackages.has(entry.name)) {
          usedSdkPackages.add(entry.name)
          if (!yalcInstallations[entry.name] || !yalcInstallations[entry.name].includes(absDependentDir)) {
            unlinkedSdkPackages.add(entry.name)
          }
        }
      }
      if (usedSdkPackages.size) {
        logger.log(`Used SDK packages: %s`, [...usedSdkPackages]);
        if (unlinkedSdkPackages) {
          logger.log(`SDK packages were not linked and will be added with yalc: %s`, [...unlinkedSdkPackages]);
        }
      } else {
        sdkPackages.forEach(sdkPkg => unlinkedSdkPackages.add(sdkPkg));
        logger.log(`SDKs were not used and will be added: %s`, unlinkedSdkPackages);
      }
    } catch (e) {}
  }


  for (const sdk of sdks) {
    await sh(yalc, ["push", relative(workDir, sdk.cwd)]);
    if (dependent && unlinkedSdkPackages.has(sdk.pkg.name)) {
      await sh(yalc, ["add", sdk.pkg.name], { cwd: absDependentDir });
    }
  }
  logger.done("All changes to all SDKs pushed.");  
}

runWithArg(publishLocalTo, async (dependent, highlight) => {
  if (!dependent) {
    return;
  }

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
