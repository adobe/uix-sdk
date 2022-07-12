import { AsyncMethodReturns, connectToParent, Methods } from "penpal";
import { HostConnection, NamespacedApis } from "../common/types";

type AreaId = string;
type ApisByType = Record<string, Methods>;

interface ApisByArea extends Methods {
  [k: AreaId]: ApisByType;
}

class GuestInFrame {
  publicMethods: ApisByArea;
  private hostConnection!: AsyncMethodReturns<HostConnection>;
  host: NamespacedApis = this.makeNamespaceProxy();
  async register(apis: ApisByArea) {
    this.publicMethods = apis;
    await this.connect();
  }
  private makeNamespaceProxy(path: string[] = []) {
    const self = this;
    const handler: ProxyHandler<Record<string, any>> = {
      get(target, prop) {
        if (typeof prop === "string" && !Reflect.has(target, prop)) {
          const next = self.makeNamespaceProxy(path.concat(prop));
          Reflect.set(target, prop, next);
        }
        return Reflect.get(target, prop);
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
      apply(target, _, args) {
        return target(...args);
      },
    });
  }
  private async connect() {
    try {
      const connection = await connectToParent<HostConnection>({
        methods: this.publicMethods,
        // methods: {
        //   ...this.publicMethods,
        //   __uix_internal__: {
        //     updateHostMethods<T extends NamespacedApis>(
        //       namespaces: RequiredMethodsByName<T>
        //     ) {
        //       for (const [namespace, methodNames] of Object.entries(
        //         namespaces
        //       )) {
        //         host[namespace] = host[namespace] || {};
        //         for (const methodName of methodNames) {
        //           host[namespace][methodName] = (...args) =>
        //             self.hostConnection.invokeHostMethod({
        //               namespace,
        //               methodName,
        //               args,
        //             });
        //         }
        //       }
        //     },
        //   },
        // },
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
