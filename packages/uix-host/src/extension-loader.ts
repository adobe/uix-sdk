import {InstalledExtensions} from "./host";
import {ExtensionRegistry} from "./registry";

export interface RegistryConfig {
  imsToken: string;
  apiKey: string;
  imsOrgId: string;
  exchangeUrl?: string;
}

export function getExtensionRegistryExtensions(extensionPointID: string, registryConfig: RegistryConfig): Promise<InstalledExtensions> {
  const registry = new ExtensionRegistry(
    registryConfig.apiKey,
    registryConfig.imsToken,
    registryConfig.exchangeUrl,
  );

  return registry.getExtensions(registryConfig.imsOrgId, extensionPointID)
    .then((out) => {
      return out.reduce((a, e) => ({
        ...a,
        // todo: make safer way to extract href
        [e.name]: e.endpoints[extensionPointID].view[0].href,
      }), {})
    })
}
