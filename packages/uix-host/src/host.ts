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
  Extension,
  GuestEmitter,
  NamedEvent,
  Emits,
  GuestApis,
} from "@adobe/uix-core";
import type { CapabilitySpec } from "./port.js";
import { Emitter, quietConsole } from "@adobe/uix-core";
import { Port, PortOptions } from "./port.js";
import { debugHost } from "./debug-host.js";

/**
 * Dictionary of {@link Port} objects by extension ID.
 * @public
 */
export type PortMap = Map<string, Port>;

/** @public */
export type HostEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = NamedEvent<Type, Detail & Record<string, unknown> & { host: Host }>;
/** @public */
type HostGuestEvent<Type extends string> = HostEvent<
  `guest${Type}`,
  { guest: Port }
>;

/**
 * All guests requested by host have been loaded and connected.
 * @public
 */
export type HostEventLoadAllGuests = HostEvent<
  "loadallguests",
  { failed: Port[]; loaded: Port[] }
>;

/**
 * Shared context has been set or updated; all guests receive this event too.
 * @public
 */

export type HostEventContextChange = HostEvent<
  "contextchange",
  { context: SharedContextValues }
>;

/**
 * An error has occurred during loading or unloading of guests.
 * @public
 */
export type HostEventError = HostEvent<"error", { error: Error }>;

/** @public */
export type HostEvents =
  | HostGuestEvent<"beforeload">
  | HostGuestEvent<"load">
  | HostEvent<"beforeunload">
  | HostEvent<"unload">
  | HostEventLoadAllGuests
  | HostEventContextChange
  | HostEventError;

/** @public */
export type InstalledExtensions = Record<Extension["id"], Extension["url"]>;
/** @public */
export type ExtensionsProvider = () => Promise<InstalledExtensions>;

/**
 * Values for shared context. Must be a plain object, serializable to JSON.
 * @public
 */
export type SharedContextValues = Record<string, unknown>;

/** @public */
export interface HostConfig {
  /**
   * Human-readable "slug" name of the extensible area--often an entire app.
   * This string serves as a namespace for extension points within the area.
   */
  hostName: string;
  /**
   * A DOM element _outside_ of the React root. This is necessary to preserve
   * the lifetime of the iframes which are running extension objects; if they
   * live inside the React root, then React could unexpectedly re-render the
   * iframe tags themselves at any time, causing a reload of the frame.
   */
  runtimeContainer?: HTMLElement;
  /**
   * Copiously log lifecycle events.
   */
  debug?: boolean;
  /**
   * Default options to use for every guest Port.
   *
   * If `config.debug` is true, then the guest options will have `debug: true`
   * unless `debug: false` is explicitly passed in `guestOptions`.
   */
  guestOptions?: PortOptions;
  /**
   * A read-only dictionary of values that the host will supply to all the
   * guests.
   */
  sharedContext?: SharedContextValues;
}

/**
 * Callback to use to filter the list returned from {@link Host.(getLoadedGuests:2)}
 * @public
 */
type GuestFilter = (item: GuestEmitter) => boolean;

const passAllGuests = () => true;

/**
 * Manager object for connecting to {@link @adobe/uix-guest#GuestServer |
 * GuestServers} and {@link @adobe/uix-guest#GuestUI | GuestUIs}, providing and
 * receiving their APIs, and providing them to the app for interacting with UI.
 *
 * @remarks
 * The Host object is the main connection manager for all UIX Guests.
 * Making an app extensible requires creating a Host object.
 *
 * The extensible app using the Hostis responsible for providing a list of
 * extension references to the Host object. Use {@link
 * createExtensionRegistryProvider} for that purpose. Once you have retrieved a
 * list of extensions available to the host app, pass it to {@link Host.load}.
 *
 * When a Host creates a Guest, it must create an `<iframe>` element to contain
 * the Guest's main {@link @adobe/uix-guest#GuestServer} runtime, which runs
 * invisibly in the background. To do this, the Host creates a hidden container
 * in the body of the document. It is a `<div>` element with the attribute
 * `data-uix-guest-container`. Loaded GuestServers will be injected into this
 * hidden element and removed as necessary. When {@link Host.unload} is called,
 * the Host removes the hidden container from the document after unloading.
 *
 * @public
 */
export class Host extends Emitter<HostEvents> {
  /**
   * {@inheritDoc HostEventLoadAllGuests}
   * @eventProperty
   */
  public loadallguests: HostEventLoadAllGuests;

