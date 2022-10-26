import path from "path";
import fs from "fs";
import ApiExtractor from "@microsoft/api-extractor";
import chokidar from "chokidar";
import { createCodeFrame } from "simple-code-frame";
import { getSdks, makeLogger, logger, runWithArg, sh } from "./script-runner.mjs";
import { inspect, promisify } from "util";
import { EventEmitter } from "events";
import { spawn } from "child_process";
import chalk from "chalk";
import crlf from "crlf";

const { Extractor, ExtractorConfig } = ApiExtractor;

const LogLevels = {
  error: 3,
  warning: 2,
  info: 1,
  verbose: 0,
};

class CodeFrameMaker {
  constructor(sdk) {
    this.fileCache = new Map();
    this.frameCache = new Map();
    this.pkgDir = path.resolve(sdk.cwd, "..");
  }
  getSource(sourceFilePath) {
    let source;
    if (!this.fileCache.has(sourceFilePath)) {
      source = fs.readFileSync(sourceFilePath, "utf-8");
      this.fileCache.set(sourceFilePath, source);
    } else {
      source = this.fileCache.get(sourceFilePath, source);
    }
    return source;
  }
  makeCodeFrame({ sourceFilePath: file, sourceFileLine, sourceFileColumn }) {
    const line = sourceFileLine - 1;
    const col = sourceFileColumn - 1;
    const loc = `${path.relative(this.pkgDir, file)}:${line}:${col}`;
    if (this.frameCache.has(loc)) {
      return this.frameCache.get(loc);
    }

    const source = this.getSource(file);
    const frame = createCodeFrame(source, line, col, {
      before: 7,
      after: 1,
      colors: true,
      maxWidth: process.stdout.columns - 1,
    });
    const taggedFrame = `\n\n  ${chalk.bold(loc)}:\n\n${frame}\n`;
    this.frameCache.set(loc, taggedFrame);
    return taggedFrame;
  }
}

class SdkWatcher extends EventEmitter {
  static debounce(interval, callback) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => callback(...args), interval);
    };
  }
  constructor(sdks) {
    super();
    this.sdks = sdks;
  }
  start() {
    this.compiler = spawn("npm", ["run", "-s", "declarations:watch"], {
      encoding: "utf-8",
      stdio: "inherit",
    });
    this.compiler.on("error", (e) => this.emit("error", e));
    this.dirWatcher = chokidar.watch(
      this.sdks.map((sdk) => path.resolve(sdk.cwd, "dist"), {
        cwd: process.cwd(),
      })
    );
    const scheduleDone = SdkWatcher.debounce(1000, () => this.emit("idle"));
    for (const { shortName, cwd } of this.sdks) {
      const emitChange = SdkWatcher.debounce(300, (...args) => {
        this.emit(shortName, ...args);
      });
      this.dirWatcher.on("all", (_, file, ...rest) => {
        if (file.startsWith(cwd + '/')) {
          emitChange(_, file, ...rest);
        }
        scheduleDone();
      });
    }
  }
  async close() {
    this.removeAllListeners();
    this.dirWatcher.close();
    this.compiler.kill();
  }
}

const baseDir = process.cwd();

class ApiReporter {
  constructor(sdk, config = {}) {
    this.sdk = sdk;
    this.config = { ...ApiReporter.defaultConfig, ...config };
    this.hasSucceededBefore = false;
    if (!Reflect.has(LogLevels, this.config.logLevel)) {
      this.die(new Error(`Unrecognized log level "${config.logLevel}"`));
    }
    this.logLevel = LogLevels[config.logLevel];
    this.logger = makeLogger(this.sdk.shortName);
    process.chdir(this.sdk.cwd);
    this.extractorConfig = ExtractorConfig.loadFileAndPrepare(
      path.resolve(this.sdk.cwd, "api-extractor.json")
    );
    process.chdir(baseDir);
  }
  async die(error) {
    this.logger.error(error);
    process.chdir(baseDir);
    throw error;
  }
  async runApiExtractor() {
    const codeFrameMaker = new CodeFrameMaker(this.sdk);
    const extractorResult = Extractor.invoke(this.extractorConfig, {
      localBuild: true,
      showVerboseMessages: false,
      showDiagnostics: false,
      ...this.config.extractor,
      messageCallback: (msg) => {
        const msgLogLevel = LogLevels[msg.logLevel];
        msg.handled = true;
        if (msg.logLevel === "none" || msgLogLevel < this.logLevel) {
          return;
        }
        const methodName = typeof this.logger[msg.logLevel] === "function" ? msg.logLevel : 'log';
        if (msg.category === "console" && this.logLevel >= LogLevels.info) {
          if (msgLogLevel > LogLevels.info) {
            this.logger[methodName](msg.text);
          } else {
            this.logger.done(msg.text);
          }
          return;
        }
        const loggerArgs = [msg.text];
        if (msg.sourceFilePath) {
          loggerArgs.push(codeFrameMaker.makeCodeFrame(msg));
        }
        this.logger[methodName](...loggerArgs);
      },
    });
    if (extractorResult.errorCount > 0) {
      throw new Error(
        `There were ${
          extractorResult.errorCount
        } errors during extraction: ${inspect(extractorResult)}`
      );
    } else if (this.logLevel <= LogLevels.info) {
      this.logger.done
        .hl`extracted API with ${extractorResult.warningCount} warnings`;
    }
  }
  async generate() {
    process.chdir(this.sdk.cwd);
    try {
      await this.runApiExtractor();
    } catch (e) {
      this.logger.error(e.message);
      throw e;
    } finally {
      process.chdir(baseDir);
    }
  }
}

