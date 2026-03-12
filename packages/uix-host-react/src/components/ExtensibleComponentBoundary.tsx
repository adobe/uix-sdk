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
import type { PropsWithChildren } from "react";
import React, { createContext } from "react";
import type { ExtensionRegistryEndpointRegistration } from "@adobe/uix-host";

/**
 * @internal
 */
// eslint-disable-next-line react-refresh/only-export-components
export const ExtensibleComponentBoundaryContext = createContext<
  ExtensionRegistryEndpointRegistration[]
>(null as ExtensionRegistryEndpointRegistration[]);

/** @public */
export type ExtensibleComponentProps = PropsWithChildren<{
  extensionPoints: ExtensionRegistryEndpointRegistration[];
}>;

/**
 * Wrapper that adds an extension point context to subcomponent tree.
 *
 * @public
 */
export const ExtensibleComponentBoundary = ({
  extensionPoints,
  children,
}: ExtensibleComponentProps) => (
  <ExtensibleComponentBoundaryContext.Provider value={extensionPoints}>
    {children}
  </ExtensibleComponentBoundaryContext.Provider>
);
