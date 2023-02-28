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

/** @public */
export interface ExtensionRegistryConfig
  extends ExtensionRegistryExtensionRegistration,
  ExtensionRegistryConnection {
    aemInstance?: string;
    extBaseUrl?: string;
}

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

function buildExtensionRegistryUrl(config: ExtensionRegistryConfig): string {
  if (config.aemInstance) {
    const queryParams = new URLSearchParams({
      orgId: config.imsOrg,
      extensionPoint: buildEndpointPath(config),
      aemInstance: config.aemInstance,
      auth: 'true',
    });
    return ensureProtocolSpecified(config.extBaseUrl) +
      '/api/v1/web/dx-excshell-1/listFilteredExtensions' +
      `?${queryParams.toString()}`;
  } else {
    return `${ensureProtocolSpecified(
      config.baseUrl || "appregistry.adobe.io"
    )}/myxchng/v1/org/${encodeURIComponent(
      config.imsOrg
    )}/xtn/${buildEndpointPath(config)}?auth=true`;
  }
}

async function fetchExtensionsFromRegistry(
  config: ExtensionRegistryConfig
): Promise<Array<ExtensionDefinition>> {
  const resp = await fetch(
    buildExtensionRegistryUrl(config),
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
    out.reduce((a, e: ExtensionDefinition) => {
      if (e.status !== "PUBLISHED") {
        return a;
      }

      return {
        ...a,
        // todo: make safer way to extract href
        [e.name]: e.endpoints[erEndpoint].view[0].href,
      };
    }, {})
  );

  return Promise.resolve({});
}

/**
 * Create a callback that fetches extensions from the registry.
 * @public
 */
export function createExtensionRegistryProvider(
  config: ExtensionRegistryConfig
): ExtensionsProvider {
  return function () {
    return extensionRegistryExtensionsProvider(config);
  };
}
