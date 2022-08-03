import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";
import {
  getWorkspaces,
  logger,
  runWithArg,
  sh,
  shResult,
} from "./script-runner.mjs";
import semver from "semver";

const artifactories = [
  "https://artifactory.corp.adobe.com/artifactory/api/npm/npm-adobe-platform-release/",
  "https://artifactory.corp.adobe.com/artifactory/api/npm/npm-adobe-release/",
];
const mainBranchName = "main";

const gitSays = async (...args) => shResult("git", args);
const gitDoes = async (...argSets) => {
  for (const argSet of argSets) {
    await sh("git", argSet);
  }
};

async function notOnMainBranch() {
  const currentBranch = await gitSays("branch", "--show-current");
  return currentBranch !== mainBranchName;
}

async function workingTreeNotEmpty() {
  const output = await gitSays("status", "--porcelain");
  return output !== "";
}

function setDepRange(version) {
  // mutual dependencies will use a caret range (see semver)
  return `^${version}`;
}

async function updatePackageJson(dir, newPkg) {
  await writeFile(
    resolve(dir, "package.json"),
    `${JSON.stringify(newPkg, null, 2)}\n`,
    "utf-8"
  );
}

async function release(releaseType, workingDir) {
  const sdks = await getWorkspaces("packages");

  if (await notOnMainBranch()) {
    throw new Error(`Must be on branch "${mainBranchName}" to release.`);
  }

  if (await workingTreeNotEmpty()) {
    throw new Error(
      "There are outstanding changes in the git working tree. Commit or clean the work tree before running this script."
    );
  }

  let basePkg;
  try {
    basePkg = JSON.parse(await readFile(resolve(workingDir, "package.json")));
  } catch (e) {
    throw new Error(
      `Could not fetch base version from package.json: ${e.message}`
    );
  }

  const mismatches = sdks.filter(({ pkg }) => pkg.version !== basePkg.version);

  if (mismatches.length > 0) {
    const displayedMismatches = mismatches.map(
      ({ pkg }) => `${pkg.name} ${pkg.version}`
    );
    throw new Error(`Version mismatch! All package versions should be the same as the version of the base monorepo:
  ${basePkg.version}

But the following packages were not:
${displayedMismatches.join("\n")}

This may have been intentional, but this script is only designed for lockstep releasing.
Continue the release manually.`);
  }

  const depTypes = ["dependencies", "devDependencies", "peerDependencies"];
  const newVersion = semver.inc(basePkg.version, releaseType);

  await Promise.all(
    sdks.map(async ({ cwd, pkg }) => {
      const newVersionPkg = { ...pkg, version: newVersion };
      for (const depType of depTypes) {
        if (!pkg[depType]) {
          continue;
        }
        const newDepList = { ...pkg[depType] };
        for (const sdk of sdks) {
          if (Reflect.has(newDepList, sdk.pkg.name)) {
            newDepList[sdk.pkg.name] = setDepRange(newVersion);
          }
        }
        newVersionPkg[depType] = newDepList;
      }
      await updatePackageJson(cwd, newVersionPkg);
      logger.done("Updated %s package.json to v%s", pkg.name, newVersion);
    })
  );

  await updatePackageJson(workingDir, { ...basePkg, version: newVersion });

  const newTag = `v${newVersion}`;
  logger.done("Updated monorepo base version to %s", newTag);

  logger.log("Rerunning install to rewrite package lock:");
  await sh("npm", ["install"]);
  logger.done("Installed. Creating git commit:");
  await gitDoes(
    ["add", "."],
    ["commit", "-m", newTag],
    ["tag", "-a", newTag, "-m", newTag],
    ["push", "--follow-tags"]
  );
  logger.done("Pushed version commit and tag to remote.");
  logger.log("Running npm publish on each package.");

  for (const sdk of sdks) {
    for (const artifactory of artifactories) {
      await sh("npm", ["publish", `--@adobe:registry='${artifactory}'`], {
        cwd: sdk.cwd,
      });
    }
  }
}

runWithArg(release, ["major", "minor", "patch"]);
