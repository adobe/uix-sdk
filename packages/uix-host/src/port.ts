/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import type {
  Emits,
  GuestConnection,
  HostMethodAddress,
  NamedEvent,
  RemoteHostApis,
  GuestApis,
  Unsubscriber,
  VirtualApi,
} from "@adobe/uix-core";
import { Emitter, phantogram } from "@adobe/uix-core";

/**
 * A specifier for methods to be expected on a remote interface.
 *
 * @remarks
 * A CapabilitySpec is a description of an interface, like a very simplified
 * type definition. It specifies an object structure and the paths in that
 * structure that must be functions. (It doesn't specify anything about the
 * signatures or return values of those functions.)
 *
 * Use CapabilitySpec objects as queries, or filters, to get a subset of
 * installed extensions which have registered methods which match the spec.
 *
 * @example
 * As an extensible app developer, you are making an extension point for spell
 * check. Your code expects extensions to register an API `spellCheck` with
 * methods called `spellCheck.correct(text)` and `spellCheck.suggest(text)`.
 *
 * ```javascript
 * async function correctText(text) {
 *   const spellCheckers = host.getLoadedGuests({
 *     spellCheck: [
 *       'correct',
 *       'suggest'
 *     ]
 *   });
 *   let correcting = text;
 *   for (const checker of spellCheckers) {
 *     correcting = await checker.apis.spellCheck.correct(correcting);
 *   }
 *   return Promise.all(checkers.map(checker =>
 *     checker.apis.spellCheck.suggest(correcting)
 *   ));
 * }
 * ```
 *
 * @public
 */
export type CapabilitySpec<T extends GuestApis> = {
  [Name in keyof T]: (keyof T[Name])[];
};

/**
 * Interface for decoupling of guest Penpal object
 * @internal
 */
interface GuestProxyWrapper {
  // #region Properties (1)

  /**
   * Methods from guest
   */
  apis: RemoteHostApis;

  // #endregion Properties (1)

  // #region Public Methods (1)

  /**
   * Emit an event in the guest frame
   */
  emit(type: string, detail: unknown): Promise<void>;

  // #endregion Public Methods (1)
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
  /**
   * Time in milliseconds to wait for the guest to connect before throwing.
   */
  timeout?: number;
  /**
   * Set true to log copiously in the console.
   */
  debug?: boolean;
};

const defaultOptions = {
  timeout: 10000,
  debug: false,
};

/**
 * A Port is the Host-maintained  object representing an extension running as a
 * guest. It exposes methods registered by the Guest, and can provide Host
 * methods back to the guest.
 *
 * @remarks
 * When the Host object loads extensions via {@link Host.load}, it creates a
 * Port object for each extension. When retrieving and filtering extensions
 * via {@link Host.(getLoadedGuests:2)}, a list of Port objects is returned. From
 * the point of view of the extensible app using the Host object, extensions
 * are always Port objects, which expose the methods registered by the
 * extension at the {@link Port.apis} property.
 *
 * @privateRemarks
 * We've gone through several possible names for this object. GuestProxy,
 * GuestInterface, GuestConnection, etc. "Port" is not ideal, but it conflicted
 * the least with other types we defined in early drafts. It's definitely
 * something we should review.
 * @public
 */
