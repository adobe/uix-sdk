/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2024 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/

import {
    createExtensionRegistryAsObjectsProvider,
    ExtensionRegistryConfig,
    ExtensionsProvider,
    InstalledExtensions,
} from '@adobe/uix-host';

const EXTENSION_MANAGER_URL_PROD = 'https://aemx-mngr.adobe.io';
const EXTENSION_MANAGER_URL_STAGE = 'https://aemx-mngr-stage.adobe.io';

const APP_REGISTRY_URL_PROD = 'https://appregistry.adobe.io';
const APP_REGISTRY_URL_STAGE = 'https://appregistry-stage.adobe.io';

// Extension Manager stores information about extension points that a particular extension implements
// in the "extensionPoints" array of objects of the following "ExtensionPoint" type
// where "extensionPoint" is the name of the extension point, for example, "aem/assets/details/1"
// "url" is the extension url for the specified extension point
type ExtensionPoint = {
    extensionPoint: string;
    url: string;
};
export type ExtensionManagerExtension = {
    id: string;
    name: string;
    title: string;
    description: string;
    status: string;
    supportEmail: string;
    extId: string;
    disabled: boolean;
    extensionPoints: ExtensionPoint[];
    scope: Record<string, unknown>;
    configuration?: Record<string, unknown>;
};

export interface ExtensionManagerConfig extends ExtensionRegistryConfig {
    scope?: Record<string, unknown>;
}

/** Authentication configuration, including IMS Org ID, access token, and API key */
export interface AuthConfig {
    /** IMS Org ID */
    imsOrg: string;
    /** Access token for the user */
    accessToken: string;
    /** API key */
    apiKey: string;
}

/** Discovery configuration, including environment and repo Id */
export interface DiscoveryConfig {
    /** Environment level for backend Extension resolution services */
    experienceShellEnvironment?: "prod" | "stage";
    scope?: Record<string, string>
}

/** Extension point ID */
export interface ExtensionPointId {
    /** Service name */
    service: string;
    /** Extension point name */
    name: string;
    /** Extension point version */
    version: string;
}

/**
 * Sets up new ExtensionsProvider with authentication and discovery information needed to fetch the list of
 * Extensions from AppRegistry and Extension Manager service, along with the query string portion of URL
 * to extract the information about development Extensions
 */
export interface ExtensionsProviderConfig {
    /** Discovery configuration */
    discoveryConfig: DiscoveryConfig;
    /** Authentication configuration */
    authConfig: AuthConfig;
    /** Extension point ID */
    extensionPointId: ExtensionPointId;
    providerConfig: ExtensionProviderConfig;
}

export interface ExtensionProviderConfig {
    extensionManagerUrl?: string,
    appRegistryUrl?: string,
    disableExtensionManager?: boolean
}
const getExtensionRegistryBaseUrl = (environment: "prod" | "stage" | undefined, registry: string | null): string =>
    environment === "prod" ? APP_REGISTRY_URL_PROD : registry ?? APP_REGISTRY_URL_STAGE;
  
const getExtensionManagerBaseUrl = (environment: "prod" | "stage" | undefined, extensionManager: string | null): string =>
    environment === "prod" ? EXTENSION_MANAGER_URL_PROD : extensionManager ?? EXTENSION_MANAGER_URL_STAGE;

/**
 * Extracts programId and envId from the repo value
 * @param repo - the repo value
 * @returns object with programId and envId
 * @ignore
 */
export function extractProgramIdEnvId(repo: string): { programId: string; envId: string } {
    const regex: RegExp = /p(\d+)-e(\d+)/;
    const match: RegExpMatchArray | null = regex.exec(repo);
    if (!match) {
        throw new Error('Error parsing a repo value');
    }

    return {
        programId: match[1],
        envId: match[2],
    };
}

/**
 * Builds the URL for fetching extensions from the Extension Manager service
 * @param config - the Extension Manager configuration
 * @returns the URL for fetching extensions
 * @ignore
 */
export function buildExtensionManagerUrl(config: ExtensionManagerConfig): string {
    const scope = config.scope ? Object.fromEntries(
        Object.entries(config.scope).map(([k, v]) => [`scope.${k}`,v])
      ) : {};
    const extensionPoints: string = `${config.service}/${config.extensionPoint}/${config.version}`;
    const queryParams = new URLSearchParams({
        ...scope,
        extensionPoints,
    });

    return `${config.baseUrl}/v2/extensions?${queryParams.toString()}`;
}

