/* eslint-disable @typescript-eslint/no-explicit-any */
import { RemoteMethodInvoker } from "./types";

export function makeNamespaceProxy(
  invoke: RemoteMethodInvoker<unknown>,
  path: string[] = []
) {
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
  // Only trap the apply if there's at least two levels of namespace.
  // uix.host() is not a function, and neither is uix.host.bareMethod().
  if (path.length < 2) {
    return new Proxy({}, handler);
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
  });
}
