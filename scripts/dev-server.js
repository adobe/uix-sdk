import { readdir, readFile } from "fs/promises";
import { createServer } from "http";
import { resolve } from "path";
import concurrently from "concurrently";

function exampleDir(...args) {
  return resolve(process.cwd(), "examples", ...args);
}

async function serveExamples() {
  const ports = {
    registry: process.env.PORT_REGISTRY || 3000,
    hostRange: process.env.PORT_HOSTS || 4001,
    guestRange: process.env.PORT_GUESTS || 5001,
  };

  const host = "localhost";

  const registryUrl = `http://${host}:${ports.registry}/`;

  let guests = [];
  const exampleNames = await readdir(exampleDir());
  const allExamples = await Promise.all(
    exampleNames.map(async (name, i) => {
      const pkg = JSON.parse(await readFile(exampleDir(name, "package.json")));
      const spec = {
        dir: name,
        id: pkg.description || name,
        port: ports.hostRange + i,
      };
      if (name.endsWith("-guest")) {
        spec.port = ports.guestRange + i;
        spec.tags = pkg.keywords || [];
        guests.push(spec);
      }
      spec.url = `http://${host}:${spec.port}/`;
      return spec;
    })
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

  const runSpecs = allExamples.map(({ id, dir, port }) => ({
    name: `examples/${dir}`,
    cwd: exampleDir(dir),
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
    {
      prefix: "name",
      killOthers: ["failure"],
      prefixLength: exampleNames.reduce((longest, name) =>
        name.length > longest.length ? name : longest
      ).length,
      prefixColors: [
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
      ],
    }
  );
  const report = [{ id: "mock registry", url: registryUrl }, ...allExamples]
    .map(
      (example) => `
  ${example.url} - ${example.id}`
    )
    .join("");

  console.log("About to launch:", report);

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
