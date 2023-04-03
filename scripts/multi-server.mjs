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

import { inspect } from "util";
import concurrently from "concurrently";
import chalk from "chalk";
import figures from "figures";
import {
  getExamples,
  getSdks,
  runWithArg,
  shResult,
} from "./script-runner.mjs";
import { startRegistry } from "./mock-registry.mjs";
import { SIGINT, SIGTERM } from "constants";

const basePorts = {
  host: process.env.PORT_HOSTS || 4001,
  guest: process.env.PORT_GUESTS || 5001,
};

const ports = {
  registry: process.env.PORT_REGISTRY || 3000,
  development: basePorts,
  production: {
    host: basePorts.host + 80,
    guest: basePorts.guest + 80,
  },
};

const host = "localhost";

const registryUrl = `http://${host}:${ports.registry}/`;

async function runParallel(runSpecs) {
  const concurrentlyOptions = {
    killOthers: ["success", "failure"],
  };
  return concurrently(runSpecs, concurrentlyOptions);
}

/**
 * Create the options object that `concurrently` uses to launch a subprocess
 *
 * @param {Example} example - Example to launch
 * @param {string} command - Command to run in the example directory
 * @param {string} mode - "development" or "production"
 * @return {import("concurrently").Command}
 */
function createRunSpec(example, command, mode) {
  const type = example.pkg.name.startsWith("guest") ? "guest" : "host";
  const port = ports[mode][type]++;
  const env = {
    FORCE_COLOR: 2,
    MULTI_SERVER_PORT: port, // pass the assigned port down
    REGISTRY_URL: registryUrl, // examples will call the registry URL
  };
  const name = example.pkg.description || example.pkg.name;
  return {
    cwd: example.cwd,
    id: name,
    name,
    type,
    command,
    env,
    port,
    keywords: example.pkg.keywords, // for simple filtering in the fake registry
    url: `http://${host}:${port}/`,
  };
}

function showExampleLinks(hosts, guests) {
  const { hamburger, pointer } = figures;

  const listExamples = (list) =>
    list
      .map(
        ({ url, name }) => `
    ${pointer} ${url}  ${name}`
      )
      .join("");

  const report = `
${chalk.bold.whiteBright(hamburger + " Example servers running!")}

  ${chalk.bold.yellowBright.underline("Hosts:")}${chalk.yellow(
    listExamples(hosts)
  )}

  ${chalk.bold.greenBright.underline("Guests:")}${chalk.green(
    listExamples(guests)
  )}
`;
  console.log(report);
}

async function serveExamples(mode) {
  const isDev = mode === "development";
  const examples = await getExamples();

  const [guests, hosts] = examples.reduce(
    ([guests, hosts], example) => {
      const runSpec = createRunSpec(
        example,
        `npm run -s example:${mode}`,
        mode
      );
      return runSpec.type === "guest"
        ? [[...guests, runSpec], hosts]
        : [guests, [...hosts, runSpec]];
    },
    [[], []]
  );

  const registry = await startRegistry(registryUrl, guests);

  const allRunners = [];

  if (isDev) {
    await shResult("npm", [
      "run",
      "-s",
      "build:development",
      "--",
      "--esm",
      "--no-declarations",
    ]);
    allRunners.push(
      await runParallel(
        (
          await getSdks()
        ).map((sdkPackage) => ({
          cwd: sdkPackage.cwd,
          name: sdkPackage.pkg.name.split("-").pop(),
          command: "npm run -s watch -- --format cjs,esm,iife",
          type: "sdk",
          env: {
            FORCE_COLOR: 2,
            UIX_SDK_BUILDMODE: mode,
            NODE_ENV: mode,
          },
        })),
        {
          awaitAll: true,
          ignore: [
            /(?:starting (?:.+?)?compilation|exited with code (?:SIGINT|0)|exited with code 0)/i,
            /^\[\.+\]\s*$/,
          ],
        }
      )
    );
  }

  let [guestRunners, hostRunners] = await Promise.all([
    runParallel(guests),
    runParallel(hosts),
  ]);

  allRunners.push(guestRunners, hostRunners);

  showExampleLinks(hosts, guests);

  process.once("SIGINT", () => {
    console.log("Stopping all servers..");
    registry.close(() => {
      closeAll().catch((e) => {
        console.error(e);
        process.exit(1);
      });
    });
  });

  const closeAll = () =>
    Promise.all(
      allRunners.map(({ commands }) =>
        Promise.all(
          commands.map(
            (command) =>
              new Promise((resolve, reject) => {
                if (command.exited) {
                  resolve();
                } else {
                  const tryTerm = setTimeout(() => {
                    command.kill(SIGTERM);
                  }, 1000);
                  const giveUp = setTimeout(
                    () =>
                      reject(
                        new Error(
                          `Could not kill job for ${command.name}: ${inspect(
                            command
                          )}`
                        )
                      ),
                    6000
                  );
                  command.close.subscribe({
                    next() {
                      clearTimeout(tryTerm);
                      clearTimeout(giveUp);
                      resolve();
                    },
                  });
                  command.kill(SIGINT);
                }
              })
          )
        )
      )
    );

  function throwMultiError(closeEvents) {
    throw new Error(
      `Multiserver crashed!
${closeEvents
  .map(
    ({ command, exitCode, killed }) =>
      ` - [${command.name}] exited ${exitCode}${killed ? " (killed)" : ""}`
  )
  .join("\n")}`
    );
  }

  try {
    await Promise.all(allRunners.map((runner) => runner.result));
    await closeAll();
  } catch (e) {
    try {
      await closeAll();
    } finally {
      if (Array.isArray(e)) {
        throwMultiError(e);
      } else {
        throw e;
      }
    }
  }
}

runWithArg(serveExamples, ["development", "production"]);
