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

import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";
import {
  getWorkspaces,
  highlightLogVars,
  logger,
  runWithArg,
  sh,
  shResult,
} from "./script-runner.mjs";
import semver from "semver";

const allowedReleaseTypes = ["major", "minor", "patch", "prerelease"];

const artifactories = ["https://registry.npmjs.org"];
const mainBranchName = "main";

let isDryRun = false;

const gitSays = async (...args) => shResult("git", args);
const gitDoes = async (...argSets) => {
  for (const argSet of argSets) {
    if (isDryRun) {
      logger.log.hl`git ${argSet.join(" ")}`;
    } else {
      await sh("git", argSet);
    }
  }
};

async function getCurrentBranch() {
  return gitSays("branch", "--show-current");
}

async function workingTreeNotEmpty() {
  const output = await gitSays("status", "--porcelain");
  return output !== "";
}

async function getCurrentVersion(workingDir) {
  let version;
  try {
    version = JSON.parse(
      await readFile(resolve(workingDir, "package.json"))
    ).version;
    if (!version) {
      throw new Error("package.json had no valid 'version' entry");
    }
  } catch (e) {
    throw new Error(
      `Could not fetch base version from package.json: ${e.message}`
    );
  }
  return version;
}

function setDepRange(version) {
  // mutual dependencies will use a caret range (see semver)
  return `^${version}`;
}

async function updatePackageJson(dir, updates) {
  const pkgPath = resolve(dir, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  // doing this instead of a {...pkg, ...updates} merge to preserve order of
  // properties, otherwise "version" ends up at the bottom
  for (const [prop, value] of Object.entries(updates)) {
    pkg[prop] = value;
  }
  if (!isDryRun) {
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  }
}

async function updatePackageVersions(version, sdks, workingDir) {
  const depTypes = ["dependencies", "devDependencies", "peerDependencies"];
  const semverVersion = setDepRange(version);
  await Promise.all(
    sdks.map(async ({ cwd, pkg }) => {
      const pkgUpdates = { version };
      for (const depType of depTypes) {
        if (!pkg[depType]) {
          continue;
        }
        const newDepList = { ...pkg[depType] };
        for (const sdk of sdks) {
          if (Reflect.has(newDepList, sdk.pkg.name)) {
            newDepList[sdk.pkg.name] = semverVersion;
          }
        }
        pkgUpdates[depType] = newDepList;
      }
      await updatePackageJson(cwd, pkgUpdates);
      logger.done.hl`Updated ${pkg.name} package.json to ${semverVersion}`;
    })
  );

  await updatePackageJson(workingDir, { version });

  logger.done.hl`Updated monorepo base version to ${semverVersion}`;

  logger.log("Rerunning install to rewrite package lock:");
  await sh("npm", ["install"]);
  logger.done.hl`All versions updated to ${semverVersion}`;
}

async function gitTagAndPush(newVersion) {
  const newTag = `v${newVersion}`;
  await gitDoes(
    ["add", "."],
    ["commit", "-m", newTag],
    ["tag", "-a", newTag, "-m", newTag],
    ["push", "--follow-tags"]
  );
  logger.done("Pushed version commit and tag to remote.");
}

async function publishAll(sdks, registry, otherPublishArgs) {
  logger.log("Running npm publish on each package.");
  let registries = artifactories;
  if (registry) {
    logger.warn.hl`Overriding default registries, publishing to: ${registry}`;
    registries = [].concat(registry);
  }
  for (const sdk of sdks) {
    for (const registry of registries) {
      await sh(
        "npm",
        ["publish", `--@adobe:registry=${registry}`, ...otherPublishArgs],
        {
          cwd: sdk.cwd,
        }
      );
    }
  }
}

async function release(releaseType, options) {
  if (options.noVersion && options.noGit && options.noPublish) {
    throw new Error(
      "Don't update versions, don't write Git tag, don't publish? Those are the only three things I do. Pick something!"
    );
  }
  if (options.dryRun) {
    isDryRun = true;
  }

  const currentBranch = await getCurrentBranch();

  if (currentBranch !== mainBranchName) {
    logger.warn.hl`On branch ${currentBranch} instead of ${mainBranchName}`;
    if (options.force) {
      logger.warn("--force passed, ignoring.");
    } else {
      throw new Error(
        `Must be on branch "${mainBranchName}" to release. Pass --force to override.`
      );
    }
  }

  if (await workingTreeNotEmpty()) {
    logger.warn("Uncommitted changes in working directory.");
    if (options.force) {
      logger.warn("--force passed, ignoring.");
    } else {
      throw new Error(
        `Working directory must be empty to publish. Pass --force to override.`
      );
    }
  }
  const workingDir = process.cwd();

  let version = await getCurrentVersion(workingDir);

  const sdks = await getWorkspaces("packages");

  const mismatches = sdks.filter(({ pkg }) => pkg.version !== version);

  if (mismatches.length > 0) {
    const displayedMismatches = mismatches.map(
      ({ pkg }) => `${pkg.name} ${pkg.version}`
    );
    throw new Error(`Version mismatch! All package versions should be the same as the version of the base monorepo:
  ${version}

But the following packages were not:
${displayedMismatches.join("\n")}

This may have been intentional, but this script is only designed for lockstep releasing.
Continue the release manually.`);
  }

  if (options.noVersion) {
    logger.warn("Skipping version update.");
  } else {
    if (semver.valid(releaseType)) {
      // it's a manual version, not a type like "major". is it a higher version?
      if (semver.lte(releaseType, version)) {
        throw new Error(
          `Cannot set new version "${releaseType}" because it is less than, or equal to, the current version "${version}".`
        );
      }
      version = releaseType;
    } else {
      version = semver.inc(version, releaseType);
    }
    await updatePackageVersions(version, sdks, workingDir);
  }

  logger.log("Running lint and build before publish.");
  try {
    await sh("npm", ["run", "-s", "lint"]);
  } catch (e) {
    throw new Error(
      `Lint failed, cannot proceed with release. Run "npm run format" to correct autocorrectable issues and then try again.`
    );
  }
  const buildEnv = {
    ...process.env,
    UIX_SDK_BUILDMODE: version,
  };
  try {
    await sh("npm", ["run", "-s", "build:production"], {
      env: buildEnv,
    });
  } catch (e) {
    throw new Error("Build failed, cannot proceed with release.");
  }

  try {
    await sh("npm", ["run", "-s", "docs"], { env: buildEnv });
  } catch (e) {
    throw new Error(
      "Documentation update failed, cannot proceed with release."
    );
  }

  if (options.noVersion || options.noGit) {
    logger.warn("Skipping git commit and tag.");
  } else {
    await gitTagAndPush(version);
  }

  if (options.noPublish) {
    logger.warn("Skipping publish.");
  } else {
    const publishArgs = [];
    if (isDryRun) {
      publishArgs.push("--dry-run");
    }
    if (options.tag) {
      publishArgs.push("--tag", options.tag);
    }
    await publishAll(sdks, options.registry, publishArgs);
  }
  if (isDryRun) {
    logger.warn("This was a dry run. None of the above actually happened.");
  }
}

runWithArg(release, (argv) => {
  if (argv._.length !== 1) {
    return `Missing version argument.`;
  }
  if (argv._.length > 1) {
    return `Too many arguments.`;
  }
  const [releaseType] = argv._;
  if (
    !allowedReleaseTypes.includes(releaseType) &&
    !semver.valid(releaseType)
  ) {
    return highlightLogVars`First argument must be a valid version string, or one of the following release types:
 - ${allowedReleaseTypes.join("\n - ")}`;
  }
  return [releaseType, argv];
});