  /**
   * One guest has loaded.
   * @eventProperty
   */
  public guestload: HostGuestEvent<"load">;

  /**
   * About to attempt to load and connect to a Guest.
   * @eventProperty
   */
  public guestbeforeload: HostGuestEvent<"beforeload">;

  /**
   * About to unload a guest and remove its {@link @adobe/uix-guest#GuestServer}
   * instance as well as all its {@link @adobe/uix-guest#GuestUI} instances.
   * @eventProperty
   */
  public guestbeforeunload: HostGuestEvent<"beforeunload">;

  /**
   * Unloaded a guest and removed its {@link @adobe/uix-guest#GuestServer}
   * instance as well as all its {@link @adobe/uix-guest#GuestUI} instances.
   * @eventProperty
   */
  public guestunload: HostGuestEvent<"unload">;

  /**
   * {@inheritDoc HostEventContextChange}
   * @eventProperty
   */
  public contextchange: HostEventContextChange;

  /**
   * {@inheritDoc HostEventError}
   * @eventProperty
   */
  public error: HostEventError;

  private static containerStyle = {
    position: "fixed",
    width: "1px",
    height: "1px",
    pointerEvents: "none",
    opacity: 0,
    top: 0,
    left: "-1px",
  };
  /**
   * Unique string identifying the Host object.
   */
  hostName: string;
  /**
   * `true` if any extension in {@link Host.guests} has created a {@link
   * @adobe/uix-guest#GuestServer}, but the Guest has not yet loaded.
   */
  loading = false;
  /**
   * A Map of of the loaded guests.
   */
  guests: PortMap = new Map();
  private cachedCapabilityLists: WeakMap<object, Port[]> = new WeakMap();
  private runtimeContainer: HTMLElement;
  private guestOptions: PortOptions;
  private logger: Console = quietConsole;
  private sharedContext: SharedContextValues;
  constructor(config: HostConfig) {
    super(config.hostName);
    const { guestOptions = {} } = config;
    this.guestOptions = {
      ...guestOptions,
      debug: guestOptions.debug === false ? false : !!config.debug,
    };
    this.hostName = config.hostName;
    this.sharedContext = config.sharedContext || {};
    this.runtimeContainer = config.runtimeContainer;
    if (config.debug) {
      this.logger = debugHost(this);
    }
  }
  /**
   * Return all loaded guests.
   */
  getLoadedGuests<T = unknown>(): Port<T>[];
  /**
   * Return loaded guests which satisfy the passed test function.
   */
  getLoadedGuests<T = unknown>(filter: GuestFilter): Port<T>[];
  /**
   * Return loaded guests which expose the provided {@link CapabilitySpec}.
   */
  getLoadedGuests<Apis extends GuestApis>(
    capabilities: CapabilitySpec<Apis>
  ): Port<GuestApis>[];
  getLoadedGuests<Apis extends GuestApis = never>(
    filterOrCapabilities?: CapabilitySpec<Apis> | GuestFilter
  ): Port<GuestApis>[] {
    if (typeof filterOrCapabilities === "object") {
      return this.getLoadedGuestsWith<Apis>(filterOrCapabilities);
    }
    const filter = filterOrCapabilities || passAllGuests;
    const result = [];
    for (const guest of this.guests.values()) {
      if (guest.isReady() && filter(guest)) {
        result.push(guest as Port<GuestApis>);
      }
    }
    return result;
  }
  /**
   * Set the object of shared values that all Guests can access via {@link @adobe/uix-guest#GuestServer.sharedContext}.
   * This overwrites any previous object.
   *
   * @example Exposes `authToken` to all Guests. Guests can call `this.sharedContext.get('authToken')` to retrieve this value.
   * ```javascript
   * host.shareContext({
   *   authToken: '82ba19b'
   * });
   * ```
   *
   * @example Overwrites the previous sharedContext, deleting `authToken` and providing `secret` and `auth` instead.
   * ```javascript
   * host.shareContext({
   *   secret: 'squirrel',
   *   auth: false
   * });
   * ```
   */
  shareContext(context: SharedContextValues): void;
  /**
   * Update the object of shared values that all Guests can access via {@link
   * @adobe/uix-guest#GuestServer.sharedContext}. This method takes a callback
   * which receives the previous context and may return an entirely new context,
   * or new values merged with the old context.
   *
   * @remarks This callback pattern allows the shared context values to be
   * mutable while the internal context object references are immutable, which
   * is important for synchronizing. with guests.
   *
   * @example Overwrites a context object based on the previous one.
   * ```javascript
   * host.shareContext(oldContext => ({
   *   counter: oldContext.counter + 1
   * }))
   * ```
   *
   * @example Updates a context while preserving other existing values.
   * ```javascript
   * host.shareContext(oldContext => ({
   *   ...oldContext,
   *   counter: oldContext.counter + 1
   * }))
   * ```
   */
  shareContext(
    setter: (context: SharedContextValues) => SharedContextValues
  ): void;
  shareContext(
    setter: (context: SharedContextValues) => SharedContextValues
  ): void;
  shareContext(
    setterOrContext:
      | ((context: SharedContextValues) => SharedContextValues)
      | SharedContextValues
  ) {
    if (typeof setterOrContext === "function") {
      this.sharedContext = setterOrContext(this.sharedContext);
    } else {
      this.sharedContext = setterOrContext;
    }
    this.emit("contextchange", {
      host: this,
      context: this.sharedContext,
    });
  }
  /**
   * Load extension into host application from provided extension description.
   * Returned promise resolves when all extensions are loaded and registered.
   *
   * @param extensions - List of extension descriptors. Normally, the Host should receive this value from an {@link ExtensionsProvider}.
   * @param options - Custom options to be used as defaults for each {@link Port} object created for each guest.
   * @returns Promise which resolves when all guests have been loaded.
   */
  async load(
    extensions: InstalledExtensions,
    options?: PortOptions
  ): Promise<void> {
    this.runtimeContainer =
      this.runtimeContainer || this.createRuntimeContainer(window);
    const failed: Port[] = [];
    const loaded: Port[] = [];
    this.loading = true;
    await Promise.all(
      Object.entries(extensions).map(async ([id, url]) => {
        const port = await this.loadOneGuest(id, url, options);
        (port.error ? failed : loaded).push(port);
      })
    );
    this.loading = false;
    this.emit("loadallguests", { host: this, failed, loaded });
  }
  /**
   * Unload all extensions and remove their frames/workers. Use this to unmount
   * a UI or when switching to a different extensible UI.
   */
  async unload(): Promise<void> {
    this.emit("beforeunload", { host: this });
    await Promise.all([...this.guests.values()].map((guest) => guest.unload()));
    this.guests.clear();
    this.runtimeContainer.parentElement.removeChild(this.runtimeContainer);
    this.emit("unload", { host: this });
  }
  private createRuntimeContainer(window: Window) {
    const { document } = window;
    const container = document.createElement("div");
    container.setAttribute("data-uix-guest-container", this.hostName);
    container.setAttribute("role", "presentation");
    container.setAttribute("aria-hidden", "true");
    Object.assign(container.style, Host.containerStyle);
    document.body.appendChild(container);
    return container;
  }
  private async loadOneGuest<T = unknown>(
    id: string,
    urlString: string,
    options: PortOptions = {}
  ): Promise<Port<T>> {
    let guest = this.guests.get(id);
    if (!guest) {
      const url = new URL(urlString);
      guest = new Port({
        owner: this.hostName,
        id,
        url,
        runtimeContainer: this.runtimeContainer,
        options: {
          ...this.guestOptions,
          ...options,
        },
        logger: this.logger,
        sharedContext: this.sharedContext,
        events: this as Emits,
      });
      this.guests.set(id, guest);
    }
    this.emit("guestbeforeload", { guest, host: this });
    try {
      await guest.load();
    } catch (e: unknown) {
      const error = new Error(
        `Guest ${guest.id} failed to load: at ${guest.url}: ${
          e instanceof Error ? e.stack : String(e)
        }`
      );
      this.emit("error", { host: this, guest, error });
      return guest;
    }
    // this new guest might have new capabilities, so the identities of the
    // cached capability sets will need to change, to alert subscribers
    this.cachedCapabilityLists = new WeakMap();
    this.emit("guestload", { guest, host: this });
    return guest;
  }
  private getLoadedGuestsWith<Apis extends GuestApis>(
    capabilities: CapabilitySpec<Apis>
  ) {
    if (this.cachedCapabilityLists.has(capabilities)) {
      return this.cachedCapabilityLists.get(capabilities);
    }
    const guestsWithCapabilities = this.getLoadedGuests((guest) =>
      guest.hasCapabilities(capabilities)
    );
    this.cachedCapabilityLists.set(capabilities, guestsWithCapabilities);
    return guestsWithCapabilities;
  }
}
