import {
  Extension,
  NamespacedApis,
  RequiredMethodsByName,
} from "../common/types";
// import { DataSource } from "./api-types/data-source";
import { GuestConnector } from "./guest-connector";

export type InstalledExtensions = Record<Extension["id"], Extension["url"]>;

type GuestMap = Record<string, GuestConnector>;

type HostEvent = "loadguest" | "loadallguests";

export interface HostEvents extends Record<HostEvent, CustomEvent> {
  loadguest: CustomEvent<{ guest: GuestConnector; host: Host }>;
  loadallguests: CustomEvent<{ host: Host }>;
}

type Unsubscriber = () => void;

type Handler<T extends HostEvent> = (event: HostEvents[T]) => void;

type SubscribeMethod<T extends HostEvent> = (
  handler: Handler<T>
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
}

type GuestFilter = (item: GuestConnector) => boolean;

const passAllGuests = (_: GuestConnector) => true;

const containerStyle = {
  position: "fixed",
  width: "1px",
  height: "1px",
  pointerEvents: "none",
  opacity: 0,
  top: 0,
  left: "-1px",
};

function createRuntimeContainer(rootName: string) {
  const { document } = window;
  const container = document.createElement("div");
  container.setAttribute("data-uix-guest-container", rootName);
  Object.assign(container.style, containerStyle);
  document.body.appendChild(container);
  return container;
}

function createSubscribeMethod<T extends HostEvent>(
  instance: Host,
  name: T
): SubscribeMethod<typeof name> {
  return (handler) => {
    instance.addEventListener(name, handler);
    return () => {
      instance.removeEventListener(name, handler);
    };
  };
}

export class Host extends EventTarget {
  rootName: string;
  private runtimeContainer: HTMLElement;
  guests: GuestMap;
  onLoadGuest: SubscribeMethod<"loadguest">;
  onLoadAllGuests: SubscribeMethod<"loadallguests">;
  cachedCapabilityLists: WeakMap<object, GuestConnector[]> = new WeakMap();
  constructor(config: HostConfig) {
    super();
    this.getLoadedGuests = this.getLoadedGuests.bind(this);
    this.onLoadGuest = createSubscribeMethod<"loadguest">(this, "loadguest");
    this.onLoadAllGuests = createSubscribeMethod<"loadallguests">(
      this,
      "loadallguests"
    );
    this.rootName = config.rootName;
    this.runtimeContainer =
      config.runtimeContainer || createRuntimeContainer(config.rootName);
    this.guests = {};
  }
  private emit(
    type: keyof HostEvents,
    detail: HostEvents[typeof type]["detail"]
  ) {
    const event = new CustomEvent<typeof detail>(type, { detail });
    this.dispatchEvent(event);
  }
  private async loadOne<T>(
    id: string,
    urlString: string
  ): Promise<GuestConnector> {
    let guest = this.guests[id];
    if (!guest) {
      const url = new URL(urlString);
      guest = new GuestConnector(this.rootName, id, url, this.runtimeContainer);
      this.guests[id] = guest;
    }
    await guest.load();
    // this new guest might have new capabilities, so the identities of the
    // cached capability sets will need to change, to alert subscribers
    this.cachedCapabilityLists = new WeakMap();
    this.emit("loadguest", { guest, host: this });
    return guest;
  }
  async loadAll(extensions: InstalledExtensions): Promise<void> {
    await Promise.all(
      Object.entries(extensions).map(([id, url]) => this.loadOne(id, url))
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
    return Object.values(this.guests).filter(
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
