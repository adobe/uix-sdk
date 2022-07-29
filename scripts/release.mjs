import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";
import { execFileSync as exec, spawnSync } from "child_process";
import { getWorkspaces, runWithArg, logger } from "./script-runner.mjs";
import semver from "semver";

const mainBranchName = "main";

function doGit(...args) {
  return exec("git", args, { encoding: "utf-8" }).trim();
}

function showGit(...args) {
  logger.log(`git ${args.join(" ")}`);
  spawnSync("git", args, { encoding: "utf-8" });
}

function notOnMainBranch() {
  return doGit("branch", "--show-current") !== mainBranchName;
}

function workingTreeNotEmpty() {
  const output = doGit("status", "--porcelain");
  return !!output;
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

async function release(releaseType) {
  const sdks = await getWorkspaces("packages");
  let workingDir = process.cwd();
  try {
    const gitRoot = doGit("rev-parse", "--show-toplevel");
    if (gitRoot !== workingDir) {
      logger.warn("Changing directory to %s", gitRoot);
      process.chdir(gitRoot);
      workingDir = gitRoot;
    }
  } catch (e) {
    throw new Error(
      `Need to be in the git repo for @adobe/uix-sdk-monorepo. ${e.message}`
    );
  }

  if (notOnMainBranch()) {
    throw new Error(`Must be on branch "${mainBranchName}" to release.`);
  }

  if (workingTreeNotEmpty()) {
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
  spawnSync("npm", ["install"]);
  logger.done("Installed. Creating git commit:");
  showGit("add", ".");
  showGit("commit", "-m", newTag);
  showGit("tag", "-a", newTag, "-m", newTag);
  logger.done("Version change committed and tagged.");
  showGit("push", "--follow-tags");
  logger.done("Pushed version commit and tag to remote.");
  logger.log("Running npm publish on each package.");

  for (const sdk of sdks) {
    spawnSync("npm", ["publish"], { cwd: sdk.cwd });
  }
}

runWithArg(release, ["major", "minor", "patch"]);
