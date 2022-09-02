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

async function updatePackageJson(dir, updates) {
  const pkgPath = resolve(dir, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  // doing this instead of a {...pkg, ...updates} merge to preserve order of
  // properties, otherwise "version" ends up at the bottom
  for (const [prop, value] of Object.entries(updates)) {
    pkg[prop] = value;
  }
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
}

async function updatePackageVersions(version, sdks, workingDir) {
  const depTypes = ["dependencies", "devDependencies", "peerDependencies"];
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
            newDepList[sdk.pkg.name] = setDepRange(version);
          }
        }
        pkgUpdates[depType] = newDepList;
      }
      await updatePackageJson(cwd, pkgUpdates);
      logger.done("Updated %s package.json to v%s", pkg.name, version);
    })
  );

  await updatePackageJson(workingDir, { version });

  logger.done("Updated monorepo base version to %s", version);

  logger.log("Rerunning install to rewrite package lock:");
  await sh("npm", ["install"]);
  logger.done("All versions updated to %s", version);
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

async function publishAll(sdks, registry) {
  logger.log("Running build before publish.");
  await sh("npm", ["run", "-s", "build:production"]);
  logger.log("Running npm publish on each package.");
  let registries = artifactories;
  if (registry) {
    logger.warn("Overriding default registries, publishing to: %s", registry);
    registries = [].concat(registry);
  }
  for (const sdk of sdks) {
    for (const registry of registries) {
      await sh("npm", ["publish", `--@adobe:registry=${registry}`], {
        cwd: sdk.cwd,
      });
    }
  }
}

async function release(releaseType, options) {
  if (options.noVersion && options.noGit && options.noPublish) {
    throw new Error(
      "Don't update versions, don't write Git tag, don't publish? Those are the only three things I do. Pick something!"
    );
  }

  if (await notOnMainBranch()) {
    throw new Error(`Must be on branch "${mainBranchName}" to release.`);
  }

  if (await workingTreeNotEmpty()) {
    throw new Error(
      "There are outstanding changes in the git working tree. Commit or clean the work tree before running this script."
    );
  }

  const workingDir = process.cwd();

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
    version = semver.inc(version, releaseType);
    await updatePackageVersions(version, sdks, workingDir);
  }

  if (options.noGit) {
    logger.warn("Skipping git commit and tag.");
  } else {
    await gitTagAndPush(version);
  }

  if (options.noPublish) {
    logger.warn("Skipping publish.");
  } else {
    await publishAll(sdks, options.registry);
  }
}

const allowedReleaseTypes = ["major", "minor", "patch", "prerelease"];
const knownFlags = {
  noVersion: /^--no-version$/,
  noGit: /^--no-git$/,
  noPublish: /^--no-publish$/,
  registry: /^--registry=(http.+)$/,
};

runWithArg(release, (releaseType, ...flags) => {
  if (!allowedReleaseTypes.includes(releaseType)) {
    return highlightLogVars`First argument must be one of the following release types:
 - ${allowedReleaseTypes.join("\n - ")}`;
  }
  const options = {};
  for (const [name, matcher] of Object.entries(knownFlags)) {
    const matches = flags
      .map((flag, index) => ({ index, match: flag.match(matcher) }))
      .filter(({ match }) => !!match);
    // remove matched flags
    matches.forEach((arg, i) => {
      flags.splice(arg.index - i, 1);
    });
    if (matches.length === 1) {
      options[name] = matches[0].match[1] || true;
    } else if (matches.length > 1) {
      options[name] = matches.map(({ match }) => match[1]);
    }
  }

  if (flags.length > 0) {
    throw new Error(
      `Did not recognize flags:
 ${flags.join("\n - ")}

(Use a = for flags with arguments, not a space.)`
    );
  }

  return [releaseType, options];
});