export class Port<GuestApi>
  extends Emitter<PortEvents<GuestApi>>
  implements GuestConnection
{
  // #region Properties (13)

  private debug: boolean;
  private logger?: Console;
  private frame: HTMLIFrameElement;
  private guest: GuestProxyWrapper;
  private hostApis: RemoteHostApis = {};
  private isLoaded = false;
  private runtimeContainer: HTMLElement;
  private sharedContext: Record<string, unknown>;
  private subscriptions: Unsubscriber[] = [];
  private timeout: number;

  /**
   * Dictionary of namespaced methods that were registered by this guest at the
   * time of connection, using {@link @adobe/uix-guest#register}.
   *
   * @remarks
   * These methods are proxy methods; you can only pass serializable objects to
   * them, not class instances, methods or callbacks.
   * @public
   */
  public apis: RemoteHostApis;
  /**
   * If any errors occurred during the loading of guests, this property will
   * contain the error that was raised.
   * @public
   */
  error?: Error;
  /**
   * The URL of the guest provided by the extension registry. The Host will
   * load this URL in the background, in the invisible the bootstrap frame, so
   * this URL must point to a page that calls {@link @adobe/uix-guest#register}
   * when it loads.
   */
  public url: URL;

  // #endregion Properties (13)

  // #region Constructors (1)

  constructor(config: {
    owner: string;
    id: string;
    url: URL;
    /**
     * An alternate DOM element to use for invisible iframes. Will create its
     * own if this option is not populated with a DOM element.
     */
    runtimeContainer: HTMLElement;
    options: PortOptions;
    logger?: Console;
    /**
     * Initial object to populate the shared context with. Once the guest
     * connects, it will be able to access these properties.
     */
    sharedContext: Record<string, unknown>;
    events: Emits;
  }) {
    super(config.id);
    const { timeout, debug } = { ...defaultOptions, ...(config.options || {}) };
    this.timeout = timeout;
    this.debug = debug;
    this.id = config.id;
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

  /**
   * Connect an iframe element which is displaying another page in the extension
   * with the extension's bootstrap frame, so they can share context and events.
   */
  public attachUI(iframe: HTMLIFrameElement) {
    return this.attachFrame(iframe);
  }

  /**
   * Returns true if the guest has registered methods matching the provided
   * capability spec. A capability spec is simply an object whose properties are
   * declared in an array of keys, description the names of the functions and
   * methods that the Port will expose.
   */
  public hasCapabilities(requiredMethods: CapabilitySpec<GuestApis>) {
    this.assertReady();
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

  /**
   * True when al extensions have loaded.
   */
  public isReady(): boolean {
    return this.isLoaded && !this.error;
  }

  /**
   * Loads the extension. Returns a promise which resolves when the extension
   * has loaded. The Host calls this method after retrieving extensions.
   */
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

  /**
   * The host-side equivalent of {@link @adobe/uix-guest#register}. Pass a set
   * of methods down to the guest as proxies.
   */
  public provide(apis: RemoteHostApis) {
    Object.assign(this.hostApis, apis);
    this.emit("hostprovide", { guestPort: this, apis });
  }

  /**
   * Disconnect from the extension.
   */
  public async unload(): Promise<void> {
    if (this.frame && this.frame.parentElement) {
      this.frame.parentElement.removeChild(this.frame);
      this.frame = undefined;
    }
    this.emit("unload", { guestPort: this });
  }

  // #endregion Public Methods (6)

  // #region Private Methods (6)

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

  private assertReady() {
    this.assert(this.isReady(), () => "Attempted to interact before loaded");
  }

  private attachFrame(iframe: HTMLIFrameElement) {
    return {
      promise: phantogram<GuestProxyWrapper>(
        {
          key: this.id,
          remote: iframe,
          targetOrigin: "*",
          timeout: this.timeout,
        },
        {
          getSharedContext: () => this.sharedContext,
          invokeHostMethod: (address: HostMethodAddress) =>
            this.invokeHostMethod(address),
        }
      ) as Promise<GuestProxyWrapper>,
      destroy() {},
    };
  }

  private async connect() {
    this.frame = this.runtimeContainer.ownerDocument.createElement("iframe");
    this.frame.setAttribute("src", this.url.href);
    this.frame.setAttribute("data-uix-guest", "true");
    this.runtimeContainer.appendChild(this.frame);
    if (this.logger) {
      this.logger.info(
        `Guest ${this.id} attached iframe of ${this.url.href}`,
        this
      );
    }
    const { promise } = this.attachFrame(this.frame);
    this.guest = await promise;
    this.apis = this.guest.apis || {};
    this.isLoaded = true;
    if (this.logger) {
      this.logger.info(
        `Guest ${this.id} established connection, received methods`,
        this.apis,
        this
      );
    }
  }

  private getHostMethodCallee<T = unknown>(
    { name, path }: HostMethodAddress,
    methodSource: RemoteHostApis
  ): RemoteHostApis<VirtualApi> {
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
      return next as RemoteHostApis<GuestApi>;
    }, methodSource);
    this.assert(
      typeof methodCallee[name] === "function" &&
        Reflect.has(methodCallee, name),
      () => `"${dots(path.length - 1)}.${name}" is not a function`
    );
    return methodCallee;
  }

  private invokeHostMethod<T = unknown>(
    address: HostMethodAddress,
    privateMethods?: RemoteHostApis
  ): T {
    const { name, path, args = [] } = address;
    this.assert(name && typeof name === "string", () => "Method name required");
    this.assert(
      path.length > 0,
      () =>
        `Cannot call a method directly on the host; ".${name}()" must be in a namespace.`
    );
    let methodCallee;
    if (privateMethods) {
      try {
        methodCallee = this.getHostMethodCallee(address, privateMethods);
      } catch (e) {
        this.logger.warn("Private method not found!", address);
      }
    }
    if (!methodCallee) {
      methodCallee = this.getHostMethodCallee(address, this.hostApis);
    }
    const method = methodCallee[name] as (...args: unknown[]) => T;
    this.emit("beforecallhostmethod", { guestPort: this, name, path, args });
    return method.apply(methodCallee, [
      { id: this.id, url: this.url },
      ...args,
    ]) as T;
  }

  // #endregion Private Methods (6)
}
