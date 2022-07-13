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
// import { DataSource } from "./api-types/data-source";
import { GuestConnector, GuestConnectorOptions } from "./guest-connector";

export type InstalledExtensions = Record<Extension["id"], Extension["url"]>;

type GuestMap = Map<string, GuestConnector>;

type BeforeLoadGuestEvent = CustomEvent<{
  guest: GuestConnector;
  host: Host;
}> & {
  readonly type: "beforeloadguest";
};
type LoadGuestEvent = CustomEvent<{ guest: GuestConnector; host: Host }> & {
  readonly type: "loadguest";
};
type LoadAllGuestsEvent = CustomEvent<{ host: Host }> & {
  readonly type: "loadallguests";
};
type HostEvent = BeforeLoadGuestEvent | LoadGuestEvent | LoadAllGuestsEvent;

type Unsubscriber = () => void;

type SubscribeMethod<T extends HostEvent = HostEvent> = (
  handler: (event: T) => void
) => Unsubscriber;

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

const passAllGuests = (_: GuestConnector) => true;

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
  private runtimeContainer: HTMLElement;
  private guests: GuestMap = new Map();
  onLoadGuest: SubscribeMethod<LoadGuestEvent>;
  onLoadAllGuests: SubscribeMethod<LoadAllGuestsEvent>;
  cachedCapabilityLists: WeakMap<object, GuestConnector[]> = new WeakMap();
  private guestOptions: GuestConnectorOptions;
  private debugLogger: Console;
  constructor(config: HostConfig) {
    super();
    this.getLoadedGuests = this.getLoadedGuests.bind(this);
    this.onLoadGuest = this.createSubscribeMethod<LoadGuestEvent>("loadguest");
    this.onLoadAllGuests =
      this.createSubscribeMethod<LoadAllGuestsEvent>("loadallguests");
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
      this.addEventListener("beforeloadguest", (e: BeforeLoadGuestEvent) => {
        this.debugLogger.info('Loading guest "%s"', e.detail.guest);
      });
      this.addEventListener("loadguest", (e: LoadGuestEvent) => {
        this.debugLogger.info('Guest "%s" loaded', e.detail.guest);
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
  private emit<T extends HostEvent = HostEvent>(
    type: T["type"],
    detail: T["detail"]
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
  private createSubscribeMethod<T extends HostEvent>(
    type: T["type"]
  ): SubscribeMethod<T> {
    return (handler) => {
      this.addEventListener(type, handler);
      return () => {
        this.removeEventListener(type, handler);
      };
    };
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
    this.emit("beforeloadguest", { guest, host: this });
    await guest.load();
    // this new guest might have new capabilities, so the identities of the
    // cached capability sets will need to change, to alert subscribers
    this.cachedCapabilityLists = new WeakMap();
    this.emit("loadguest", { guest, host: this });
    return guest;
  }
  async loadAllGuests(
    extensions: InstalledExtensions,
    options?: GuestConnectorOptions
  ): Promise<void> {
    await Promise.all(
      Object.entries(extensions).map(([id, url]) =>
        this.loadOneGuest(id, url, options)
      )
    );
    this.emit("loadallguests", { host: this });
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
      (guest) => guest.isLoaded() && filter(guest)
    );
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
