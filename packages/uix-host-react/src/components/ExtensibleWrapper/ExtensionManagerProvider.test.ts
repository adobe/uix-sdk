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

import { InstalledExtensions } from "@adobe/uix-host";
import {
  buildExtensionManagerUrl,
  fetchExtensionsFromExtensionManager,
  mergeExtensions,
  extractProgramIdEnvId,
  ExtensionManagerConfig,
  ExtensionManagerExtension,
  ExtensionPointId,
  getExtensionRegistryBaseUrl,
  createExtensionManagerExtensionsProvider,
  DiscoveryConfig,
} from "./ExtensionManagerProvider";
globalThis.fetch = jest.fn();

const mockResponse = [
  {
    id: "ext1",
    name: "Extension 1",
    extensionPoints: [
      { extensionPoint: "service/point/1.0", url: "https://example.com" },
    ],
  },
];

beforeEach(() => {
  jest.spyOn(globalThis, "fetch").mockImplementation(
    jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })
    ) as jest.Mock
  );
});

describe("extractProgramIdEnvId", () => {
  it("should correctly extract programId and envId from repo", () => {
    const repo = "p123-e456";
    const result = extractProgramIdEnvId(repo);
    expect(result).toEqual({ programId: "123", envId: "456" });
  });

  it("should throw error if repo is invalid", () => {
    const repo = "invalid-repo";
    expect(() => extractProgramIdEnvId(repo)).toThrow(
      "Error parsing a repo value"
    );
  });
});

describe("getExtensionRegistryBaseUrl", () => {
  it("should return the correct extension registry base URL for prod", () => {
    expect(getExtensionRegistryBaseUrl("prod", null)).toBe(
      "https://appregistry.adobe.io"
    );
  });

  it("should return the correct extension registry base URL for stage", () => {
    expect(getExtensionRegistryBaseUrl("stage", null)).toBe(
      "https://appregistry-stage.adobe.io"
    );
  });

  it("should use default stage URL if registry is null", () => {
    expect(getExtensionRegistryBaseUrl(undefined, null)).toBe(
      "https://appregistry-stage.adobe.io"
    );
  });
});

describe("buildExtensionManagerUrl", () => {
  it("should build the correct extension manager URL", () => {
    const config: ExtensionManagerConfig = {
      apiKey: "api-key",
      auth: { schema: "Bearer", imsToken: "token" },
      service: "service",
      extensionPoint: "point",
      version: "1.0",
      imsOrg: "org-id",
      baseUrl: "https://extension-manager.adobe.io",
    };
    const url = buildExtensionManagerUrl(config);
    expect(url).toBe(
      "https://extension-manager.adobe.io/v2/extensions?extensionPoints=service%2Fpoint%2F1.0"
    );
  });
});

describe("fetchExtensionsFromExtensionManager", () => {
  it("should fetch extensions from Extension Manager and return parsed data", async () => {
    const config: ExtensionManagerConfig = {
      apiKey: "api-key",
      auth: { schema: "Bearer", imsToken: "token" },
      service: "service",
      extensionPoint: "point",
      version: "1.0",
      imsOrg: "org-id",
      baseUrl: "https://extension-manager.adobe.io",
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
        id: "ext1",
        name: "ext1",
        title: "Extension 1",
        description: "A description",
        status: "active",
        supportEmail: "support@example.com",
        extId: "ext1",
        disabled: false,
        extensionPoints: [
          {
            extensionPoint: "service/point/1.0",
            url: "https://new-example.com",
          },
        ],
        scope: {},
      },
    ];
    const extensionPointId: ExtensionPointId = {
      service: "service",
      name: "point",
      version: "1.0",
    };

    const mergedExtensions = mergeExtensions(
      appRegistryExtensions,
      extensionManagerExtensions,
      extensionPointId
    );
    expect(mergedExtensions.ext1).toEqual({
      id: "ext1",
      url: "https://new-example.com",
      configuration: undefined,
      extensionPoints: ["service/point/1.0"],
    });
  });

  it("should return only enabled extensions when merging", () => {
    const appRegistryExtensions: InstalledExtensions = {
      ext1: { id: "ext1", url: "https://example.com" },
    };
    const extensionManagerExtensions: ExtensionManagerExtension[] = [
      {
        id: "ext1",
        name: "ext1",
        title: "Extension 1",
        description: "A description",
        status: "active",
        supportEmail: "support@example.com",
        extId: "ext1",
        disabled: true,
        extensionPoints: [
          {
            extensionPoint: "service/point/1.0",
            url: "https://new-example.com",
          },
        ],
        scope: {},
      },
    ];
    const extensionPointId: ExtensionPointId = {
      service: "service",
      name: "point",
      version: "1.0",
    };

    const mergedExtensions = mergeExtensions(
      appRegistryExtensions,
      extensionManagerExtensions,
      extensionPointId
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
      imsOrg: "org-id",
      imsToken: "token",
      apiKey: "api-key",
    };
    const providerConfig = { extensionManagerUrl: "https://custom-url.com" };
    const extensionPointId = {
      service: "service",
      name: "point",
      version: "1.0",
    };

    const provider = createExtensionManagerExtensionsProvider(
      discoveryConfig,
      authConfig,
      providerConfig,
      extensionPointId
    );

    const extensions = await provider();
    expect(extensions).toBeDefined();
  });
});
