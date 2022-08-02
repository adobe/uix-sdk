import { spawnSync, execFileSync } from "child_process";
import { resolve, basename } from "path";
import { readdir, readFile } from "fs/promises";
import chalk from "chalk";
import figures from "figures";
import { highlight } from "cli-highlight";
import { getWorkspaces, logger, runWithArg } from "./script-runner.mjs";

const modes = ["", "development", "production", "report"];
const outputDir = "dist";

async function bundle(arguedMode) {
  const reportMode = arguedMode === "report";
  let mode = arguedMode === "development" ? arguedMode : "production";
  const log = mode === "production" ? logger.log.hl : () => {};
  const sdks = await getWorkspaces("packages");
  const completed = [];
  log`Building ${sdks.length} packages in ${arguedMode || mode} mode:`;
  for (const { cwd, pkg } of sdks) {
    let spawnArgs = ["run", "-s", "-w", pkg.name, "build"];
    if (reportMode) process.stderr.write(`${basename(cwd)}...`);
    if (
      spawnSync("npm", spawnArgs, {
        stdio: ["inherit", reportMode ? "pipe" : "inherit", "inherit"],
        env: {
          ...process.env,
          UIX_SDK_BUILDMODE: arguedMode,
          NODE_ENV: mode,
        },
      }).status !== 0
    ) {
      logger.error.hl`Failed to build ${pkg.name}. ${
        completed.length
      } previous packages succeeded: ${completed.join(",")}`;
      break;
    } else {
      completed.push(pkg.name);
    }
  }
  if (completed.length === sdks.length) {
    logger.done.hl`Built ${completed.length} packages.`;
  }
  if (arguedMode === "report") {
    const expectedFilename = {
      start: "metafile-",
      end: ".json",
    };
    const isMetaFile = (filename) =>
      filename.startsWith(expectedFilename.start) &&
      filename.endsWith(expectedFilename.end);
    const importStyle = (name, type, outputFilename) => {
      switch (type) {
        case "iife": {
          return highlight(` <script src="/${outputFilename}"></script>`, {
            language: "html",
          });
        }
        case "esm": {
          return highlight(` import * as SDK from '${name}'`, {
            language: "javascript",
          });
        }
        default: {
          return highlight(` require('${name}')`, { language: "javascript" });
        }
      }
    };
    const reports = await Promise.all(
      sdks
        .map(async ({ cwd, pkg }) => {
          try {
            const outputFiles = await readdir(resolve(cwd, outputDir));
            const metafiles = outputFiles.filter(isMetaFile);
            const buildMetadata = await Promise.all(
              metafiles.map(async (filename) => ({
                type: filename.slice(
                  expectedFilename.start.length,
                  -expectedFilename.end.length
                ),
                assets: JSON.parse(
                  await readFile(resolve(cwd, outputDir, filename), "utf-8")
                ).outputs,
              }))
            );
            return buildMetadata
              .map(({ type, assets }) =>
                Object.entries(assets).map(
                  ([name, { bytes }]) =>
                    ` ${importStyle(pkg.name, type, name)} ${
                      figures.arrowLeft
                    } ${chalk.greenBright(`${(bytes / 1024).toFixed(2)}kb`)}\n`
                )
              )
              .join("\n");
          } catch (e) {
            return ` (no build output for ${pkg.name}: ${e.message})`;
          }
        })
        .flat(2)
    );

    logger.log(`
  Bundle size reports
  ===================
    `);
    reports.forEach((bluh) => console.log(bluh));
    logger.log(`
  These figures represent the total kilobyte cost of each package to an app
  which includes it. It factors in their ${"direct dependencies"} on ${"each other"}.

  In a production app, they will deduplicate mutual dependencies. If the app
  imports ${"adobe/uix-host-react"}, and ${"@adobe/uix-host"}, too, it won't inline
  another copy of @adobe/uix-host; the total bundle cost will still be that of
  @adobe/uix-host-react alone.
`);
    execFileSync("npm", ["run", "any", "clean"]);
  }
}

runWithArg(bundle, modes);
