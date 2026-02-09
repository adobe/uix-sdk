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

import React, { useState, useEffect, useRef } from "react";
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
import { ExtensibleStateProvider } from "./ExtensibleState";

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
  extensionsListCallback?: (
    extensions: InstalledExtensions
  ) => InstalledExtensions;
}

function areExtensionsDifferent(
  set1: InstalledExtensions,
  set2: InstalledExtensions
) {
  const ids1 = Object.keys(set1).sort();
  const ids2 = Object.keys(set2).sort();

  if (ids1.length !== ids2.length) {
    return true;
  }

  let isDifferent = false;

  ids1.forEach((id) => {
    if (isDifferent) {
      return;
    }

    const ext1 = set1[id];
    const ext2 = set2[id];

    if (typeof ext1 !== typeof ext2) {
      isDifferent = true;
      return;
    }

    if (typeof ext1 === "string" && typeof ext2 === "string") {
      if (ext1 !== ext2) {
        isDifferent = true;
        return;
      }
    }

    if (typeof ext1 === "object" && typeof ext2 === "object") {
      if (
        ext1.url !== ext2.url ||
        JSON.stringify(ext1.extensionPoints) !==
          JSON.stringify(ext2.extensionPoints) ||
        JSON.stringify(ext1.configuration) !==
          JSON.stringify(ext2.configuration)
      ) {
        isDifferent = true;
        return;
      }
    }
  });

  return isDifferent;
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
  sharedContext,
  extensionsListCallback,
}: PropsWithChildren<ExtensibleProps>) {
  const hostName = appName || window.location.host || "mainframe";

  const [extensions, setExtensions] = useState<InstalledExtensions>({});
  const [extensionListFetched, setExtensionListFetched] =
    useState<boolean>(false);
  const prevSharedContext = useRef(JSON.stringify(sharedContext));
  useEffect(() => {
    extensionsProvider()
      .then((loaded: InstalledExtensions) => {
        setExtensions((prev) => {
          let newExtensions = loaded;

          if (extensionsListCallback && loaded) {
            newExtensions = extensionsListCallback(newExtensions);
          }

          const shouldUpdate = areExtensionsDifferent(prev, newExtensions);

          if (shouldUpdate) {
            return newExtensions;
          } else {
            return prev;
          }
        });
      })
      .catch((e: Error | unknown) => {
        console.error("Fetching list of extensions failed!", e);
      })
      .finally(() => {
        setExtensionListFetched(true);
      });
  }, [extensionsProvider, extensionsListCallback]);

  const [host, setHost] = useState<Host>();
  useEffect(() => {
    function logError(msg: string) {
      return (e: Error | unknown) => {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error(msg, error, extensions, guestOptions);
      };
    }

    if (!extensions || !Object.keys(extensions).length) {
      return;
    }

    const loadExtensions = (hostInstance: Host) => {
      hostInstance
        .load(extensions, guestOptions)
        .catch(logError("Load of extensions failed!"));
    };

    const sharedContextChanged =
      prevSharedContext.current !== JSON.stringify(sharedContext);

    if (sharedContextChanged) {
      prevSharedContext.current = JSON.stringify(sharedContext);
    }
    if (!host || sharedContextChanged) {
      const newHost = new Host({
        debug,
        hostName,
        runtimeContainer,
        sharedContext,
      });
      setHost(newHost);
      loadExtensions(newHost);
    } else {
      loadExtensions(host);
    }
  }, [debug, hostName, runtimeContainer, extensions]);

  // skip render before host is initialized
  if (!host) {
    return <>{children}</>;
  }

  return (
    <ExtensionContext.Provider
      value={{
        host: host,
        extensionListFetched: extensionListFetched,
      }}
    >
      <ExtensibleStateProvider>{children}</ExtensibleStateProvider>
    </ExtensionContext.Provider>
  );
}
export default Extensible;
