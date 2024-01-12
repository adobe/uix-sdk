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

/**
 * @hidden
 */
import React, { createContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { ExtensionRegistryEndpointRegistration } from "@adobe/uix-host";

/**
 * @internal
 */
export const ExtensibleComponentContext =
  createContext<ExtensionRegistryEndpointRegistration>(
    {} as unknown as ExtensionRegistryEndpointRegistration
  );

export type ExtensibleComponentProps = PropsWithChildren<{
  extensionPoint: string;
  service: string;
  version: string;
}>;

/*
 * Wrapper that adds an extension point context to subcomponent tree.
 */
export const ExtensibleComponent = ({
  extensionPoint,
  service,
  version,
  children,
}: ExtensibleComponentProps) => {
  // memoized to avoid re-renders
  const value = useMemo(
    () => ({
      extensionPoint,
      service,
      version,
    }),
    [extensionPoint, service, version]
  );

  return (
    <ExtensibleComponentContext.Provider value={value}>
      {children}
    </ExtensibleComponentContext.Provider>
  );
};
