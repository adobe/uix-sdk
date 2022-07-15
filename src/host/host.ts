declare global {
  interface Window {
    __UIX_HOST?: Host;
  }
}

import {
  Extension,
  NamespacedApis,
  RequiredMethodsByName,
} from "../common/types";
import { customConsole } from "../common/debuglog";
import { GuestConnector, GuestConnectorOptions } from "./guest-connector";

export type InstalledExtensions = Record<Extension["id"], Extension["url"]>;

type GuestMap = Map<string, GuestConnector>;

type BaseEvt<Type, Detail = Record<string, unknown>> = CustomEvent<
  { host: Host } & Detail
> & {
  readonly type: Type;
};
type GuestEvt<Type extends string, Detail = Record<string, unknown>> = BaseEvt<
  `guest${Type}`,
  {
    guest: GuestConnector;
  } & Detail
>;

type GuestBeforeLoadEvt = GuestEvt<"beforeload">;
type GuestLoadEvt = GuestEvt<"load">;
type LoadAllGuestsEvent = BaseEvt<"loadallguests">;
type GuestErrorEvent = GuestEvt<"error", { error: Error }>;

interface HostEventMap {
  guestbeforeload: GuestBeforeLoadEvt;
  guesterror: GuestErrorEvent;
  guestload: GuestLoadEvt;
  loadallguests: LoadAllGuestsEvent;
}

type Unsubscriber = () => void;

export interface HostConfig {
  /**
   * Human-readable "slug" name of the extensible area--often an entire app.
   * This string serves as a namespace for extension points within the area.
   */
  rootName: string;
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
   * Default options to use for every guest connector.
   *
   * If `config.debug` is true, then the guest options will have `debug: true`
   * unless `debug: false` is explicitly passed in `guestOptions`.
   */
  guestOptions?: GuestConnectorOptions;
}

type GuestFilter = (item: GuestConnector) => boolean;

const passAllGuests = () => true;

export class Host extends EventTarget {
  static containerStyle = {
    position: "fixed",
    width: "1px",
    height: "1px",
    pointerEvents: "none",
    opacity: 0,
    top: 0,
    left: "-1px",
  };
  rootName: string;
  isLoading = false;
  private cachedCapabilityLists: WeakMap<object, GuestConnector[]> =
    new WeakMap();
  private runtimeContainer: HTMLElement;
  private guests: GuestMap = new Map();
  private guestOptions: GuestConnectorOptions;
  private debugLogger: Console;
  constructor(config: HostConfig) {
    super();
    const { guestOptions = {} } = config;
    this.guestOptions = {
      ...guestOptions,
      debug: guestOptions.debug === false ? false : !!config.debug,
    };
    this.rootName = config.rootName;
    this.runtimeContainer =
      config.runtimeContainer || this.createRuntimeContainer(window);

    if (config.debug) {
      window.__UIX_HOST = this;
      this.debugLogger = customConsole("yellow", "Host", this.rootName);
      this.addEventListener("guestbeforeload", (e: GuestBeforeLoadEvt) => {
        this.debugLogger.info('Loading guest "%s"', e.detail.guest);
      });
      this.addEventListener("guestload", (e: GuestLoadEvt) => {
        this.debugLogger.info('Guest "%s" loaded', e.detail.guest);
      });
      this.addEventListener("guesterror", (e: GuestErrorEvent) => {
        this.debugLogger.error(
          `Guest "%s" failed to load: ${e.detail.error.message}`,
          e
        );
      });
      this.addEventListener("loadallguests", (e: LoadAllGuestsEvent) => {
        this.debugLogger.info(
          "All %d guests loaded",
          this.guests.size,
          e.detail.host
        );
      });
    }
  }
  addEventListener<E extends keyof HostEventMap>(
    type: E,
    listener: (ev: HostEventMap[E]) => unknown
  ): Unsubscriber {
    super.addEventListener(type, listener);
    return () => super.removeEventListener(type, listener);
  }
  /**
   * Return all loaded guests.
   */
  getLoadedGuests(): GuestConnector[];
  /**
   * Return loaded guests which satisfy the passed test function.
   */
  getLoadedGuests(filter: GuestFilter): GuestConnector[];
  /**
   * Return loaded guests which expose the provided capability spec object.
   */
  getLoadedGuests<Apis extends NamespacedApis>(
    capabilities: RequiredMethodsByName<Apis>
  ): GuestConnector[];
  getLoadedGuests<Apis extends NamespacedApis = never>(
    filterOrCapabilities?: RequiredMethodsByName<Apis> | GuestFilter
  ): GuestConnector[] {
    if (typeof filterOrCapabilities === "object") {
      return this.getLoadedGuestsWith<Apis>(filterOrCapabilities);
    }
    const filter = filterOrCapabilities || passAllGuests;
    return [...this.guests.values()].filter(
      (guest) => !guest.isLoading() && filter(guest)
    );
  }
  /**
   * Load extension into host application from provided extension description.
   * Returned promise resolves when all extensions are loaded and registered.
   */
  async load(
    extensions: InstalledExtensions,
    options?: GuestConnectorOptions
  ): Promise<void> {
    this.isLoading = true;
    await Promise.all(
      Object.entries(extensions).map(([id, url]) =>
        this.loadOneGuest(id, url, options)
      )
    );
    this.isLoading = false;
    this.emit("loadallguests", { host: this });
  }
  private emit<E extends keyof HostEventMap>(
    type: keyof HostEventMap,
    detail: HostEventMap[E]["detail"]
  ) {
    const event = new CustomEvent<typeof detail>(type, { detail });
    this.dispatchEvent(event);
  }
  private createRuntimeContainer(window: Window) {
    const { document } = window;
    const container = document.createElement("div");
    container.setAttribute("data-uix-guest-container", this.rootName);
    Object.assign(container.style, Host.containerStyle);
    document.body.appendChild(container);
    return container;
  }
  private async loadOneGuest(
    id: string,
    urlString: string,
    options: GuestConnectorOptions = {}
  ): Promise<GuestConnector> {
    let guest = this.guests.get(id);
    if (!guest) {
      const url = new URL(urlString);
      guest = new GuestConnector({
        owner: this.rootName,
        id,
        url,
        runtimeContainer: this.runtimeContainer,
        options: {
          ...this.guestOptions,
          ...options,
        },
        debugLogger: this.debugLogger,
      });
      this.guests.set(id, guest);
    }
    this.emit("guestbeforeload", { guest, host: this });
    try {
      await guest.load();
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.emit("guesterror", { host: this, guest, error });
    }
    // this new guest might have new capabilities, so the identities of the
    // cached capability sets will need to change, to alert subscribers
    this.cachedCapabilityLists = new WeakMap();
    this.emit("guestload", { guest, host: this });
    return guest;
  }
  private getLoadedGuestsWith<Apis extends NamespacedApis>(
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
