import concurrently from "concurrently";
import { getExamples, getRunnerOptions } from "./examples-utils.js";

async function runOnExamples(command) {
  const exampleDirs = await getExamples();
  const jobs = concurrently(
    exampleDirs.map(
      (example) => ({
        ...example,
        command,
      }),
      getRunnerOptions()
    )
  );
  await jobs.result;
}

const cmd = process.argv.slice(2).join(" ");
console.log("running on all examples:", cmd);
runOnExamples(cmd).catch((e) => {
  console.error(e);
  process.exit(1);
});