/**
 * @ignore
 */
export async function fetchExtensionsFromExtensionManager(
    config: ExtensionManagerConfig
): Promise<ExtensionManagerExtension[]> {
    const resp: Response = await fetch(buildExtensionManagerUrl(config), {
        headers: {
            Authorization: `Bearer ${config.auth.imsToken}`,
            'x-api-key': config.apiKey,
            'x-org-id': config.imsOrg,
        },
    });

    if (resp.status !== 200) {
        throw new Error(`Extension Manager returned non-200 response (${resp.status}): ${await resp.text()}`);
    }

    return resp.json();
}

/**
 * Takes an array of extensions from the App Registry, an array of extensions from the Extension Manager, and
 * merges them into a list of Extensions. If an extension is disabled in the Extension Manager, it is removed from
 * the list.
 * Extension list from the App Registry is used as a base.
 * @ignore
 */
export function mergeExtensions(
    appRegistryExtensions: InstalledExtensions,
    extensionManagerExtensions: ExtensionManagerExtension[],
    extensionPointId: ExtensionPointId,
): InstalledExtensions {
    const mergedExtensions: InstalledExtensions = Object.assign(appRegistryExtensions, {});
    extensionManagerExtensions.forEach((extension: ExtensionManagerExtension) => {
        if (extension.disabled) {
            // remove disabled extensions
            delete mergedExtensions[extension.name];
        } else {
            const extPoint: ExtensionPoint | undefined = extension.extensionPoints.find(
                (_extensionPoint: ExtensionPoint) =>
                    _extensionPoint.extensionPoint ===
                    `${extensionPointId.service}/${extensionPointId.name}/${extensionPointId.version}`
            );
            if (extPoint) {
                // add a new extension record or replace the existing one by an extension record from Extension Manager
                // extension points are useful for filtering out extensions
                mergedExtensions[extension.name] = {
                    id: extension.name,
                    url: extPoint.url,
                    configuration: extension.configuration,
                    extensionPoints: extension.extensionPoints.map((point) => point.extensionPoint),
                };
            } else {
                //this should never happen because we query Extension Manager service for our specific extension point
                console.warn(
                    `Extension point ${extensionPointId.service}/${extensionPointId.name}/${extensionPointId.version} not found for extension ${extension.name}`
                );
            }
        }
    });

    return mergedExtensions;
}

async function getExtensionManagerExtensions(
    discoveryConfig: DiscoveryConfig,
    authConfig: AuthConfig,
    providerConfig: ExtensionProviderConfig,
    extensionPointId: ExtensionPointId,
): Promise<InstalledExtensions> {
    const config: ExtensionManagerConfig = {
        apiKey: authConfig.apiKey,
        auth: {
            schema: 'Bearer',
            imsToken: authConfig.accessToken,
        },
        service: extensionPointId.service,
        extensionPoint: extensionPointId.name,
        version: extensionPointId.version,
        imsOrg: authConfig.imsOrg,
        scope: discoveryConfig.scope,
    };

    const appRegistryExtensionsProvider: ExtensionsProvider = createExtensionRegistryAsObjectsProvider({
        ...config,
        baseUrl: getExtensionRegistryBaseUrl(discoveryConfig.experienceShellEnvironment, providerConfig.appRegistryUrl)
    });

    const [appRegistryExtensions, extensionManagerExtensions] = await Promise.all([
        appRegistryExtensionsProvider(),
        fetchExtensionsFromExtensionManager({
            ...config,
            baseUrl: getExtensionManagerBaseUrl(discoveryConfig.experienceShellEnvironment, providerConfig.extensionManagerUrl)
        }),
    ]);

    if(providerConfig.disableExtensionManager) {
        return appRegistryExtensions;
    } else {
        return mergeExtensions(appRegistryExtensions, extensionManagerExtensions, extensionPointId);
    }
}

/**
 * Creates an extension manager extension provider
 * @ignore
 */
export function createExtensionManagerExtensionsProvider(
    discoveryConfig: DiscoveryConfig,
    authConfig: AuthConfig,
    providerConfig: ExtensionProviderConfig,
    extensionPointId: ExtensionPointId,
): ExtensionsProvider {
    return () => {
        return getExtensionManagerExtensions(discoveryConfig, authConfig, providerConfig, extensionPointId);
    };
}
