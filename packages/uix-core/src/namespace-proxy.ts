/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RemoteMethodInvoker } from "./types.js";

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
  path: string[] = [],
): ProxiedApi {
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
          `Cannot look up a symbol ${String(prop)} on a host connection proxy.`,
        );
      }
    },
  };
  const target = {} as unknown as ProxiedApi;

  // Only trap the apply if there's at least two levels of namespace.
  // uix.host() is not a function, and neither is uix.host.bareMethod().
  if (path.length < 2) {
    return new Proxy<ProxiedApi>(target, handler);
  }

  const invoker = (...args: unknown[]) =>
    invoke({
      args,
      name: path[path.length - 1],
      path: path.slice(0, -1),
    });

  return new Proxy<typeof invoker>(invoker, {
    ...handler,
    apply(target, _, args: unknown[]) {
      return target(...args);
    },
  }) as unknown as typeof target;
}
