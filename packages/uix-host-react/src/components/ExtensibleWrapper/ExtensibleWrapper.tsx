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
import { Extensible } from "../Extensible";
import {
  combineExtensionsFromProviders,
  mutedProvider,
  type ExtensionsProvider,
  type HostConfig,
  type PortOptions,
  type SharedContextValues,
} from "@adobe/uix-host";
import {
  ExtensionPointId,
  ExtensionProviderConfig,
  createExtensionManagerExtensionsProvider,
} from "./ExtensionManagerProvider";
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
  /**
   * {@inheritDoc HostConfig.debug}
   */
  debug?: boolean;
  /**
   * {@inheritDoc HostConfig.disableMetrics}
   */
  disableMetrics?: boolean;
  /**
   * {@inheritDoc HostConfig.runtimeContainer}
   */
  runtimeContainer?: HTMLElement;
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
  scope?: Record<string, any>;
  experienceShellEnvironment?: "prod" | "stage";
}

export const ExtensibleWrapper = ({
  appName,
  children,
  guestOptions,
  runtimeContainer,
  debug,
  sharedContext,
  disableMetrics,
  experienceShellEnvironment,
  queryString,
  service,
  extensionPoint,
  version,
  disableExtensionManager,
  authConfig,
  scope,
}: PropsWithChildren<ExtensibleDefaultProps>): ReactElement => {
  const defaultExtensionsProvider = useMemo(() => {
    const extensionPointId: ExtensionPointId = {
      service,
      name: extensionPoint,
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
        extensionPointId
      );
    return combineExtensionsFromProviders(
      urlExtensionsProvider,
      mutedProvider(extensionManagerExtensionsProvider)
    );
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
      disableMetrics={disableMetrics}
    >
      {children}
    </Extensible>
  );
};

export default ExtensibleWrapper;
