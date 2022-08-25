import { InstalledExtensions, ExtensionsProvider } from "../host.js";

/** @public */
export interface ExtensionRegistryRegistration {
  service: string;
  extensionPoint: string;
  version: string;
  imsOrg: string;
}

/** @public */
export interface ExtensionRegistryConnection {
  url: string;
  apiKey: string;
  auth: {
    schema: "Basic" | "Bearer";
    imsToken: string;
  };
}

export interface ExtensionRegistryConfig
  extends ExtensionRegistryRegistration,
    ExtensionRegistryConnection {}

function extensionRegistryExtensionsProvider(
  config: ExtensionRegistryConfig
): Promise<InstalledExtensions> {
  // todo: add implementation here
  return Promise.resolve({});
}

export function createExtensionRegistryProvider(
  config: ExtensionRegistryConfig
): ExtensionsProvider {
  return function () {
    return extensionRegistryExtensionsProvider(config);
  };
}
