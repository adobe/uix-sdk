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

import { promisify } from "util";
import { basename, resolve } from "path";
import { readdir, readFile } from "fs/promises";
import chalk from "chalk";
import figures from "figures";
import { execFile, spawn } from "child_process";
const execP = promisify(execFile);

const repoRoot = new URL("../", import.meta.url).pathname;

export const logVarHighlighter =
  (formatter) =>
  (parts, ...fields) => {
    const [start, ...joins] = parts;
    return `${start}${fields
      .map((field, i) => `${formatter(field)}${joins[i]}`)
      .join("")}`;
  };

export const highlightLogVars = logVarHighlighter(chalk.bold);

const LogFormats = {
  error: [figures.circleCross, chalk.red, chalk.white],
  warn: [figures.warning, chalk.yellow],
  log: ["", (x) => x],
  debug: [figures.circle, (x) => x],
  trace: [figures.circleDotted, (x) => x],
  done: [figures.tick, chalk.green],
};

const LogSynonyms = {
  error: ["fatal"],
  warn: ["warning"],
  debug: ["verbose"],
  trace: ["silly"],
};

export const makeLogger = (tagTxt) =>
  Object.keys(LogFormats).reduce((logger, methodName) => {
    const [symbol, color, highlightColor] = LogFormats[methodName];
    const tag = tagTxt ? chalk.dim(` (${tagTxt})`) : "";
    const prefix = color(symbol + tag);
    const level =
      typeof console[methodName] === "function" ? methodName : "log";
    const method = (first, ...rest) =>
      console[level](`${prefix} ${color(first)}`, ...rest);
    const outConsole = {
      ...logger,
      [methodName]: method,
    };
    if (LogSynonyms[methodName]) {
      for (const synonym of LogSynonyms[methodName]) {
        outConsole[synonym] = method;
      }
    }
    const highlight = highlightColor
      ? logVarHighlighter(highlightColor)
      : highlightLogVars;
    outConsole[methodName].hl = (...args) =>
      outConsole[methodName](highlight(...args));
    return outConsole;
  }, {});

export const logger = makeLogger();

function deny(reason) {
  logger.error(reason instanceof Error ? reason.stack : reason);
  process.exit(1);
}

export function sh(cmd, args, opts = {}) {
  const { silent, ...spawnOpts } = opts;
  if (!Array.isArray(args)) {
    throw new Error(
      `Internal error: called sh("${cmd}"... with ${JSON.stringify(
        args
      )} instead of an args array`
    );
  }
  if (!silent) logger.log(`${cmd} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(cmd, args, {
        stdio: ["pipe", silent ? "ignore" : "inherit", "inherit"],
        encoding: "utf-8",
        ...spawnOpts,
      });
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`"${cmd} ${args.join(" ")}" exited with errors.`))
      );
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
  const workspaceNames = await readdir(resolve(repoRoot, category));
  const workspaces = await Promise.all(
    workspaceNames.map(async (name) => {
      const workspaceDir = resolve(repoRoot, category, name);
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
        shortName: basename(workspaceDir).replace("uix-", ""),
        pkg,
      };
    })
  );
  return workspaces.filter((result) => result !== IS_NOT_WORKSPACE);
}

export const getSdks = () => getWorkspaces("packages");
export const getExamples = () => getWorkspaces("examples");

const capCase = (str) =>
  str.replaceAll(/-([a-z])/gi, (_, letter) => letter.toUpperCase());

const NO_VALUE = Symbol.for("NO_VALUE");
const startsWithNo = /^no[A-Z]/;
export function parseArgs(args) {
  const flags = {};
  const positional = [];
  for (const arg of args) {
    if (arg.startsWith("--")) {
      let prop;
      let value = NO_VALUE;
      const assignment = arg.slice(2).split("=");
      if (assignment.length > 2) {
        throw new Error(
          `Unrecognized argument: "${arg}". Too many equals signs.`
        );
      }
      const isAssignment = assignment.length === 2;
      prop = assignment[0];
      if (isAssignment) {
        value = assignment[1];
      }
      const dotPath = prop.split(".").map(capCase);
      if (dotPath.length > 2) {
        throw new Error(`Unrecognized argument: "${arg}". Too many dots.`);
      }
      let flagTarget = flags;
      const isDotPath = dotPath.length === 2;
      let [flag, subFlag] = dotPath;
      if (isDotPath) {
        if (typeof flags[flag] !== "object") {
          flags[flag] = {};
        }
        flagTarget = flags[flag];
        flag = subFlag;
      }
      if (value === NO_VALUE) {
        value = true;
        if (startsWithNo.test(flag)) {
          flagTarget[flag.charAt(2).toLowerCase() + flag.slice(3)] = false;
        }
      } else if (value === "undefined") {
        value = undefined;
      } else {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // probably a barestring
        }
      }
      flagTarget[flag] = value;
    } else {
      positional.push(arg);
    }
  }
  return { ...flags, _: positional };
}

export function argIn(allowedArgs, argv) {
  const argsList = allowedArgs.map((opt) => `\n - ${opt}`).join("");
  const thisCmd = basename(process.argv[1]);
  const numPassed = argv._.length;
  const [arg] = argv._;
  if (numPassed === 1 && allowedArgs.includes(arg)) {
    return [arg, argv];
  }
  const helpText = highlightLogVars`Must provide exactly one argument to ${thisCmd}, one of:${argsList}`;
  switch (numPassed) {
    case 0:
      return `No positional args found. ${helpText}`;
    case 1:
      return `Unrecognized argument "${arg}". ${helpText}`;
    default:
      return `Too many arguments: "${argv._}". ${helpText}`;
  }
}

export async function runWithArg(fn, validator = () => {}) {
  let workingDir = process.cwd();
  try {
    const gitRoot = await shResult("git", ["rev-parse", "--show-toplevel"]);
    if (gitRoot !== workingDir) {
      process.chdir(gitRoot);
      workingDir = gitRoot;
    }
  } catch (e) {
    deny(
      `Need to be in the git repo for @adobe/uix-sdk-monorepo. ${e.message}`
    );
  }
  let argv = parseArgs(process.argv.slice(2));
  const validateArgs = Array.isArray(validator)
    ? () => argIn(validator, argv)
    : validator;
  try {
    const validation = await validateArgs(argv);
    if (typeof validation === "string") {
      return deny(validation);
    } else if (validation !== undefined) {
      argv = validation;
    }
    if (Array.isArray(argv)) {
      await fn(...argv);
    } else {
      await fn(argv);
    }
  } catch (e) {
    deny(e);
  }
}
