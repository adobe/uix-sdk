import {
  RequiredMethodsByName,
  NamespacedApis,
  HostMethodAddress,
  ApiMethod,
} from "../common/types";
import { Connection, connectToChild } from "penpal";

export class GuestConnector {
  owner: string;
  id: string;
  url: URL;
  frame: HTMLIFrameElement;
  connection: Connection<NamespacedApis>;
  apis: NamespacedApis;
  private hostApis: NamespacedApis = {};
  // private guestConnection: GuestConnection;
  constructor(
    owner: string,
    id: string,
    url: URL,
    runtimeContainer: HTMLElement
  ) {
    const self: typeof this = this;
    this.id = id;
    this.owner = owner;
    this.url = url;
    this.frame = runtimeContainer.ownerDocument.createElement("iframe");
    this.frame.setAttribute("src", url.href);
    this.frame.setAttribute("data-uix-guest", "true");
    runtimeContainer.appendChild(this.frame);
    this.connection = connectToChild({
      iframe: this.frame,
      debug: true,
      timeout: 10000,
      methods: {
        invokeHostMethod({ name, path, args = [] }: HostMethodAddress) {
          self.assert(
            name && typeof name === "string",
            () => "Method name required"
          );
          self.assert(
            path.length > 0,
            () =>
              `Cannot call a method directly on the host; ".${name}()" must be in a namespace.`
          );
          const dots = (level: number) => `uix.host.${path.slice(0, level).join(".")}`;
          const methodCallee = path.reduce((current, prop, level) => {
            self.assert(
              Reflect.has(current, prop),
              () => `${dots(level)} has no property "${prop}"`
            );
            const next = current[prop];
            self.assert(
              typeof next === "object",
              () =>
                `${dots(
                  level
                )}.${prop} is not an object; namespaces must be objects with methods`
            );
            return next as NamespacedApis;
          }, self.hostApis);
          self.assert(
            typeof methodCallee[name] === "function" &&
              Reflect.has(methodCallee, name),
            () => `"${dots(path.length - 1)}.${name}" is not a function`
          );
          const method = methodCallee[name] as unknown as ApiMethod;
          return method.apply(methodCallee, [
            { id: self.id, url: self.url },
            ...args,
          ]);
        },
      },
    });
  }
  isLoaded() {
    return !!this.apis;
  }
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
  private assertLoaded() {
    this.assert(this.isLoaded(), () => "Attempted to interact before loaded");
  }
  hasCapabilities<Apis extends NamespacedApis>(
    requiredMethods: RequiredMethodsByName<Apis>
  ) {
    this.assertLoaded();
    return Object.keys(requiredMethods).every((key: string) => {
      if (!this.apis.hasOwnProperty(key)) {
        return false;
      }
      const api = this.apis[key];
      const methodList = requiredMethods[key];
      return methodList.every(
        (methodName: string) =>
          api.hasOwnProperty(methodName) &&
          typeof api[methodName] === "function"
      );
    });
  }
  private async connect() {
    this.apis = (await this.connection.promise) as unknown as NamespacedApis;
    // const guest = (await this.connection.promise) as unknown as NamespacedApis;
    // const { __uix_internal__, ...apis } = guest;
    // this.apis = apis;
    // this.guestConnection = __uix_internal__ as unknown as GuestConnection;
  }
  async load() {
    try {
      if (!this.apis) {
        await this.connect();
      }
    } catch (e) {
      this.apis = null;
      console.error(`GuestConnector for ${this.id} could not load:`, e);
    }
    return this.apis;
  }
  provide(apis: NamespacedApis) {
    Object.assign(this.hostApis, apis);
    // const spec = Object.entries(apis).reduce(
    //   (out, [ns, methods]) => ({
    //     ...out,
    //     [ns]: Object.keys(methods),
    //   }),
    //   {}
    // );
    // return this.guestConnection.updateHostMethods(spec);
  }
}
