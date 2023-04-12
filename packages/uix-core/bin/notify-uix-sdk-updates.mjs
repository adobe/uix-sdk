import path from "path";
import { readFile } from "fs/promises";
import updateNotifier from "update-notifier";

const [name, version] = process.argv.slice(2);

async function main() {
  updateNotifier({
    shouldNotifyInNpmScript: true,
    updateCheckInterval: 30,
    pkg: {
      name,
      version,
    },
  }).notify({
    message:
      "The {packageName} is out of date. Update it to {latestVersion} asap!!",
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
