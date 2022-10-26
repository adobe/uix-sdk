/* eslint-disable @typescript-eslint/no-explicit-any */
import { RemoteHostApis, RemoteMethodInvoker } from "./types.js";

/**
 * Build a fake object that turns "method calls" into RPC messages
 * The resulting object will recursively make more fake proxies on demand until
 * one of the looked-up properties is invoked as a function.
 * Then it will call the passed `invoke` method with a {@link HostMethodAddress}
 * that can send the method invocation as an RPC message to another realm.
 *
 * @example
 * ```js
 * const invoker = (methodAddress) => console.log(
 *   address.path,
 *   address.name,
 *   address.args
 * );
 * const ns = makeNamespaceProxy(invoker);
 *
 * // looking up any property on the object will work
 *
 * ns.example.builds.method.call.message("foo", 1);
 *
 * // Console will log:
 * ['example','builds','method','call']
 * 'message'
 * ["foo", 1]
 *```
 * @internal
 *
 * @param invoke - Callback that receives address
 */
export function makeNamespaceProxy<ProxiedApi extends object>(
  invoke: RemoteMethodInvoker<unknown>,
  path: string[] = []
): RemoteHostApis<ProxiedApi> {
  const handler: ProxyHandler<Record<string, any>> = {
    get: (target, prop) => {
      if (typeof prop === "string") {
        if (!Reflect.has(target, prop)) {
          const next = makeNamespaceProxy(invoke, path.concat(prop));
          Reflect.set(target, prop, next);
        }
        return Reflect.get(target, prop) as unknown;
      } else {
        throw new Error(
          `Cannot look up a symbol ${String(prop)} on a host connection proxy.`
        );
      }
    },
  };
  const target = {} as unknown as RemoteHostApis<ProxiedApi>;
  // Only trap the apply if there's at least two levels of namespace.
  // uix.host() is not a function, and neither is uix.host.bareMethod().
  if (path.length < 2) {
    return new Proxy<RemoteHostApis<ProxiedApi>>(target, handler);
  }
  const invoker = (...args: unknown[]) =>
    invoke({
      path: path.slice(0, -1),
      name: path[path.length - 1],
      args,
    });
  return new Proxy<typeof invoker>(invoker, {
    ...handler,
    apply(target, _, args: unknown[]) {
      return target(...args);
    },
  }) as unknown as typeof target;
}
