/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { spawnSync } from "child_process";
import { resolve, basename } from "path";
import { readdir, readFile } from "fs/promises";
import chalk from "chalk";
import figures from "figures";
import { highlight } from "cli-highlight";
import { getWorkspaces, logger, runWithArg, sh } from "./script-runner.mjs";

const modes = ["development", "production", "report"];
const outputDir = "dist";

async function bundle(mode, argv) {
  if (argv.declarations !== false && mode !== "report" && !argv.esm) {
    await emitDeclarations(mode, argv);
  }
  await emitBundle(mode, argv);
}

async function emitDeclarations() {
  await sh("npm", ["run", "-s", "declarations:build"]);
}

async function emitBundle(arguedMode, { silent, esm }) {
  const reportMode = arguedMode === "report";
  const mode = arguedMode === "development" ? arguedMode : "production";
  const sdks = await getWorkspaces("packages");
  const completed = [];
  let failed;
  if (esm) {
    logger.warn
      .hl`${"esm"} option passed, will build ES Modules as well. DO NOT publish the SDKs before rebuilding.`;
  }
  if (!silent)
    logger.log.hl`Building ${sdks.length} packages in ${
      arguedMode || mode
    } mode:`;
  for (const { cwd, pkg } of sdks) {
    const buildScriptName = esm ? "build:esm" : "build";
    let spawnArgs = ["run", "-w", pkg.name, buildScriptName];
    if (reportMode) process.stderr.write(`${basename(cwd)}...`);
    if (
      spawnSync("npm", spawnArgs, {
        stdio: silent
          ? "ignore"
          : ["inherit", reportMode ? "pipe" : "inherit", "inherit"],
        env: {
          ...process.env,
          UIX_SDK_BUILDMODE: arguedMode,
          NODE_ENV: mode,
        },
      }).status !== 0
    ) {
      failed = pkg.name;
      break;
    } else {
      completed.push(pkg.name);
    }
  }
  if (failed) {
    throw new Error(
      `Failed to build ${failed}. ${
        completed.length
      } previous packages succeeded: ${completed.join(",")}`
    );
  } else {
    if (!silent) logger.done.hl`Built ${completed.length} packages.`;
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
  }
}

runWithArg(bundle, modes);
