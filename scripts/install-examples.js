import concurrently from "concurrently";
import { getExamples, getRunnerOptions } from "./examples-utils";

function exampleDir(...args) {
  return resolve(process.cwd(), "examples", ...args);
}

async function installExamples() {
  const exampleDirs = await getExamples();
  const jobs = concurrently(
    exampleDirs.map((dir) => ({
      name: `examples/${dir}/$ npm install`,
      cwd: exampleDir(dir),
      command: "npm install -s",
    }))
  );
  await jobs.result;
}

installExamples().catch((e) => {
  console.error(e);
  process.exit(1);
});
