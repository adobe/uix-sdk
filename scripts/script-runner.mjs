import { promisify } from "util";
import { basename, resolve } from "path";
import { readdir, readFile } from "fs/promises";
import chalk from "chalk";
import figures from "figures";
import { execFile, spawn } from "child_process";
const execP = promisify(execFile);

const highlighter =
  (formatter) =>
  (parts, ...fields) => {
    const [start, ...joins] = parts;
    return `${start}${fields
      .map((field, i) => `${formatter(field)}${joins[i]}`)
      .join("")}`;
  };

export const highlight = highlighter(chalk.yellow);

const LogFormats = {
  error: [figures.circleCross, chalk.red],
  warn: [figures.warning, chalk.yellow],
  log: ["", (x) => x],
  done: [figures.checkboxCircleOn, chalk.green],
};

export const logger = Object.keys(LogFormats).reduce((logger, level) => {
  const [symbol, color] = LogFormats[level];
  const method = typeof console[level] === "function" ? level : "log";
  return {
    ...logger,
    [level](first, ...rest) {
      console[method](color(`${symbol}  ${first}`), ...rest);
    },
  };
}, {});

export async function sh(cmd, args, opts) {
  if (!Array.isArray(args)) {
    throw new Error(
      `Internal error: called sh("${cmd}"... with ${JSON.stringify(
        args
      )} instead of an args array`
    );
  }
  logger.log(`${cmd} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(cmd, args, {
        stdio: "inherit",
        encoding: "utf-8",
        ...opts,
      });
      child.on("error", reject);
      child.on("close", (code) => (code === 0 ? resolve() : reject()));
    } catch (e) {
      reject(e);
    }
  });
}

export async function shResult(cmd, args, opts = {}) {
  if (!Array.isArray(args)) {
    throw new Error(
      `Internal error: called shResult("${cmd}"... with ${JSON.stringify(
        args
      )} instead of an args array`
    );
  }
  return (await execP(cmd, args, { encoding: "utf-8", ...opts })).stdout.trim();
}

const IS_NOT_WORKSPACE = Symbol("IS_NOT_WORKSPACE");
export async function getWorkspaces(category) {
  const workspaceNames = await readdir(resolve(process.cwd(), category));
  const workspaces = await Promise.all(
    workspaceNames.map(async (name) => {
      const workspaceDir = resolve(process.cwd(), category, name);
      try {
        const hasPkg = (await readdir(workspaceDir)).some(
          (filename) => filename === "package.json"
        );
        if (!hasPkg) {
          return IS_NOT_WORKSPACE;
        }
      } catch (e) {
        return IS_NOT_WORKSPACE;
      }
      const pkg = JSON.parse(
        await readFile(resolve(workspaceDir, "package.json"))
      );
      return {
        cwd: workspaceDir,
        pkg,
      };
    })
  );
  return workspaces.filter((result) => result !== IS_NOT_WORKSPACE);
}

export const getSdks = () => getWorkspaces("packages");
export const getExamples = () => getWorkspaces("examples");

export function argIn(allowedArgs, passed) {
  const arg = passed || "not provided";
  if ((allowedArgs && !arg) || !allowedArgs.includes(arg)) {
    return highlight`Command line argument to ${basename(
      process.argv[1]
    )} must be one of:${allowedArgs.map((opt) => `\n - ${opt}`).join("")}
but it was ${arg}`;
  }
}

function deny(reason) {
  logger.error(reason);
  process.exit(1);
}

export async function runWithArg(fn, validator = () => {}) {
  const validateArg = Array.isArray(validator)
    ? (arg) => argIn(validator, arg)
    : validator;
  const invalidReason = await validateArg(process.argv[2], highlight);
  if (invalidReason) {
    deny(invalidReason);
  }
  try {
    let workingDir = process.cwd();
    try {
      const gitRoot = await shResult("git", ["rev-parse", "--show-toplevel"]);
      if (gitRoot !== workingDir) {
        logger.warn("Changing directory to %s", gitRoot);
        process.chdir(gitRoot);
        workingDir = gitRoot;
      }
    } catch (e) {
      deny(
        `Need to be in the git repo for @adobe/uix-sdk-monorepo. ${e.message}`
      );
    }
    await fn(process.argv[2], workingDir);
  } catch (e) {
    deny(e);
  }
}
