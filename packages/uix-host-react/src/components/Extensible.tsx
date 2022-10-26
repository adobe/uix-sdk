import React, { useState, useEffect, useMemo } from "react";
import type { PropsWithChildren } from "react";
import type {
  InstalledExtensions,
  ExtensionsProvider,
  HostConfig,
  PortOptions,
  SharedContextValues,
} from "@adobe/uix-host";
import { Host } from "@adobe/uix-host";
import { ExtensionContext } from "../extension-context.js";

/** @public */
export interface ExtensibleProps extends Omit<HostConfig, "hostName"> {
  /**
   * Unique name for identifying this extensible app. May be used as metadata in
   * extension registry in the future.
   */
  appName?: string;
  /**
   * Function which returns a promise for the full list of extensions.
   */
  extensionsProvider: ExtensionsProvider;
  /**
   * {@inheritDoc HostConfig.guestOptions}
   */
  guestOptions?: PortOptions;
  /**
   * {@inheritDoc HostConfig.sharedContext}
   */
  sharedContext?: SharedContextValues;
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

/**
 * Declares an extensible area in an app, and provides host and extension
 * objects to all descendents. The {@link useExtensions} hook can only be called
 * in a descendent of this component.
 *
 * @remarks
 * For many apps, there will be only one Extensible provider, fairly high in the
 * component tree. It is a context provider component that may be bundled with
 * other context providers in your app architecture.
 *
 * Each Extensible element creates one {@link @adobe/uix-host#Host} object and
 * one call to an extensions provider. If multiple Extensible elements are used,
 * this may cause redundant calls. Such a design should be carefully considered.
 *
 * @public
 */
export function Extensible({
  appName,
  children,
  extensionsProvider,
  guestOptions,
  runtimeContainer,
  debug,
  sharedContext = {},
}: PropsWithChildren<ExtensibleProps>) {
  const [extensions, setExtensions] = useState({});

  useEffect(() => {
    extensionsProvider()
      .then((loadedExtensions: InstalledExtensions) => {
        if (areExtensionsDifferent(extensions, loadedExtensions)) {
          setExtensions(loadedExtensions);
        }
      })
      .catch((e: Error | unknown) => {
        console.error("Fetching list of extensions failed!", e);
      });
  }, [extensionsProvider]);

  const hostName = appName || window.location.host || "mainframe";
  const host = useMemo(() => {
    const host = new Host({
      debug,
      hostName,
      runtimeContainer,
      sharedContext,
    });
    return host;
  }, [debug, hostName, runtimeContainer, sharedContext]);

  useEffect(() => {
    function logError(msg: string) {
      return (e: Error | unknown) => {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error(msg, error, extensions, guestOptions);
      };
    }

    if (!Object.entries(extensions).length) {
      return;
    }

    host
      .load(extensions, guestOptions)
      .catch(logError("Load of extensions failed!"));
    return () => {
      host.unload().catch(logError("Unload of extensions failed!"));
    };
  }, [host, extensions]);

  return (
    <ExtensionContext.Provider value={host}>
      {children}
    </ExtensionContext.Provider>
  );
}
export default Extensible;
