import {
  Extension,
  HostEvents,
  NamespacedApis,
  RequiredMethodsByName,
  UIXHost,
  UIXPort,
  PortMap,
} from "../common/types";
import { Emitter } from "../common/emitter";
import { Port, PortOptions } from "./guest-link";

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
   * Default options to use for every guest guestPort.
   *
   * If `config.debug` is true, then the guest options will have `debug: true`
   * unless `debug: false` is explicitly passed in `guestOptions`.
   */
  guestOptions?: PortOptions;
}

type GuestFilter = (item: UIXPort) => boolean;

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
  guests: PortMap = new Map();
  private debug?: Promise<boolean>;
  private cachedCapabilityLists: WeakMap<object, UIXPort[]> = new WeakMap();
  private runtimeContainer: HTMLElement;
  private guestOptions: PortOptions;
  private debugLogger: Console;
  constructor(config: HostConfig) {
    super(config.rootName);
    const { guestOptions = {} } = config;
    this.guestOptions = {
      ...guestOptions,
      debug: guestOptions.debug === false ? false : !!config.debug,
    };
    this.rootName = config.rootName;
    this.runtimeContainer = config.runtimeContainer;
    if (config.debug) {
      this.debug = import("./debug-host")
        .then(({ debugHost }) => {
          debugHost(this);
          return true;
        })
        .catch((e) => {
          console.error(
            "Failed to attach debugger to UIX host %s",
            this.rootName,
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
  getLoadedGuests(): UIXPort[];
  /**
   * Return loaded guests which satisfy the passed test function.
   */
  getLoadedGuests(filter: GuestFilter): UIXPort[];
  /**
   * Return loaded guests which expose the provided capability spec object.
   */
  getLoadedGuests<Apis extends NamespacedApis>(
    capabilities: RequiredMethodsByName<Apis>
  ): UIXPort[];
  getLoadedGuests<Apis extends NamespacedApis = never>(
    filterOrCapabilities?: RequiredMethodsByName<Apis> | GuestFilter
  ): UIXPort[] {
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
    options?: PortOptions
  ): Promise<void> {
    await this.debug;
    this.runtimeContainer =
      this.runtimeContainer || this.createRuntimeContainer(window);
    this.loading = true;
    await Promise.all(
      Object.entries(extensions).map(([id, url]) =>
        this.loadOneGuest(id, url, options)
      )
    );
    this.loading = false;
    this.emit("loadallguests", { host: this });
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
    container.setAttribute("data-uix-guest-container", this.rootName);
    Object.assign(container.style, Host.containerStyle);
    document.body.appendChild(container);
    return container;
  }
  private async loadOneGuest(
    id: string,
    urlString: string,
    options: PortOptions = {}
  ): Promise<UIXPort> {
    let guest = this.guests.get(id);
    if (!guest) {
      const url = new URL(urlString);
      guest = new Port({
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
