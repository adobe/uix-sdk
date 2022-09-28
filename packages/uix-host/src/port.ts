import type {
  GuestConnection,
  GuestMethods,
  RequiredMethodsByName,
  RemoteApis,
  HostMethodAddress,
  NamedEvent,
  Emits,
  UIGuestPositioning,
  Unsubscriber,
} from "@adobe/uix-core";
import { Emitter } from "@adobe/uix-core";
import { Connection, connectToChild, Methods } from "penpal";

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
  // #region Properties (16)

  private debug: boolean;
  private debugLogger?: Console;
  private guest: GuestMethods;
  private hostApis: RemoteApis = {};
  private isLoaded = false;
  private runtimeContainer: HTMLElement;
  private sharedContext: Record<string, unknown>;
  private subscriptions: Unsubscriber[] = [];
  private timeout: number;

  public apis: RemoteApis;
  public connection: Connection<RemoteApis<GuestApi>>;
  error?: Error;
  public frame: HTMLIFrameElement;
  public owner: string;
  public uiConnections: Map<string, Connection<RemoteApis<GuestApi>>> =
    new Map();
  public url: URL;

  // #endregion Properties (16)

  // #region Constructors (1)

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

  // #endregion Constructors (1)

  // #region Public Methods (6)

  public attachUI(iframe: HTMLIFrameElement) {
    const uniqueId = Math.random().toString(36);
    const uiConnection = this.attachFrame(iframe);
    this.uiConnections.set(uniqueId, uiConnection);
    return uiConnection;
  }

  public hasCapabilities(requiredMethods: RequiredMethodsByName<GuestApi>) {
    this.assertLoaded();
    if (!this.apis || typeof this.apis !== "object") {
      return false;
    }
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

  public isLoading(): boolean {
    return !(this.isLoaded || this.error);
  }

  public async load() {
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

  public provide(apis: RemoteApis) {
    Object.assign(this.hostApis, apis);
    this.emit("hostprovide", { guestPort: this, apis });
  }

  public async unload(): Promise<void> {
    if (this.connection) {
      await this.connection.destroy();
    }
    for (const connection of this.uiConnections.values()) {
      await connection.destroy();
    }
    if (this.frame && this.frame.parentElement) {
      this.frame.parentElement.removeChild(this.frame);
      this.frame = undefined;
    }
    this.emit("unload", { guestPort: this });
  }

  // #endregion Public Methods (6)

  // #region Private Methods (5)

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

  private attachFrame(iframe: HTMLIFrameElement) {
    return connectToChild<RemoteApis<GuestApi>>({
      iframe,
      debug: this.debug,
      childOrigin: this.url.origin,
      timeout: this.timeout,
      methods: {
        getSharedContext: () => this.sharedContext,
        invokeHostMethod: (address: HostMethodAddress) =>
          this.invokeHostMethod(address),
      },
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
    this.connection = this.attachFrame(this.frame);
    this.guest = (await this.connection.promise) as unknown as GuestMethods;
    this.apis = this.guest.apis || {};
    this.isLoaded = true;
    if (this.debugLogger) {
      this.debugLogger.info(
        `Guest ${this.id} established connection, received methods`,
        this.apis,
        this
      );
    }
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

  // #endregion Private Methods (5)
}
