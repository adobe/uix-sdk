import { promisify } from "util";
import { execFile } from "child_process";
import { createServer } from "http";
import concurrently from "concurrently";
import chalk from "chalk";
import figures from "figures";
import { getWorkspaces, runWithArg } from "./script-runner.mjs";

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

function getRunnerOptions() {
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
  const allExamples = await getWorkspaces("examples");
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

  let runSpecs = [...guests, ...hosts];

  if (isDev) {
    const watchSdksToo = (await getWorkspaces("packages")).map(
      (sdkPackage) => ({
        cwd: sdkPackage.cwd,
        id: sdkPackage.pkg.name,
        name: sdkPackage.pkg.name,
        command: "npm run -s watch",
      })
    );
    runSpecs = runSpecs.concat(watchSdksToo);
  }

  const { result, commands } = concurrently(runSpecs, getRunnerOptions());

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

  process.on("SIGINT", () => {
    console.log("closing servers...");
    commands.forEach((command) => command.kill());
    console.log("closing registry...");
    registry.close();
    console.log("registry closed");
    process.exit(0);
  });

  return result;
}

runWithArg(serveExamples, ["dev", "mode"]);