const tempReportDir = path.join('docs', 'temp');
const markdownSubdir = path.join('docs', 'markdown');
const markdownDir = path.resolve(baseDir, markdownSubdir);

const crlfSetP = promisify(crlf.set);
async function correctLineEndings() {
  const mdFiles = fs.readdirSync(markdownDir);
  return Promise.all(
    mdFiles.map((file) => {
      return crlfSetP(path.resolve(markdownDir, file), "LF");
    })
  );
}

const docLogger = makeLogger("api-documenter");
async function runApiDocumenter(config) {
  const logLevel = LogLevels[config.logLevel];
  const silent = logLevel >= LogLevels.warning;
  try {
    fs.mkdirSync(markdownDir, { recursive: true });
    await sh(
      "node_modules/.bin/api-documenter",
      ["markdown", "-i", tempReportDir, "-o", markdownSubdir],
      {
        cwd: baseDir,
        encoding: "utf-8",
        silent,
      }
    );
    if (!silent) {
      docLogger.done(`markdown saved to ${markdownSubdir}`);
      docLogger.log("updating line endings...");
    }
    try {
      await correctLineEndings();
      if (!silent) {
        docLogger.done("markdown line endings set to LF");
      }
    } catch (e) {
      docLogger.warn("Failed to correct line endings:", e);
    }
  } catch (e) {
    docLogger.error(e);
    throw e;
  } finally {
    process.chdir(baseDir);
  }
}

async function oneDocGen(sdks, config) {
  const logLevel = LogLevels[config.logLevel];
  const silent = logLevel >= LogLevels.warning;
  if (!config.onlyMarkdown) {
    await sh("npm", ["run", "-s", "declarations:build"], {
      silent,
    });
    for (const sdk of sdks) {
      const reporter = new ApiReporter(sdk, config);
      await reporter.generate();
    }
  }
  if (!config.noMarkdown) {
    await runApiDocumenter(config);
  }
}

async function liveDocGen(sdks, config) {
  const sdkWatcher = new SdkWatcher(sdks);
  process.once("SIGINT", () => {
    sdkWatcher.close();
  });
  for (const sdk of sdks) {
    const docWatcher = new ApiReporter(sdk, config);
    sdkWatcher.on(sdk.shortName, (...args) => {
      docWatcher.generate();
    });
  }
  if (!config.noMarkdown) {
    sdkWatcher.on("idle", async () => {
      await runApiDocumenter(config);
    });
  }
  sdkWatcher.on("error", e => {
    logger.error(e);
  })
  sdkWatcher.start();
}

const defaultConfig = {
  logLevel: "warning",
  extractor: {},
};
async function docGen(sdks, options) {
  const config = { ...defaultConfig, ...options };
  return options.watch ? liveDocGen(sdks, config) : oneDocGen(sdks, config);
}

runWithArg(docGen, async (argv) => {
  let sdks = await getSdks();
  if (argv._.length > 0) {
    sdks = sdks.filter(({ cwd, pkg }) =>
      argv._.some(
        (pattern) =>
          path.resolve(pattern) === cwd || // npm docdev packages/uix-core
          pkg.name === pattern || // npm docdev @adobe/uix-core
          pkg.name.split("/").pop() === pattern || // npm docdev uix-core
          pkg.name.split("-").pop() === pattern // npm docdev core
      )
    );
    if (sdks.length === 0) {
      throw new Error(`Pattern "${pattern}" did not match any SDKs`);
    }
  }
  return [sdks, argv];
});
