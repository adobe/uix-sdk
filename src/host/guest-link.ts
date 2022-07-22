import {
  RequiredMethodsByName,
  NamespacedApis,
  HostMethodAddress,
  ApiMethod,
  PortEvents,
  UIXPort,
} from "../common/types";
import { Connection, connectToChild } from "penpal";
import { Emitter } from "../common/emitter";

export type PortOptions = {
  timeout?: number;
  debug?: boolean;
};

const defaultOptions = {
  timeout: 10000,
  debug: false,
};

export class Port extends Emitter<PortEvents> implements UIXPort {
  owner: string;
  url: URL;
  frame: HTMLIFrameElement;
  connection: Connection<NamespacedApis>;
  apis: NamespacedApis;
  error?: Error;
  private hostApis: NamespacedApis = {};
  private debugLogger?: Console;
  private timeout: number;
  private debug: boolean;
  private runtimeContainer: HTMLElement;
  constructor(config: {
    owner: string;
    id: string;
    url: URL;
    runtimeContainer: HTMLElement;
    options: PortOptions;
    debugLogger?: Console;
  }) {
    super(config.id);
    const { timeout, debug } = { ...defaultOptions, ...(config.options || {}) };
    this.timeout = timeout;
    this.debug = debug;
    this.id = config.id;
    this.owner = config.owner;
    this.url = config.url;
    this.runtimeContainer = config.runtimeContainer;
  }
  isLoading(): boolean {
    return !(this.error || this.apis);
  }
  async load() {
    try {
      if (!this.apis) {
        await this.connect();
      }
      return this.apis;
    } catch (e) {
      this.apis = null;
      this.error = e instanceof Error ? e : new Error(String(e));
      throw e;
    }
  }
  provide(apis: NamespacedApis) {
    Object.assign(this.hostApis, apis);
    this.emit("hostprovide", { guestPort: this, apis });
  }
  async unload(): Promise<void> {
    if (this.connection) {
      await this.connection.destroy();
    }
    if (this.frame) {
      this.frame.parentElement.removeChild(this.frame);
    }
    this.emit("unload", { guestPort: this });
  }
  private invokeHostMethod<T = unknown>({
    name,
    path,
    args = [],
  }: HostMethodAddress): T {
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
    this.emit("beforecallhostmethod", { guestPort: this, name, path, args });
    return method.apply(methodCallee, [
      { id: this.id, url: this.url },
      ...args,
    ]) as T;
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
    this.assert(!this.isLoading(), () => "Attempted to interact before loaded");
  }
  hasCapabilities<Apis extends NamespacedApis>(
    requiredMethods: RequiredMethodsByName<Apis>
  ) {
    this.assertLoaded();
    return Object.keys(requiredMethods).every((key: string) => {
      if (!Reflect.has(this.apis, key)) {
        return false;
      }
      const api = this.apis[key];
      const methodList = requiredMethods[key];
      return methodList.every(
        (methodName: string) =>
          Reflect.has(api, methodName) && typeof api[methodName] === "function"
      );
    });
  }
  private async connect() {
    this.frame = this.runtimeContainer.ownerDocument.createElement("iframe");
    this.frame.setAttribute("src", this.url.href);
    this.frame.setAttribute("data-uix-guest", "true");
    this.runtimeContainer.appendChild(this.frame);
    if (this.debugLogger) {
      this.debugLogger.info(
        `Guest ${this.id} attached iframe of ${this.url.href}`,
        this
      );
    }
    this.connection = connectToChild({
      iframe: this.frame,
      debug: this.debug,
      timeout: this.timeout,
      methods: {
        invokeHostMethod: (address: HostMethodAddress) =>
          this.invokeHostMethod(address),
      },
    });
    this.apis = (await this.connection.promise) as unknown as NamespacedApis;
    if (this.debugLogger) {
      this.debugLogger.info(
        `Guest ${this.id} established connection, received methods`,
        this.apis,
        this
      );
    }
  }
}
