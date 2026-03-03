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
import { createContext } from "react";
import type { Host } from "@adobe/uix-host";

/**
 * Context container with Host object and extensions load status.
 *
 * @internal
 */
export type ExtensibilityContext = {
  host: Host;
  extensionListFetched: boolean;
};

/**
 * @internal
 */
export const ExtensionContext = createContext<ExtensibilityContext>(
  {} as unknown as ExtensibilityContext,
);
