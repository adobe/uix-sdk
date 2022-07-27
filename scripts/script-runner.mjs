import { basename, resolve } from "path";
import { readdir, readFile } from "fs/promises";
import chalk from "chalk";

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

export async function runWithArg(fn, allowedArgs) {
  const prefix = chalk.bold.redBright("Error");
  const placeholder = chalk.yellow("%s");

  const errorMessage = `${prefix}: Command line argument to ${placeholder} must be one of: ${placeholder}
but it was ${placeholder}`;

  try {
    const arg = process.argv[2] || "not provided";
    if (!arg || !allowedArgs.includes(arg)) {
      console.error(
        errorMessage,
        basename(process.argv[1]),
        allowedArgs.map((opt) => `\n - ${opt}`).join(""),
        arg
      );
      process.exit(1);
    }
    await fn(arg);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
