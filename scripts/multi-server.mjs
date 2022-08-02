import { promisify } from "util";
import { Writable } from "stream";
import { execFile } from "child_process";
import { createServer } from "http";
import concurrently from "concurrently";
import chalk from "chalk";
import figures from "figures";
import { getExamples, getSdks, logger, runWithArg } from "./script-runner.mjs";

const basePorts = {
  host: process.env.PORT_HOSTS || 4001,
  guest: process.env.PORT_GUESTS || 5001,
};

const ports = {
  registry: process.env.PORT_REGISTRY || 3000,
  dev: basePorts,
  demo: {
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

const execFileP = promisify(execFile);

function cannotResolveFrom(cwd, deps) {
  const resolveCalls = deps.map((dep) => `require.resolve("${dep}");`).join("");
  return execFileP(process.argv0, ["-p", resolveCalls], {
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
  // let's do an incremental compile

  const isDev = mode === "dev";
  const allExamples = await getExamples();
  let examples = await checkSdkResolution(allExamples);

  if (examples.broken.length > 0) {
    console.warn(
      "%d examples would not build. Retrying SDK build one time",
      examples.broken.length
    );
    await execFileP("npm", ["run", "build"]);
    await concurrently(
      examples.broken.map(([, , example]) =>
        createRunSpec(example, `npm install && npm run example:build`, mode)
      )
    ).result;
    examples = await checkSdkResolution(allExamples);
    if (examples.broken.length > 0) {
      for (const [info, stack] of examples.broken) {
        console.error(info, stack);
      }
    }
  }
  if (examples.working.length < 1) {
    console.error(chalk.red("No examples ran."));
    return 1;
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
      })),
      getRunnerOptions({
        outputStream: new Writable({ write() {} }),
      })
    );
    const DROP_LINES_RE = /(Starting compilation|change detected)/i;
    watchSdksToo.commands.forEach((command) => {
      let preamble = false;
      command.stdout.subscribe({
        next(value) {
          const line = value.toString().trim();
          if (!preamble && line.includes("Found 0 errors.")) {
            preamble = true;
          } else if (line && !DROP_LINES_RE.test(line)) {
            logger.log(`[${command.name}] ${line}`);
          }
        },
      });
    });
  }

  let guestRunner = concurrently(
    guests,
    getRunnerOptions({
      killOthers: undefined,
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
    console.log("closing servers...");
    closeAll();
    console.log("closing registry...");
    registry.close();
    console.log("registry closed");
    process.exit(0);
  });

  const closeAll = () =>
    allRunners.forEach(({ commands }) =>
      commands.forEach((command) => command.kill())
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
    closeAll();
    if (Array.isArray(e)) {
      throwMultiError(e);
    } else {
      throw e;
    }
  }
}

runWithArg(serveExamples, ["dev", "demo"]);
