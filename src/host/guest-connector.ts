import { RequiredMethodsByName, NamespacedApis } from "../common/types";
import { Connection, connectToChild } from "penpal";
export class GuestConnector {
  owner: string;
  id: string;
  url: URL;
  frame: HTMLIFrameElement;
  connection: Connection<NamespacedApis>;
  interfaces: NamespacedApis;
  tags: Set<string> = new Set();
  constructor(
    owner: string,
    id: string,
    url: URL,
    runtimeContainer: HTMLElement
  ) {
    const self = this;
    this.id = id;
    this.owner = owner;
    this.url = url;
    this.frame = runtimeContainer.ownerDocument.createElement("iframe");
    this.frame.setAttribute("src", url.href);
    this.frame.setAttribute("data-uix-guest", "true");
    runtimeContainer.appendChild(this.frame);
    this.connection = connectToChild({
      iframe: this.frame,
      methods: {
        invokeHostCallback(...args: any[]) {
          console.log("invokeHostCallback", ...args);
        },
        tag(tagStr: string) {
          self.tags.add(tagStr);
        },
      },
    });
  }
  private assertLoaded() {
    if (!this.interfaces) {
      throw new Error("Not loaded interfaces yet.");
    }
  }
  provides<Apis extends NamespacedApis>(
    requiredMethods: RequiredMethodsByName<Apis>
  ) {
    this.assertLoaded();
    return Object.keys(requiredMethods).every((key) => {
      if (!this.interfaces.hasOwnProperty(key)) {
        return false;
      }
      const api = this.interfaces[key];
      const methodList = requiredMethods[key as keyof NamespacedApis];
      return methodList.every(
        (methodName: string) =>
          api.hasOwnProperty(methodName) &&
          typeof api[methodName] === "function"
      );
    });
  }
  hasTag(tag: string) {
    this.assertLoaded();
    return this.tags.size === 0 || this.tags.has(tag);
  }
  async load() {
    this.interfaces =
      this.interfaces ||
      ((await this.connection.promise) as unknown as NamespacedApis);
    return this.interfaces;
  }
}
