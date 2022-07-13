import {
  RequiredMethodsByName,
  NamespacedApis,
  HostMethodAddress,
  ApiMethod,
} from "../common/types";
import { Connection, connectToChild } from "penpal";

export type GuestConnectorOptions = {
  timeout?: number;
  debug?: boolean;
};

const defaultOptions = {
  timeout: 10000,
  debug: false,
};

export class GuestConnector {
  owner: string;
  id: string;
  url: URL;
  frame: HTMLIFrameElement;
  connection: Connection<NamespacedApis>;
  apis: NamespacedApis;
  private hostApis: NamespacedApis = {};
  debugLogger?: Console;
  constructor(config: {
    owner: string;
    id: string;
    url: URL;
    runtimeContainer: HTMLElement;
    options: GuestConnectorOptions;
    debugLogger?: Console;
  }) {
    const { timeout, debug } = { ...defaultOptions, ...(config.options || {}) };
    this.id = config.id;
    this.owner = config.owner;
    this.url = config.url;
    this.frame = config.runtimeContainer.ownerDocument.createElement("iframe");
    this.frame.setAttribute("src", config.url.href);
    this.frame.setAttribute("data-uix-guest", "true");
    config.runtimeContainer.appendChild(this.frame);
    if (this.debugLogger) {
      this.debugLogger.info(
        `Guest ${this.id} attached iframe of ${this.url.href}`,
        this
      );
    }
    this.connection = connectToChild({
      iframe: this.frame,
      debug,
      timeout,
      methods: {
        invokeHostMethod: (address: HostMethodAddress) =>
          this.invokeHostMethod(address),
      },
    });
  }
  isLoaded() {
    return !!this.apis;
  }
  private invokeHostMethod({ name, path, args = [] }: HostMethodAddress) {
    this.assert(name && typeof name === "string", () => "Method name required");
    this.assert(
      path.length > 0,
      () =>
        `Cannot call a method directly on the host; ".${name}()" must be in a namespace.`
    );
    const dots = (level: number) =>
      `uix.host.${path.slice(0, level).join(".")}`;
    const methodCallee = path.reduce((current, prop, level) => {
      this.assert(
        Reflect.has(current, prop),
        () => `${dots(level)} has no property "${prop}"`
      );
      const next = current[prop];
      this.assert(
        typeof next === "object",
        () =>
          `${dots(
            level
          )}.${prop} is not an object; namespaces must be objects with methods`
      );
      return next as NamespacedApis;
    }, this.hostApis);
    this.assert(
      typeof methodCallee[name] === "function" &&
        Reflect.has(methodCallee, name),
      () => `"${dots(path.length - 1)}.${name}" is not a function`
    );
    const method = methodCallee[name] as unknown as ApiMethod;
    return method.apply(methodCallee, [
      { id: this.id, url: this.url },
      ...args,
    ]);
  }
  private assert(
    condition: boolean,
    errorMessage: () => string
  ): asserts condition {
    if (!condition) {
      throw new Error(
        `Error in guest extension "${this.id}": ${errorMessage()}`
      );
    }
  }
  private assertLoaded() {
    this.assert(this.isLoaded(), () => "Attempted to interact before loaded");
  }
  hasCapabilities<Apis extends NamespacedApis>(
    requiredMethods: RequiredMethodsByName<Apis>
  ) {
    this.assertLoaded();
    return Object.keys(requiredMethods).every((key: string) => {
      if (!this.apis.hasOwnProperty(key)) {
        return false;
      }
      const api = this.apis[key];
      const methodList = requiredMethods[key];
      return methodList.every(
        (methodName: string) =>
          api.hasOwnProperty(methodName) &&
          typeof api[methodName] === "function"
      );
    });
  }
  private async connect() {
    this.apis = (await this.connection.promise) as unknown as NamespacedApis;
    if (this.debugLogger) {
      this.debugLogger.info(
        `Guest ${this.id} established connection, received methods`,
        this.apis,
        this
      );
    }
  }
  async load() {
    try {
      if (!this.apis) {
        await this.connect();
      }
    } catch (e) {
      this.apis = null;
      (this.debugLogger || console).error(
        `Guest ${this.id} could not load:`,
        e
      );
    }
    return this.apis;
  }
  provide(apis: NamespacedApis) {
    Object.assign(this.hostApis, apis);
  }
}
