import type {
  Extension,
  GuestConnection,
  RemoteApis,
  NamedEvent,
  RequiredMethodsByName,
  Emits,
} from "@adobe/uix-core";
import { Emitter } from "@adobe/uix-core";
import { Port, PortOptions } from "./port.js";

/**
 * Dictionary of {@link Port} objects by extension ID.
 * @public
 */
export type PortMap = Map<string, GuestConnection>;

/** @public */
export type HostEvent<
  Type extends string = string,
  Detail = Record<string, unknown>
> = NamedEvent<Type, Detail & Record<string, unknown> & { host: Host }>;
type HostGuestEvent<Type extends string> = HostEvent<
  `guest${Type}`,
  { guest: GuestConnection }
>;

export type HostEventLoadAllGuests = HostEvent<
  "loadallguests",
  { failed: GuestConnection[]; loaded: GuestConnection[] }
>;

/** @public */
export type HostEvents =
  | HostGuestEvent<"beforeload">
  | HostGuestEvent<"load">
  | HostEventLoadAllGuests
  | HostEvent<"beforeunload">
  | HostEvent<"contextchange", { context: SharedContext }>
  | HostEvent<"unload">
  | HostEvent<"error", { error: Error }>;

/** @public */
export type InstalledExtensions = Record<Extension["id"], Extension["url"]>;
/** @public */
export type ExtensionsProvider = () => Promise<InstalledExtensions>;

type SharedContext = Record<string, unknown>;

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
   * Default options to use for every guest guestPort.
   *
   * If `config.debug` is true, then the guest options will have `debug: true`
   * unless `debug: false` is explicitly passed in `guestOptions`.
   */
  guestOptions?: PortOptions;
  /**
   * A read-only dictionary of values that the host will supply to all the
   * guests.
   */
  sharedContext?: SharedContext;
}

type GuestFilter = (item: GuestConnection) => boolean;

const passAllGuests = () => true;

/**
 * TODO: document Host
 * @public
 */
export class Host extends Emitter<HostEvents> {
  static containerStyle = {
    position: "fixed",
    width: "1px",
    height: "1px",
    pointerEvents: "none",
    opacity: 0,
    top: 0,
    left: "-1px",
  };
  hostName: string;
  loading = false;
  guests: PortMap = new Map();
  private debug?: Promise<boolean>;
  private cachedCapabilityLists: WeakMap<object, GuestConnection[]> =
    new WeakMap();
  private runtimeContainer: HTMLElement;
  private guestOptions: PortOptions;
  private debugLogger: Console;
  private sharedContext: SharedContext;
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
    if (process.env.NODE_ENV === "development" && config.debug) {
      this.debug = import("./debug-host.js")
        .then(({ debugHost }) => {
          debugHost(this);
          return true;
        })
        .catch((e) => {
          console.error(
            "Failed to attach debugger to UIX host %s",
            this.hostName,
            e
          );
          // noop unsubscriber
          return false;
        });
    }
  }
  /**
   * Return all loaded guests.
   */
  getLoadedGuests(): GuestConnection[];
  /**
   * Return loaded guests which satisfy the passed test function.
   */
  getLoadedGuests(filter: GuestFilter): GuestConnection[];
  /**
   * Return loaded guests which expose the provided capability spec object.
   */
  getLoadedGuests<Apis extends RemoteApis>(
    capabilities: RequiredMethodsByName<Apis>
  ): GuestConnection[];
  getLoadedGuests<Apis extends RemoteApis = never>(
    filterOrCapabilities?: RequiredMethodsByName<Apis> | GuestFilter
  ): GuestConnection[] {
    if (typeof filterOrCapabilities === "object") {
      return this.getLoadedGuestsWith<Apis>(filterOrCapabilities);
    }
    const filter = filterOrCapabilities || passAllGuests;
    return [...this.guests.values()].filter(
      (guest) => !guest.isLoading() && filter(guest)
    );
  }
  shareContext(context: SharedContext): void;
  shareContext(setter: (context: SharedContext) => SharedContext): void;
  shareContext(
    setterOrContext: ((context: SharedContext) => SharedContext) | SharedContext
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
   */
  async load(
    extensions: InstalledExtensions,
    options?: PortOptions
  ): Promise<void> {
    await this.debug;
    this.runtimeContainer =
      this.runtimeContainer || this.createRuntimeContainer(window);
    const failed: GuestConnection[] = [];
    const loaded: GuestConnection[] = [];
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
    Object.assign(container.style, Host.containerStyle);
    document.body.appendChild(container);
    return container;
  }
  private async loadOneGuest(
    id: string,
    urlString: string,
    options: PortOptions = {}
  ): Promise<GuestConnection> {
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
        debugLogger: this.debugLogger,
        sharedContext: this.sharedContext,
        events: this as Emits,
      });
      this.guests.set(id, guest);
    }
    this.emit("guestbeforeload", { guest, host: this });
    try {
      await guest.load();
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.emit("error", { host: this, guest, error });
      return guest;
    }
    // this new guest might have new capabilities, so the identities of the
    // cached capability sets will need to change, to alert subscribers
    this.cachedCapabilityLists = new WeakMap();
    this.emit("guestload", { guest, host: this });
    return guest;
  }
  private getLoadedGuestsWith<Apis extends RemoteApis>(
    capabilities: RequiredMethodsByName<Apis>
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
