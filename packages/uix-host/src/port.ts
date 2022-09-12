import type {
  GuestConnection,
  RequiredMethodsByName,
  RemoteApis,
  HostMethodAddress,
  NamedEvent,
  Emits,
  Unsubscriber,
} from "@adobe/uix-core";
import { Emitter } from "@adobe/uix-core";
import { Connection, connectToChild } from "penpal";

interface GuestMethods {
  emit(type: string, detail: unknown): Promise<void>;
  apis: RemoteApis;
}

/** @public */
type PortEvent<
  GuestApi,
  Type extends string = string,
  Detail = Record<string, unknown>
> = NamedEvent<
  Type,
  Detail &
    Record<string, unknown> & {
      guestPort: Port<GuestApi>;
    }
>;

/** @public */
export type PortEvents<
  GuestApi,
  HostApi extends Record<string, unknown> = Record<string, unknown>
> =
  | PortEvent<GuestApi, "hostprovide">
  | PortEvent<GuestApi, "unload">
  | PortEvent<GuestApi, "beforecallhostmethod", HostMethodAddress<HostApi>>;

/** @public */
export type PortOptions = {
  timeout?: number;
  debug?: boolean;
};

const defaultOptions = {
  timeout: 10000,
  debug: false,
};

/**
 * TODO: document Port
 * @public
 */
export class Port<GuestApi>
  extends Emitter<PortEvents<GuestApi>>
  implements GuestConnection
{
  owner: string;
  url: URL;
  frame: HTMLIFrameElement;
  connection: Connection<RemoteApis<GuestApi>>;
  apis: RemoteApis;
  error?: Error;
  private hostApis: RemoteApis = {};
  private guest: GuestMethods;
  private debugLogger?: Console;
  private isLoaded = false;
  private timeout: number;
  private debug: boolean;
  private runtimeContainer: HTMLElement;
  private sharedContext: Record<string, unknown>;
  private subscriptions: Unsubscriber[] = [];
  constructor(config: {
    owner: string;
    id: string;
    url: URL;
    runtimeContainer: HTMLElement;
    options: PortOptions;
    debugLogger?: Console;
    sharedContext: Record<string, unknown>;
    events: Emits;
  }) {
    super(config.id);
    const { timeout, debug } = { ...defaultOptions, ...(config.options || {}) };
    this.timeout = timeout;
    this.debug = debug;
    this.id = config.id;
    this.owner = config.owner;
    this.url = config.url;
    this.runtimeContainer = config.runtimeContainer;
    this.sharedContext = config.sharedContext;
    this.subscriptions.push(
      config.events.addEventListener("contextchange", async (event) => {
        this.sharedContext = (
          (event as CustomEvent).detail as unknown as Record<string, unknown>
        ).context as Record<string, unknown>;
        await this.connect();
        await this.guest.emit("contextchange", { context: this.sharedContext });
      })
    );
  }
  isLoading(): boolean {
    return !(this.isLoaded || this.error);
  }
  async load() {
    try {
      if (!this.apis) {
        await this.connect();
      }
      return this.apis;
    } catch (e) {
      this.apis = null;
      this.guest = null;
      this.error = e instanceof Error ? e : new Error(String(e));
      throw e;
    }
  }
  provide(apis: RemoteApis) {
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
      return next as RemoteApis<GuestApi>;
    }, this.hostApis);
    this.assert(
      typeof methodCallee[name] === "function" &&
        Reflect.has(methodCallee, name),
      () => `"${dots(path.length - 1)}.${name}" is not a function`
    );
    const method = methodCallee[name] as (...args: unknown[]) => T;
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
  hasCapabilities(requiredMethods: RequiredMethodsByName<GuestApi>) {
    this.assertLoaded();
    return Object.keys(requiredMethods).every((key) => {
      if (!Reflect.has(this.apis, key)) {
        return false;
      }
      const api = this.apis[key];
      const methodList = requiredMethods[
        key as keyof typeof requiredMethods
      ] as string[];
      return methodList.every(
        (methodName: string) =>
          Reflect.has(api, methodName) &&
          typeof api[methodName as keyof typeof api] === "function"
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
        getSharedContext: () => this.sharedContext,
        invokeHostMethod: (address: HostMethodAddress) =>
          this.invokeHostMethod(address),
      },
    });
    this.guest = (await this.connection.promise) as unknown as GuestMethods;
    this.apis = this.guest.apis;
    this.isLoaded = true;
    if (this.debugLogger) {
      this.debugLogger.info(
        `Guest ${this.id} established connection, received methods`,
        this.apis,
        this
      );
    }
  }
}
