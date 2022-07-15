/* eslint @typescript-eslint/no-explicit-any: "off" */
import { AsyncMethodReturns, connectToParent } from "penpal";
import { HostConnection, NamespacedApis } from "../common/types";

class GuestInFrame {
  publicMethods: NamespacedApis;
  private hostConnection!: AsyncMethodReturns<HostConnection>;
  host: NamespacedApis = this.makeNamespaceProxy([]);
  async register(apis: NamespacedApis) {
    this.publicMethods = apis;
    await this.connect();
  }
  private makeNamespaceProxy(path: string[]) {
    const handler: ProxyHandler<Record<string, any>> = {
      get: (target, prop) => {
        if (typeof prop === "string") {
          if (!Reflect.has(target, prop)) {
            const next = this.makeNamespaceProxy(path.concat(prop));
            Reflect.set(target, prop, next);
          }
          return Reflect.get(target, prop) as unknown;
        } else {
          throw new Error(
            `Cannot look up a symbol ${String(
              prop
            )} on a host connection proxy.`
          );
        }
      },
    };
    // Only trap the apply if there's at least two levels of namespace.
    // uix.host() is not a function, and neither is uix.host.bareMethod().
    if (path.length < 2) {
      return new Proxy({}, handler);
    }
    const invoker = (...args: any[]) =>
      this.hostConnection.invokeHostMethod({
        path: path.slice(0, -1),
        name: path[path.length - 1],
        args,
      });
    return new Proxy<typeof invoker>(invoker, {
      ...handler,
      apply(target, _, args: unknown[]) {
        return target(...args);
      },
    });
  }
  private async connect() {
    try {
      const connection = connectToParent<HostConnection>({
        methods: this.publicMethods,
      });
      console.debug("connection began", connection);
      this.hostConnection = await connection.promise;
      console.debug("connection established", this.hostConnection);
    } catch (e) {
      console.error("connection failed", e);
    }
  }
}

export default new GuestInFrame();
