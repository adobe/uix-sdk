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

/** @internal */
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

/** @internal */
type EndpointDefinition = Record<string, Array<OperationDefinition>>;

/** @internal */
interface ExtensionInfo {
  supportEmail: string;
  appId: string;
}

/** @internal */
interface OperationDefinition {
  href: string;
  metadata: OperationMetadata;
}

/** @internal */
interface OperationMetadata {
  services: Array<object>;
  profile: OperationProfile;
}

/** @internal */
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
export interface ExtensionRegistryExtensionRegistration extends ExtensionRegistryEndpointRegistration {
  imsOrg: string;
}

/** @public */
export interface ExtensionRegistryConnection {
  baseUrl?: string;
  apiKey: string;
  workspace?: string;
  filter?: (extension: ExtensionDefinition) => boolean;
  auth: {
    schema: "Basic" | "Bearer";
    imsToken: string;
  };
}

/** @public */
export interface ExtensionRegistryConfig
  extends ExtensionRegistryExtensionRegistration, ExtensionRegistryConnection {}

const buildEndpointPath = (
  config: ExtensionRegistryEndpointRegistration,
): string => `${config.service}/${config.extensionPoint}/${config.version}`;

const ensureProtocolSpecified = (url: string) => {
  if (url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("http://")) {
    return url;
  }

  return `https://${url}`;
};

export const fetchExtensionsFromRegistry = async (
  config: ExtensionRegistryConfig,
): Promise<Array<ExtensionDefinition>> => {
  const workspaceParam = config.workspace
    ? `&workspace=${config.workspace}`
    : "";
  const resp = await fetch(
    `${ensureProtocolSpecified(
      config.baseUrl || "appregistry.adobe.io",
    )}/myxchng/v1/org/${encodeURIComponent(
      config.imsOrg,
    )}/xtn/${buildEndpointPath(config)}?auth=true${workspaceParam}`,
    {
      headers: {
        Accept: "application/json",
        // eslint-disable-next-line sonarjs/todo-tag
        Authorization: `${config.auth.schema} ${config.auth.imsToken}`, // todo: check if auth schema needed (initial implementation was without it)
        "X-Api-Key": config.apiKey,
      },
    },
  );

  if (resp.status != 200) {
    throw new Error(
      `extension registry returned non-200 response (${
        resp.status
      }): ${await resp.text()}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return await resp.json();
};

/**
 * @deprecated
 */
const extensionRegistryExtensionsProvider = (
  config: ExtensionRegistryConfig,
): Promise<InstalledExtensions> => {
  const erEndpoint = buildEndpointPath(config);

  return fetchExtensionsFromRegistry(config).then((out) =>
    out.reduce((a, e: ExtensionDefinition) => {
      if (e.status !== "PUBLISHED") {
        return a;
      }

      return {
        ...a,
        // eslint-disable-next-line sonarjs/todo-tag
        // todo: make safer way to extract href
        [e.name]: e.endpoints[erEndpoint].view[0].href,
      };
    }, {}),
  );
};

/**
 * Fetch & return published extension objects from registry
 */
const extensionRegistryExtensionsAsObjectsProvider = (
  config: ExtensionRegistryConfig,
): Promise<InstalledExtensions> => {
  const erEndpoint = buildEndpointPath(config);

  return fetchExtensionsFromRegistry(config).then((out) =>
    out.reduce((a, e: ExtensionDefinition) => {
      if (config.filter && typeof config.filter === "function") {
        if (!config.filter(e)) {
          return a;
        }
      } else if (e.status !== "PUBLISHED") {
        return a;
      }

      return {
        ...a,
        [e.name]: {
          extensionPoints: [erEndpoint],
          id: e.name,
          url: e.endpoints[erEndpoint].view[0].href,
        },
      };
    }, {}),
  );
};

/**
 * Create a callback that fetches extensions from the registry.
 * @public
 * @deprecated use `createExtensionRegistryAsObjectsProvider()`
 */
export const createExtensionRegistryProvider =
  (config: ExtensionRegistryConfig): ExtensionsProvider =>
  () =>
    // eslint-disable-next-line sonarjs/deprecation
    extensionRegistryExtensionsProvider(config);

/**
 * Create a callback that fetches extensions as objects from the registry.
 * @public
 */
export const createExtensionRegistryAsObjectsProvider =
  (config: ExtensionRegistryConfig): ExtensionsProvider =>
  () =>
    extensionRegistryExtensionsAsObjectsProvider(config);
