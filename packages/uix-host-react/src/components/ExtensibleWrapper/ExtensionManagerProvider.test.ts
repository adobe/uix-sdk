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

import type { InstalledExtensions } from "@adobe/uix-host";
import type {
  DiscoveryConfig,
  ExtensionManagerConfig,
  ExtensionManagerExtension,
  ExtensionPointId,
} from "./ExtensionManagerProvider";
import {
  buildExtensionManagerUrl,
  createExtensionManagerExtensionsProvider,
  extractProgramIdEnvId,
  fetchExtensionsFromExtensionManager,
  getExtensionRegistryBaseUrl,
  mergeExtensions,
} from "./ExtensionManagerProvider";

globalThis.fetch = jest.fn();

const mockResponse = [
  {
    extensionPoints: [
      { extensionPoint: "service/point/1.0", url: "https://example.com" },
    ],
    id: "ext1",
    name: "Extension 1",
  },
];

beforeEach(() => {
  jest.spyOn(globalThis, "fetch").mockImplementation(
    jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        status: 200,
      }),
    ) as jest.Mock,
  );
});

describe("extractProgramIdEnvId", () => {
  it("should correctly extract programId and envId from repo", () => {
    const repo = "p123-e456";
    const result = extractProgramIdEnvId(repo);

    expect(result).toEqual({ envId: "456", programId: "123" });
  });

  it("should throw error if repo is invalid", () => {
    const repo = "invalid-repo";

    expect(() => extractProgramIdEnvId(repo)).toThrow(
      "Error parsing a repo value",
    );
  });
});

describe("getExtensionRegistryBaseUrl", () => {
  it("should return the correct extension registry base URL for prod", () => {
    expect(getExtensionRegistryBaseUrl("prod", null)).toBe(
      "https://appregistry.adobe.io",
    );
  });

  it("should return the correct extension registry base URL for stage", () => {
    expect(getExtensionRegistryBaseUrl("stage", null)).toBe(
      "https://appregistry-stage.adobe.io",
    );
  });

  it("should use default stage URL if registry is null", () => {
    expect(getExtensionRegistryBaseUrl(undefined, null)).toBe(
      "https://appregistry-stage.adobe.io",
    );
  });
});

describe("buildExtensionManagerUrl", () => {
  it("should build the correct extension manager URL", () => {
    const config: ExtensionManagerConfig = {
      apiKey: "api-key",
      auth: { imsToken: "token", schema: "Bearer" },
      baseUrl: "https://extension-manager.adobe.io",
      extensionPoint: "point",
      imsOrg: "org-id",
      service: "service",
      version: "1.0",
    };
    const url = buildExtensionManagerUrl(config);

    expect(url).toBe(
      "https://extension-manager.adobe.io/v2/extensions?extensionPoints=service%2Fpoint%2F1.0",
    );
  });
});

describe("fetchExtensionsFromExtensionManager", () => {
  it("should fetch extensions from Extension Manager and return parsed data", async () => {
    const config: ExtensionManagerConfig = {
      apiKey: "api-key",
      auth: { imsToken: "token", schema: "Bearer" },
      baseUrl: "https://extension-manager.adobe.io",
      extensionPoint: "point",
      imsOrg: "org-id",
      service: "service",
      version: "1.0",
    };

    const extensions = await fetchExtensionsFromExtensionManager(config);

    expect(extensions).toEqual(mockResponse);
  });
});

describe("mergeExtensions", () => {
  it("should merge extensions from AppRegistry and Extension Manager", () => {
    const appRegistryExtensions: InstalledExtensions = {
      ext1: { id: "ext1", url: "https://example.com" },
    };
    const extensionManagerExtensions: ExtensionManagerExtension[] = [
      {
        description: "A description",
        disabled: false,
        extId: "ext1",
        extensionPoints: [
          {
            extensionPoint: "service/point/1.0",
            url: "https://new-example.com",
          },
        ],
        id: "ext1",
        name: "ext1",
        scope: {},
        status: "active",
        supportEmail: "support@example.com",
        title: "Extension 1",
      },
    ];
    const extensionPointId: ExtensionPointId = {
      name: "point",
      service: "service",
      version: "1.0",
    };

    const mergedExtensions = mergeExtensions(
      appRegistryExtensions,
      extensionManagerExtensions,
      extensionPointId,
    );

    expect(mergedExtensions.ext1).toEqual({
      configuration: undefined,
      extensionPoints: ["service/point/1.0"],
      id: "ext1",
      url: "https://new-example.com",
    });
  });

  it("should return only enabled extensions when merging", () => {
    const appRegistryExtensions: InstalledExtensions = {
      ext1: { id: "ext1", url: "https://example.com" },
    };
    const extensionManagerExtensions: ExtensionManagerExtension[] = [
      {
        description: "A description",
        disabled: true,
        extId: "ext1",
        extensionPoints: [
          {
            extensionPoint: "service/point/1.0",
            url: "https://new-example.com",
          },
        ],
        id: "ext1",
        name: "ext1",
        scope: {},
        status: "active",
        supportEmail: "support@example.com",
        title: "Extension 1",
      },
    ];
    const extensionPointId: ExtensionPointId = {
      name: "point",
      service: "service",
      version: "1.0",
    };

    const mergedExtensions = mergeExtensions(
      appRegistryExtensions,
      extensionManagerExtensions,
      extensionPointId,
    );

    expect(mergedExtensions).toEqual({});
  });
});

describe("createExtensionManagerExtensionsProvider", () => {
  it("should create an extension manager extensions provider", async () => {
    const discoveryConfig: DiscoveryConfig = {
      experienceShellEnvironment: "prod",
    };
    const authConfig = {
      apiKey: "api-key",
      imsOrg: "org-id",
      imsToken: "token",
    };
    const providerConfig = { extensionManagerUrl: "https://custom-url.com" };
    const extensionPointId = {
      name: "point",
      service: "service",
      version: "1.0",
    };

    const provider = createExtensionManagerExtensionsProvider(
      discoveryConfig,
      authConfig,
      providerConfig,
      extensionPointId,
    );

    const extensions = await provider();

    expect(extensions).toBeDefined();
  });
});
