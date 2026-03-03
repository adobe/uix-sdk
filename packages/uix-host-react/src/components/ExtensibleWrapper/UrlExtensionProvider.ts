/** ***********************************************************************
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
import type { Extension } from "@adobe/uix-core";
import type { ExtensionsProvider, InstalledExtensions } from "@adobe/uix-host";
import type { ExtensionPointId } from "./ExtensionManagerProvider";

const EXT_PARAM_PREFIX = "ext";

export interface ExtUrlParams {
  [key: string]: string;
}

/**
 * Validates if a URL is safe and only allows HTTP/HTTPS protocols
 * @param url - The URL string to validate
 * @returns true if the URL is valid and uses HTTP/HTTPS protocol, false otherwise
 */
export const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Extracts extension URLs from the query string
 * @ignore
 */
export const extractExtUrlParams = (
  queryString: string | undefined,
): ExtUrlParams => {
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
};

/**
 * Generates an extension ID from the extension URL
 * @ignore
 */
export const generateExtensionId = (extensionUrl: string): string =>
  extensionUrl.replace(/\W/g, "_");

/**
 * Creates an ExtensionsProvider that provides extensions from the URL
 * @ignore
 */
export const createUrlExtensionsProvider = (
  extensionPointId: ExtensionPointId,
  queryString: string | undefined,
): ExtensionsProvider => {
  const extUrlParams: ExtUrlParams = extractExtUrlParams(queryString);

  const extensionUrls: string[] = Object.keys(extUrlParams)
    .filter(
      (extParam) =>
        extParam === EXT_PARAM_PREFIX ||
        extParam ===
          `${EXT_PARAM_PREFIX}.${extensionPointId.service}/${extensionPointId.name}/${extensionPointId.version}`,
    )
    .flatMap((extParam) => {
      const paramValue = extUrlParams[extParam];

      return isValidHttpUrl(paramValue) ? [paramValue] : [];
    });

  const installedExtensions: InstalledExtensions = extensionUrls
    .map(
      (extensionUrl: string) =>
        ({
          extensionPoints: [
            `${extensionPointId.service}/${extensionPointId.name}/${extensionPointId.version}`,
          ],
          id: generateExtensionId(extensionUrl),
          url: extensionUrl,
        }) as Extension,
    )
    .reduce((acc: InstalledExtensions, extension: Extension) => {
      acc[extension.id] = extension;
      return acc;
    }, {} as InstalledExtensions);

  return () => Promise.resolve(installedExtensions);
};
