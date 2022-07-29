import { basename, resolve } from "path";
import { readdir, readFile } from "fs/promises";
import chalk from "chalk";
import figures from "figures";

export async function getWorkspaces(category) {
  const workspaceNames = await readdir(resolve(process.cwd(), category));
  return Promise.all(
    workspaceNames.map(async (name) => {
      const workspaceDir = resolve(process.cwd(), category, name);
      const pkg = JSON.parse(
        await readFile(resolve(workspaceDir, "package.json"))
      );
      return {
        cwd: workspaceDir,
        pkg,
      };
    })
  );
}

const errorPrefix = chalk.bold.redBright("Error");
const placeholder = chalk.yellow("%s");
const errorMessage = `${errorPrefix}: Command line argument to ${placeholder} must be one of: ${placeholder}
but it was ${placeholder}`;

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

export async function runWithArg(fn, allowedArgs) {
  try {
    const arg = process.argv[2] || "not provided";
    if (!arg || !allowedArgs.includes(arg)) {
      logger.error(
        errorMessage,
        basename(process.argv[1]),
        allowedArgs.map((opt) => `\n - ${opt}`).join(""),
        arg
      );
      process.exit(1);
    }
    await fn(arg);
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
}
