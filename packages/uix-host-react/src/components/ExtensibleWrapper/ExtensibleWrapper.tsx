/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import type { PropsWithChildren, ReactElement } from "react";
import React, { useMemo } from "react";
import type {
  combineExtensionsFromProviders,
  ExtensionsProvider,
  HostConfig,
  type InstalledExtensions,
  mutedProvider,
  PortOptions,
  SharedContextValues,
} from "@adobe/uix-host";
import { Extensible } from "../Extensible";
import type {
  ExtensionPointId,
  ExtensionProviderConfig,
} from "./ExtensionManagerProvider";
import { createExtensionManagerExtensionsProvider } from "./ExtensionManagerProvider";
import { createUrlExtensionsProvider } from "./UrlExtensionProvider";

/** @public */
export interface ExtensibleDefaultProps extends Omit<HostConfig, "hostName"> {
  /**
   * Unique name for identifying this extensible app. May be used as metadata in
   * extension registry in the future.
   */
  appName?: string;
  /**
   * {@inheritDoc HostConfig.guestOptions}
   */
  guestOptions?: PortOptions;
  /**
   * {@inheritDoc HostConfig.sharedContext}
   */
  sharedContext?: SharedContextValues;
  queryString?: string;
  service: string;
  extensionPoint: string;
  version: string;
  disableExtensionManager?: boolean;
  authConfig: {
    imsToken: string;
    imsOrg: string;
    apiKey: string;
  };
  scope?: Record<string, string>;
  experienceShellEnvironment?: "prod" | "stage";
  extensionsListCallback?: (
    extensions: InstalledExtensions,
  ) => InstalledExtensions;
}

export const ExtensibleWrapper = ({
  appName,
  children,
  guestOptions,
  runtimeContainer,
  debug,
  sharedContext,
  experienceShellEnvironment,
  queryString,
  service,
  extensionPoint,
  version,
  disableExtensionManager,
  authConfig,
  scope,
  extensionsListCallback,
}: PropsWithChildren<ExtensibleDefaultProps>): ReactElement => {
  const defaultExtensionsProvider = useMemo(() => {
    const extensionPointId: ExtensionPointId = {
      name: extensionPoint,
      service,
      version,
    };
    const params: URLSearchParams = new URLSearchParams(queryString ?? "");
    const extensionManagerUrlOverride = params.get("em");
    const appRegistryUrlOverride = params.get("er");
    const urlExtensionsProvider: ExtensionsProvider =
      createUrlExtensionsProvider(extensionPointId, queryString);
    const providerConfig: ExtensionProviderConfig = {
      disableExtensionManager,
    };

    if (extensionManagerUrlOverride) {
      providerConfig.extensionManagerUrl = extensionManagerUrlOverride;
    }

    if (appRegistryUrlOverride) {
      providerConfig.appRegistryUrl = appRegistryUrlOverride;
    }

    const extensionManagerExtensionsProvider: ExtensionsProvider =
      createExtensionManagerExtensionsProvider(
        {
          experienceShellEnvironment,
          scope,
        },
        authConfig,
        providerConfig,
        extensionPointId,
      );

    const extenstions = combineExtensionsFromProviders(
      urlExtensionsProvider,
      mutedProvider(extensionManagerExtensionsProvider),
    );

    return extenstions;
  }, [
    experienceShellEnvironment,
    queryString,
    service,
    extensionPoint,
    version,
    disableExtensionManager,
    authConfig,
    scope,
  ]);

  return (
    <Extensible
      extensionsProvider={defaultExtensionsProvider}
      appName={appName}
      runtimeContainer={runtimeContainer}
      debug={debug}
      guestOptions={guestOptions}
      sharedContext={sharedContext}
      extensionsListCallback={extensionsListCallback}
    >
      {children}
    </Extensible>
  );
};
