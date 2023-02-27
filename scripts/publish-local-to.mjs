/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { resolve, relative, basename } from "path";
import { readFileSync } from "fs";
import {
  getSdks,
  highlightLogVars,
  logger,
  repoRoot,
  runWithArg,
  sh as realSh,
  shResult,
} from "./script-runner.mjs";

// for dry runs
const fakeSh = (cmd, args, opts = {}) => {
  const cwd = relative(repoRoot, opts.cwd || "") || "./";
  logger.log.hl`would run ${cwd} > ${basename(cmd)} ${args.join(" ")}`;
};

const bullets = (iter) => ["", ...iter].join("\n • ");

async function publishLocalTo({ dryRun }, dependents) {
  const sh = dryRun ? fakeSh : realSh;

  const yalc = resolve(await shResult("npm", ["bin"]), "yalc");
  try {
    await shResult(yalc, ["--version"]);
  } catch (e) {
    throw new Error(
      `Could not find "yalc" in npm path: ${e.message}. Install yalc globally with yarn or npm to proceed.
(Sorry, 'npx yalc' doesn't work in this use case.`
    );
  }

  const sdks = await getSdks();

  logger.log.hl`Publishing ${sdks.map((s) => s.shortName).join(", ")}`;
  for (const { cwd } of sdks) {
    await sh(yalc, ["publish", "--quiet", "--changed"], { cwd, silent: true });
  }

  for (const dependent of dependents) {
    const usedSdkPackages = new Set();
    const unlinkedSdkPackages = new Set();
    const yalcConfigDir = await shResult(yalc, ["dir"], {
      cwd: dependent.dir,
    });
    let yalcInstallations = {};
    try {
      yalcInstallations = JSON.parse(
        readFileSync(resolve(yalcConfigDir, "installations.json"))
      );
    } catch (e) {}

    const allDeps = new Set(
      Object.keys({
        ...(dependent.pkg.dependencies || {}),
        ...(dependent.pkg.devDependencies || {}),
        ...(dependent.pkg.peerDependencies || {}),
        ...(dependent.pkg.optionalDependencies || {}),
      })
    );

    for (const {
      pkg: { name },
    } of sdks) {
      if (!allDeps.has(name)) {
        continue;
      }
      usedSdkPackages.add(name);
      if (
        !yalcInstallations[name] ||
        !yalcInstallations[name].includes(dependent.dir)
      ) {
        unlinkedSdkPackages.add(name);
      }
    }

    if (usedSdkPackages.size) {
      logger.log.hl`${dependent.pkg.name} uses SDK packages: ${bullets(
        usedSdkPackages
      )}`;
      if (unlinkedSdkPackages.size) {
        logger.log
          .hl`These packages were not linked and will be added with yalc: ${bullets(
          unlinkedSdkPackages
        )}`;
      }
      for (const unlinked of unlinkedSdkPackages) {
        await sh(yalc, ["add", "--no-pure", unlinked], {
          cwd: dependent.dir,
        });
      }
    }
  }

  // now that they're all added, push again to ensure they're up to date
  // looks repetitive because of yalc quirks, but gets by all the weird errors
  for (const sdk of sdks) {
    await sh(yalc, ["push", "--scripts", "--quiet"], {
      cwd: sdk.cwd,
      silent: true,
    });
  }

  if (dependents.length > 0) {
    await sh('yalc', ['installations', 'show']);
  }

  logger.done("All SDKs published to yalc and up-to-date.");
}

runWithArg(publishLocalTo, async (argv) => {
  const dependents = [];

  for (const dependentArg of argv._) {
    const dir = resolve(dependentArg);
    try {
      const pkg = JSON.parse(readFileSync(resolve(dir, "package.json")));
      dependents.push({ dir, pkg });
    } catch (e) {
      return highlightLogVars`A valid NPM package could not be found in ${dir}, so we cannot continue. Error was:\n  ${e.message}`;
    }
  }
  return [argv, dependents];
});
