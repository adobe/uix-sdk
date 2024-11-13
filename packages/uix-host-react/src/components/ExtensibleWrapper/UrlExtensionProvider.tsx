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
import { ExtensionsProvider, InstalledExtensions } from "@adobe/uix-host";
import { Extension } from "@adobe/uix-core";
import { ExtensionPointId } from "./ExtensionManagerProvider";

const EXT_PARAM_PREFIX = "ext";

export interface ExtUrlParams {
  [key: string]: string;
}

/**
 * Extracts extension URLs from the query string
 * @ignore
 */
export function extractExtUrlParams(
  queryString: string | undefined
): ExtUrlParams {
  if (!queryString) {
    return {};
  }
  const params: URLSearchParams = new URLSearchParams(queryString);
  return Array.from(params.entries()).reduce((extParams, [key, value]) => {
    if (key === EXT_PARAM_PREFIX || key.startsWith(`${EXT_PARAM_PREFIX}.`)) {
      extParams[key] = value;
    }
    return extParams;
  }, {} as ExtUrlParams);
}

/**
 * Generates an extension ID from the extension URL
 * @ignore
 */
export function generateExtensionId(extensionUrl: string): string {
  return extensionUrl.replace(/\W/g, "_");
}

/**
 * Creates an ExtensionsProvider that provides extensions from the URL
 * @ignore
 */
export function createUrlExtensionsProvider(
  extensionPointId: ExtensionPointId,
  queryString: string | undefined
): ExtensionsProvider {
  const extUrlParams: ExtUrlParams = extractExtUrlParams(queryString);

  const extensionUrls: string[] = Object.keys(extUrlParams)
    .filter(
      (extParam) =>
        extParam === EXT_PARAM_PREFIX ||
        extParam ===
          `${EXT_PARAM_PREFIX}.${extensionPointId.service}/${extensionPointId.name}/${extensionPointId.version}`
    )
    .flatMap((extParam) => extUrlParams[extParam].split(","));

  const installedExtensions: InstalledExtensions = extensionUrls
    .map((extensionUrl: string) => {
      return {
        id: generateExtensionId(extensionUrl),
        url: extensionUrl,
        extensionPoints: [
          `${extensionPointId.service}/${extensionPointId.name}/${extensionPointId.version}`,
        ],
      } as Extension;
    })
    .reduce((acc: InstalledExtensions, extension: Extension) => {
      acc[extension.id] = extension;
      return acc;
    }, {} as InstalledExtensions);

  return async () => installedExtensions;
}
