import { readdir, readFile } from "fs/promises";
import { resolve } from "path";

export function exampleDir(...args) {
  return resolve(process.cwd(), "examples", ...args);
}

export async function getExamples() {
  const exampleNames = await readdir(exampleDir());
  return Promise.all(
    exampleNames.map(async (name) => {
      const pkg = JSON.parse(await readFile(exampleDir(name, "package.json")));
      const id = pkg.description || name;
      return {
        cwd: exampleDir(name),
        name: id,
        id,
        type: name.endsWith("-guest") ? "guest" : "host",
        tags: pkg.keywords || [],
      };
    })
  );
}

export function getRunnerOptions() {
  return {
    prefix: "name",
    killOthers: ["failure"],
    prefixLength: 10,
    prefixColors: [
      "red",
      "green",
      "yellow",
      "blue",
      "magenta",
      "cyan",
      "white",
    ],
  };
}
