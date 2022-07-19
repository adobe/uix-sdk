import { createServer } from "http";
import concurrently from "concurrently";
import chalk from "chalk";
import figures from "figures";
import {
  getExamples,
  getRunnerOptions,
  ports,
  host,
  registryUrl,
} from "./examples-utils.js";

async function serveExamples(isDev) {
  const examples = (await getExamples()).map((example) => {
    const basePort = ports[example.type]++;
    const port = isDev ? basePort + 80 : basePort;
    return {
      ...example,
      port,
      url: `http://${host}:${port}/`,
    };
  });

  const [guests, hosts] = examples.reduce(
    ([guests, hosts], example) => {
      return example.type === "guest"
        ? [[...guests, example], hosts]
        : [guests, [...hosts, example]];
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

  const command = isDev ? "npm start -s" : "npm run -s preview";

  const runSpecs = examples.map(({ cwd, name, port }) => ({
    name,
    cwd,
    env: {
      VITE_PORT: port,
      REGISTRY_URL: registryUrl,
    },
    command,
  }));

  if (isDev) {
    runSpecs.unshift({
      name: "@adobe/uix-sdk",
      command: "npm run -s compile:watch",
    });
  }

  const { result, commands } = concurrently(runSpecs, getRunnerOptions(isDev));

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

const isDev = process.argv[process.argv.length - 1] === "--dev";
serveExamples(isDev).catch((e) => {
  console.error(e);
  process.exit(1);
});
