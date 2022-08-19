import React, { useEffect, useMemo } from "react";
import type { PropsWithChildren } from "react";
import type {
  InstalledExtensions,
  HostConfig,
  PortOptions,
} from "@adobe/uix-host";
import {Host} from "@adobe/uix-host";
import { ExtensionContext } from "../extension-context.js";

/** @public */
export interface ExtensionProviderProps extends HostConfig {
  extensionLoader: () => Promise<InstalledExtensions>;
  guestOptions?: PortOptions;
}

/**
 * TODO: Document Extensible.tsx
 * @public
 */
export function Extensible({
  children,
  extensionLoader,
  guestOptions,
  rootName,
  runtimeContainer,
  debug,
}: PropsWithChildren<ExtensionProviderProps>) {
  const host = useMemo(() => {
    const host = new Host({
      debug,
      rootName,
      runtimeContainer,
    });
    return host;
  }, [rootName, runtimeContainer]);

  useEffect(() => {
    function logError(msg: string) {
      return (e: Error | unknown) => {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error(msg, error, guestOptions);
      };
    }

    async function load() {
      return host.load(await extensionLoader(), guestOptions)
    }

    load().catch(logError("Load of extensions failed!"));

    return () => {
      host.unload().catch(logError("Unload of extensions failed!"));
    };
  }, [host, extensionLoader]);

  return (
    <ExtensionContext.Provider value={host}>
      {children}
    </ExtensionContext.Provider>
  );
}
export default Extensible;
