#!/usr/bin/env node

import path from "path";
import express from "express";
import expressHttpProxy from "express-http-proxy";
import cors from "cors";
import { createServer } from "http";
import {
  makeLogger,
  logger,
  getExamples,
  getSdks,
  runWithArg,
} from "./script-runner.mjs";

const cwd = process.cwd();

async function serve({ url, quiet, registry }) {
  const examples = await getExamples();
  const sdks = await getSdks();
  const me = examples.find((example) => example.cwd === cwd);
  if (!me) {
    throw new Error(
      `Must run scripts/serve.mjs from an example folder. Current directory is ${cwd}`
    );
  }
  const logger = makeLogger(me.pkg.title);
  const app = express();
  if (registry) {
    app.use("/example-registry", expressHttpProxy(registry));
  }
  app.use(cors());
  app.use(express.static(path.join(me.cwd, "dist"), { cacheControl: false }));
  app.use(express.static(me.cwd, { cacheControl: false }));
  for (const sdk of sdks) {
    app.use(
      `/${sdk.pkg.name}`,
      express.static(path.join(sdk.cwd, "dist"), {
        index: ["index.js", "index.cjs", "index.mjs"],
        cacheControl: false,
      })
    );
  }
  createServer(app).listen(url.port, url.hostname, () => {
    if (!quiet) {
      logger.log.hl`${me.pkg.description} serving on ${url.href}`;
    }
  });
}

runWithArg(serve, async (argv) => {
  if (argv._.length > 0) {
    throw new Error(`Unrecognized arguments: ${argv._.slice(1).join(", ")}`);
  }
  let port = argv.port || process.env.MULTI_SERVER_PORT || 0;
  port = Number(port);
  if (Number.isNaN(port) || (port <= 1024 && port !== 0)) {
    throw new Error("Must supply a positive integer over 1024 as port number");
  }
  let registry = argv.registry || process.env.REGISTRY_URL;
  if (!registry) {
    logger.warn(
      `No registry URL specified with ${"--registry=<url>"}. App may get a 404 trying to contact it.`
    );
  } else {
    try {
      registry = new URL(registry).href;
    } catch (e) {
      throw new Error(`--registry passed was invalid: ${e.message}`);
    }
  }
  const host = argv.host || 'localhost';
  let url;
  try {
    url = new URL(`http://${host}`);
    url.port = port;
  } catch (e) {
    throw new Error(`--host passed was invalid: ${e.message}`);
  }
  return [{ ...argv, url, registry }];
});
