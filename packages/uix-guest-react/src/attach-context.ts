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
 * Type definition for GuestUI class
 */

import { createContext } from "react";
import { ExtensibleStoreManagerInterface, VirtualApi } from "@adobe/uix-core";
import { GuestUI } from "@adobe/uix-guest";

/**
 * Context container with Host object and extensions load status.
 *
 * @internal
 */
export type AttachContextType = {
  connection: GuestUI<VirtualApi>;
  storeManager: ExtensibleStoreManagerInterface;
};

/**
 * @internal
 */
export const AttachContext = createContext<AttachContextType>(
  {} as AttachContextType
);
