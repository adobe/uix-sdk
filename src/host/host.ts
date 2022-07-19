import {
  Extension,
  HostEvents,
  NamespacedApis,
  RequiredMethodsByName,
  UIXHost,
  UIXGuestConnector,
  GuestConnectorMap,
} from "../common/types";
import { Emitter } from "../common/emitter";
import { GuestConnector, GuestConnectorOptions } from "./guest-connector";

export type InstalledExtensions = Record<Extension["id"], Extension["url"]>;
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

type GuestFilter = (item: UIXGuestConnector) => boolean;

const passAllGuests = () => true;

export class Host extends Emitter<HostEvents> implements UIXHost {
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
  loading = false;
  guests: GuestConnectorMap = new Map();
  private cachedCapabilityLists: WeakMap<object, UIXGuestConnector[]> =
    new WeakMap();
  private runtimeContainer: HTMLElement;
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

    // if (config.debug) {
    //   import("./debug-host")
    //     .then((debugHost) => {
    //       debugHost(this.rootName, this);
    //     })
    //     .catch((e) => {
    //       console.error(
    //         "Failed to attach debugger to UIX host %s",
    //         this.rootName,
    //         e
    //       );
    //     });
    // }
  }
  /**
   * Return all loaded guests.
   */
  getLoadedGuests(): UIXGuestConnector[];
  /**
   * Return loaded guests which satisfy the passed test function.
   */
  getLoadedGuests(filter: GuestFilter): UIXGuestConnector[];
  /**
   * Return loaded guests which expose the provided capability spec object.
   */
  getLoadedGuests<Apis extends NamespacedApis>(
    capabilities: RequiredMethodsByName<Apis>
  ): UIXGuestConnector[];
  getLoadedGuests<Apis extends NamespacedApis = never>(
    filterOrCapabilities?: RequiredMethodsByName<Apis> | GuestFilter
  ): UIXGuestConnector[] {
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
    this.loading = true;
    await Promise.all(
      Object.entries(extensions).map(([id, url]) =>
        this.loadOneGuest(id, url, options)
      )
    );
    this.loading = false;
    this.emit("loadallguests", { host: this });
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
  ): Promise<UIXGuestConnector> {
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
      this.emit("error", { host: this, guest, error });
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
