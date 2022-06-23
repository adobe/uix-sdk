import { DataSource } from "./api-types/data-source";
import { GuestConnector } from "./guest-connector";

export interface Extension {
  id: string;
  url: URL;
}

export type InstalledExtensions = Record<string, string>;

export interface ExtensionPointApi {
  apiType: string;
}

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
  container.setAttribute("data-is-uix-guest-container", rootName);
  Object.assign(container.style, containerStyle);
  document.body.appendChild(container);
  return container;
}

export class Host {
  cacheKey: number;
  rootName: string;
  #runtimeContainer: HTMLElement;
  guests: Record<string, GuestConnector>;
  constructor(config: HostConfig) {
    this.rootName = config.rootName;
    this.#runtimeContainer =
      config.runtimeContainer || createRuntimeContainer(config.rootName);
    this.cacheKey = new Date().getTime();
    this.guests = {};
  }
  async #loadOne<T>(id: string, urlString: string): Promise<void> {
    const url = new URL(urlString);
    const guest = new GuestConnector(
      this.rootName,
      id,
      url,
      this.#runtimeContainer
    );
    this.guests[id] = guest;
    await guest.load();
    this.cacheKey = new Date().getTime();
  }
  async load(extensions: InstalledExtensions): Promise<void> {
    await Promise.all(
      Object.entries(extensions).map(([id, url]) => this.#loadOne(id, url))
    );
  }
  getDataSources<Request, ResultItem>({
    blockId,
  }: {
    blockId: string;
  }): DataSource<Request, ResultItem>[] {
    return [];
  }
}
