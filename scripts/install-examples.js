import { readdir } from "fs/promises";
import { resolve } from "path";
import concurrently from "concurrently";

function exampleDir(...args) {
  return resolve(process.cwd(), "examples", ...args);
}

async function installExamples() {
  const exampleDirs = await readdir(exampleDir());
  const { result, comments } = concurrently(
    exampleDirs.map((dir) => ({
      name: `examples/${dir}/$ npm install`,
      cwd: exampleDir(dir),
      command: "npm install -s",
    })),
    {
      killOthers: ["failure"],
      hide: true,
      prefixLength: exampleDirs.reduce((longest, name) =>
        name.length > longest.length ? name : longest
      ).length,
      prefixColors: [
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
      ],
    }
  );
}

installExamples().catch((e) => {
  console.error(e);
  process.exit(1);
});
