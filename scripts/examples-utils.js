import { readdir, readFile } from "fs/promises";
import { resolve } from "path";

export function exampleDir(...args) {
  return resolve(process.cwd(), "examples", ...args);
}

export const ports = {
  registry: process.env.PORT_REGISTRY || 3000,
  host: process.env.PORT_HOSTS || 4001,
  guest: process.env.PORT_GUESTS || 5001,
};

export const host = "localhost";

export const registryUrl = `http://${host}:${ports.registry}/`;

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
