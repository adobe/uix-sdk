import { InstalledExtensions, ExtensionsProvider } from "../host.js";

export function combineExtensionsFromProviders(
  ...providers: Array<ExtensionsProvider>
): Promise<InstalledExtensions> {
  return Promise.all(providers.map((ep: ExtensionsProvider) => ep())).then(
    (extensionsBatches: Array<InstalledExtensions>) => {
      return Object.assign({}, ...extensionsBatches);
    }
  );
}
