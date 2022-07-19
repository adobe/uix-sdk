import React, { useEffect, useMemo, useRef } from "react";
import type { PropsWithChildren } from "react";
import type {
  InstalledExtensions,
  HostConfig,
  GuestConnectorOptions,
} from "../../host";
import { Host } from "../../host";
import { ExtensionContext } from "../extension-context";

interface ExtensionProviderProps extends HostConfig {
  extensions: InstalledExtensions;
  guestOptions?: GuestConnectorOptions;
}

function areExtensionsDifferent(
  set1: InstalledExtensions,
  set2: InstalledExtensions
) {
  const ids1 = Object.keys(set1).sort();
  const ids2 = Object.keys(set2).sort();
  return (
    ids1.length !== ids2.length || ids1.some((id, index) => id !== ids2[index])
  );
}

export function Extensible({
  children,
  extensions,
  guestOptions,
  rootName,
  runtimeContainer,
  debug,
}: PropsWithChildren<ExtensionProviderProps>) {
  const installedRef = useRef<InstalledExtensions>();
  if (
    !installedRef.current ||
    areExtensionsDifferent(installedRef.current, extensions)
  ) {
    installedRef.current = extensions;
  }

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
        console.error(msg, error, installedRef.current, guestOptions);
      };
    }
    host
      .load(installedRef.current, guestOptions)
      .catch(logError("Load of extensions failed!"));
    return () => {
      host.unload().catch(logError("Unload of extensions failed!"));
    };
  }, [host, installedRef.current]);

  return (
    <ExtensionContext.Provider value={host}>
      {children}
    </ExtensionContext.Provider>
  );
}
export default Extensible;
