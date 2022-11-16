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

import { ExtensionsProvider } from "../host.js";

/**
 * Mute any errors produced by provider.
 * This function would execute given provider and return its results as is, if any error occurs this provider will log it
 * any return an empty array of extensions.
 * @public
 */
export function mutedProvider(
  provider: ExtensionsProvider
): ExtensionsProvider {
  return async () => {
    try {
      return await provider();
    } catch (error) {
      console.error(`Extension provider has failed: ${error.message}`, {
        error,
      });
      return {};
    }
  };
}
