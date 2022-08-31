import { InstalledExtensions, ExtensionsProvider } from "../host.js";

interface ExtensionDefinition {
  name: string;
  title: string;
  description: string;
  icon: string;
  publisher: string;
  endpoints: Record<string, EndpointDefinition>;
  xrInfo: ExtensionInfo;
  status: string;
}

type EndpointDefinition = Record<string, Array<OperationDefinition>>;

interface ExtensionInfo {
  supportEmail: string;
  appId: string;
}

interface OperationDefinition {
  href: string;
  metadata: OperationMetadata;
}

interface OperationMetadata {
  services: Array<object>;
  profile: OperationProfile;
}

interface OperationProfile {
  client_id: string;
  scope: string;
}

/** @public */
export interface ExtensionRegistryEndpointRegistration {
  service: string;
  extensionPoint: string;
  version: string;
}

/** @public */
export interface ExtensionRegistryExtensionRegistration
  extends ExtensionRegistryEndpointRegistration {
  imsOrg: string;
}

/** @public */
export interface ExtensionRegistryConnection {
  baseUrl?: string;
  apiKey: string;
  auth: {
    schema: "Basic" | "Bearer";
    imsToken: string;
  };
}

export interface ExtensionRegistryConfig
  extends ExtensionRegistryExtensionRegistration,
    ExtensionRegistryConnection {}

function buildEndpointPath(
  config: ExtensionRegistryEndpointRegistration
): string {
  return `${config.service}/${config.extensionPoint}/${config.version}`;
}

function ensureProtocolSpecified(url: string) {
  if (url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("http://")) {
    return url;
  }
  return `https://${url}`;
}

async function fetchExtensionsFromRegistry(
  config: ExtensionRegistryConfig
): Promise<Array<ExtensionDefinition>> {
  const resp = await fetch(
    `${ensureProtocolSpecified(
      config.baseUrl || "appregistry.adobe.io"
    )}/myxchng/v1/org/${encodeURIComponent(
      config.imsOrg
    )}/xtn/${buildEndpointPath(config)}?auth=true`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `${config.auth.schema} ${config.auth.imsToken}`, // todo: check if auth schema needed (initial implementation was without it)
        "X-Api-Key": config.apiKey,
      },
    }
  );

  if (resp.status != 200) {
    throw new Error(
      `extension registry returned non-200 response (${
        resp.status
      }): ${await resp.text()}`
    );
  }

  return await resp.json();
}

function extensionRegistryExtensionsProvider(
  config: ExtensionRegistryConfig
): Promise<InstalledExtensions> {
  const erEndpoint = buildEndpointPath(config);
  return fetchExtensionsFromRegistry(config).then((out) =>
    out.reduce(
      (a, e) => ({
        ...a,
        // todo: make safer way to extract href
        [e.name]: e.endpoints[erEndpoint].view[0].href,
      }),
      {}
    )
  );

  return Promise.resolve({});
}

export function createExtensionRegistryProvider(
  config: ExtensionRegistryConfig
): ExtensionsProvider {
  return function () {
    return extensionRegistryExtensionsProvider(config);
  };
}
