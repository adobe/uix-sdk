import concurrently from "concurrently";
import { getExamples, getRunnerOptions } from "./examples-utils.js";

function exampleDir(...args) {
  return resolve(process.cwd(), "examples", ...args);
}

async function installExamples() {
  const exampleDirs = await getExamples();
  const jobs = concurrently(
    exampleDirs.map(
      (example) => ({
        ...example,
        command: "npm install -s",
      }),
      getRunnerOptions()
    )
  );
  await jobs.result;
}

installExamples().catch((e) => {
  console.error(e);
  process.exit(1);
});
