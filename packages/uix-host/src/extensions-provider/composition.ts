import { InstalledExtensions, ExtensionsProvider } from "../host.js";

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
      (extensionsBatches: Array<InstalledExtensions>) => {
        return Object.assign({}, ...extensionsBatches);
      }
    );
}
