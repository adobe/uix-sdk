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

import type { ExtensionsProvider, InstalledExtensions } from "../host.js";

/**
 * Combine multiple {@link @adobe/uix-host#ExtensionsProvider} callbacks into a
 * single callback, which aggregates and dedupes all extensions from all
 * providers into one namespaced object.
 * @public
 */
export function combineExtensionsFromProviders(
  ...providers: Array<ExtensionsProvider>
): ExtensionsProvider {
  return () =>
    Promise.all(providers.map((ep: ExtensionsProvider) => ep())).then(
      (extensionsBatches: Array<InstalledExtensions>) =>
        Object.assign({}, ...extensionsBatches),
    );
}
