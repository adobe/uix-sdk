import { createServer } from "http";
import concurrently from "concurrently";
import chalk from "chalk";
import figures from "figures";
import { getExamples, getRunnerOptions } from "./examples-utils.js";

async function serveExamples() {
  const ports = {
    registry: process.env.PORT_REGISTRY || 3000,
    host: process.env.PORT_HOSTS || 4001,
    guest: process.env.PORT_GUESTS || 5001,
  };

  const host = "localhost";

  const registryUrl = `http://${host}:${ports.registry}/`;

  const examples = (await getExamples()).map((example) => {
    const port = ports[example.type]++;
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

  const runSpecs = examples.map(({ cwd, name, port }) => ({
    name,
    cwd,
    env: {
      VITE_PORT: port,
      REGISTRY_URL: registryUrl,
    },
    command: "npm start -s",
  }));

  const { result, commands } = concurrently(
    [
      {
        name: "SDK",
        command: "npm run -s compile:watch",
      },
      ...runSpecs,
    ],
    getRunnerOptions()
  );

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
  )}`;

  console.log(report);

  process.on("SIGINT", () => {
    console.log("closing dev servers...");
    commands.forEach((command) => command.kill());
    console.log("closing registry...");
    registry.close();
    console.log("registry closed");
    process.exit(0);
  });

  return result;
}

serveExamples().catch((e) => {
  console.error(e);
  process.exit(1);
});
