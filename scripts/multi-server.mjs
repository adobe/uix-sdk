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
import { Writable } from "stream";
import concurrently from "concurrently";
import chalk from "chalk";
import figures from "figures";
import { getExamples, getSdks, logger, runWithArg } from "./script-runner.mjs";
import { startRegistry } from "./mock-registry.mjs";
import { SIGINT, SIGTERM } from "constants";
import {
  combineLatest,
  filter,
  debounceTime,
  merge,
  share,
  firstValueFrom,
  map,
  timer,
  skipUntil,
  of,
  distinctUntilChanged,
} from "rxjs";

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

const typeColors = {
  sdk: chalk.ansi256(1),
  guest: chalk.ansi256(4),
  host: chalk.ansi256(6),
};

const blackHole = new Writable({ write() {} });

const runParallelDefaults = {
  ignore: [],
  overrides: {},
  awaitAll: false,
};

const formatLine = (prefix, line) =>
  prefix +
  line
    .toString("utf8")
    .replace(/^\s*\n*/g, "") // remove newlines
    .replace(/\s*\d\d?:\d\d:\d\d [PA]M?\s*/i, ""); // remove timestamps
const lineProcessors = (prefix, ignore) => [
  map((buf) => buf.toString("utf-8")),
  filter((line) => line.trim() && ignore.every((re) => !re.test(line))),
  map((line) => formatLine(prefix, line)),
  distinctUntilChanged(),
];
async function runParallel(runSpecs, opts = {}) {
  const { ignore, overrides, awaitAll } = { ...runParallelDefaults, ...opts };
  const concurrentlyOptions = {
    outputStream: blackHole,
    killOthers: ["success", "failure"],
    ...overrides,
  };
  const noisyLoggers = [];
  const connectStdouts = [];
  const connectStderrs = [];
  const jobs = concurrently(runSpecs, concurrentlyOptions);
  for (let i = 0; i < runSpecs.length; i++) {
    const spec = runSpecs[i];
    const cmd = jobs.commands[i];
    const outColor = typeColors[spec.type];
    const outPrefix = outColor(`[${chalk.dim(spec.type)} ${spec.name}] `);
    const errPrefix = outColor.bold(`[${spec.type} ${spec.name}] `);
    const stdout = cmd.stdout.pipe(share());
    const stderr = cmd.stderr.pipe(share());
    noisyLoggers.push(merge(stdout, stderr));
    connectStdouts.push((start) =>
      stdout.pipe(skipUntil(start), ...lineProcessors(outPrefix, ignore))
    );
    connectStderrs.push((start) =>
      stderr.pipe(skipUntil(start), ...lineProcessors(errPrefix, ignore))
    );
  }
  if (process.env.DEBUG && process.env.DEBUG.includes("multi-server")) {
    const goNow = of(true).pipe(share());
    connectStdouts.map((toPipe) =>
      toPipe(goNow).subscribe((line) => process.stdout.write(line))
    );
    connectStderrs.map((toPipe) =>
      toPipe(goNow).subscribe((line) => process.stderr.write(line))
    );
    return {
      ...jobs,
      startLog() {},
    };
  }
  const operator = awaitAll ? combineLatest : merge;
  const noiseDone = merge(
    operator(noisyLoggers).pipe(debounceTime(2000)),
    timer(5000)
  );
  await firstValueFrom(noiseDone);
  return {
    ...jobs,
    startLog() {
      connectStdouts.map((toPipe) =>
        toPipe(noiseDone).subscribe((line) => process.stdout.write(line))
      );
      connectStderrs.map((toPipe) =>
        toPipe(noiseDone).subscribe((line) => process.stderr.write(line))
      );
    },
  };
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

  const runnerOpts = {
    ignore: isDev
      ? [
          /Accepting connections/,
          /Gracefully shutting down/,
          /http:\/\/(127|0|localhost)/,
          // /(Local|Network):/m,
          /use .+ to expose/m,
          /(Built|ready) in .+ms/,
          /Server running at/,
          /Building.../,
          /Bundling.../,
          /Packaging & Optimizing.../,
        ]
      : [],
  };

  let [guestRunners, hostRunners] = await Promise.all([
    runParallel(guests, runnerOpts),
    runParallel(hosts, runnerOpts),
  ]);

  allRunners.push(guestRunners, hostRunners);

  showExampleLinks(hosts, guests);

  allRunners.forEach((runner) => runner.startLog());

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
