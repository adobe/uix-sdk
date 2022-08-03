import { inspect } from "util";
import { Writable } from "stream";
import { createServer } from "http";
import concurrently from "concurrently";
import chalk from "chalk";
import figures from "figures";
import {
  getExamples,
  getSdks,
  logger,
  runWithArg,
  shResult,
} from "./script-runner.mjs";
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

function getRunnerOptions(overrides = {}) {
  return {
    prefix: "name",
    killOthers: ["failure"],
    prefixLength: 10,
    prefixColors: [
      "cyan",
      "green",
      "yellow",
      "blue",
      "magenta",
      "white",
      "red",
    ],
    ...overrides,
  };
}

function cannotResolveFrom(cwd, deps) {
  const resolveCalls = deps.map((dep) => `require.resolve("${dep}");`).join("");
  return shResult(process.argv0, ["-p", resolveCalls], {
    cwd,
  }).then(
    () => false,
    (e) => e
  );
}

async function checkSdkResolution(examples) {
  const result = {
    working: [],
    broken: [],
  };

  for (const example of examples) {
    const resolveError = await cannotResolveFrom(
      example.cwd,
      Object.keys(example.pkg.dependencies)
    );
    if (resolveError) {
      result.broken.push([
        chalk.bold.red(
          `Cannot resolve ${chalk.bold.white(
            "@adobe/uix-sdk"
          )} from example project ${chalk.bold.white(
            example.cwd
          )}) Will not run this example.`
        ),
        resolveError.stack,
        example,
      ]);
    } else {
      result.working.push(example);
    }
  }
  return result;
}

function createRunSpec(example, command, mode) {
  const type = example.pkg.name.startsWith("guest") ? "guest" : "host";
  const port = ports[mode][type]++;
  const env = {
    MULTI_SERVER_PORT: port,
    REGISTRY_URL: registryUrl,
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
    url: `http://${host}:${port}/`,
  };
}

async function serveExamples(mode) {
  // initial compile
  await shResult("npm", ["run", "clean"]);
  await shResult("npm", ["run", `build:${mode}`]);

  const isDev = mode === "development";
  const allExamples = await getExamples();
  let examples = await checkSdkResolution(allExamples);

  if (examples.broken.length > 0) {
    for (const [info, stack] of examples.broken) {
      logger.error(info, stack);
    }
  }
  if (examples.working.length < 1) {
    logger.error("No examples ran.");
    process.exit(1);
  }

  const [guests, hosts] = examples.working.reduce(
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

  const registry = createServer((req, res) => {
    const url = new URL(req.url, registryUrl);
    let qualifyingGuests = guests;
    const tags = url.searchParams.get("tags");
    if (tags) {
      const tagFilter = new Set(tags.split(","));
      qualifyingGuests = guests.filter(({ tags }) =>
        tags.some((tag) => tagFilter.has(tag))
      );
    }

    res.writeHead(200, {
      "Content-Type": "text/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(JSON.stringify(qualifyingGuests, null, 2));
    res.end();
  });

  await new Promise((resolve, reject) => {
    try {
      registry.on("error", reject);
      registry.listen(ports.registry, host, resolve);
    } catch (e) {
      reject(e);
    }
  });
  console.log("launched registry at %s", registryUrl);

  let watchSdksToo = {
    result: Promise.resolve(),
    commands: [],
  };

  if (isDev) {
    watchSdksToo = concurrently(
      (await getSdks()).map((sdkPackage) => ({
        cwd: sdkPackage.cwd,
        id: sdkPackage.pkg.name,
        name: sdkPackage.pkg.name.replace("@adobe/uix-", ""),
        command: "npm run -s watch",
        env: {
          UIX_SDK_BUILDMODE: mode,
          NODE_ENV: mode,
        },
      })),
      getRunnerOptions({
        outputStream: new Writable({ write() {} }),
      })
    );
    const DROP_LINES_RE = /(Starting compilation|change detected)/i;
    watchSdksToo.commands.forEach((command) => {
      let preambles = 0;
      command.stdout.subscribe({
        next(value) {
          const line = value.toString().trim();
          if (preambles < 2 && line.includes("Found 0 errors.")) {
            preambles++;
          } else if (line && !DROP_LINES_RE.test(line)) {
            logger.log(`[${command.name}] ${line}`);
          }
        },
      });
      command.stderr.subscribe({
        next(value) {
          logger.error(`[${command.name}] ${value}`);
        },
      });
    });
  }

  let guestRunner = concurrently(
    guests,
    getRunnerOptions({
      killOthers: ["failure"],
      prefix: "guest {name}",
    })
  );
  let hostRunner = concurrently(
    hosts,
    getRunnerOptions({
      killOthers: ["failure"],
      prefix: "host {name}",
    })
  );

  const { hamburger, pointer } = figures;

  const listExamples = (list) =>
    list
      .map(
        ({ url, id }) => `
    ${pointer} ${url}  ${id}`
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

  const allRunners = [watchSdksToo, hostRunner, guestRunner];

  process.on("SIGINT", () => {
    console.log("closing registry...");
    registry.close(() => {
      console.log("registry closed");
      console.log("closing servers...");
      closeAll()
        .then(() => {
          process.exit(0);
        })
        .catch((e) => {
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
