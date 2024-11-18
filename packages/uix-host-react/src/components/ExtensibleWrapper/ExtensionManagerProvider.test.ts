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
global.fetch = jest.fn();
describe("Utility Functions", () => {
  const mockResponse = [
    {
      id: "ext1",
      name: "Extension 1",
      extensionPoints: [
        { extensionPoint: "service/point/1.0", url: "http://example.com" },
      ],
    },
  ];

  jest.spyOn(global, "fetch").mockImplementation(
    jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      })
    ) as jest.Mock
  );
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

  it("should merge extensions from AppRegistry and Extension Manager", () => {
    const appRegistryExtensions: InstalledExtensions = {
      ext1: { id: "ext1", url: "http://example.com" },
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
            url: "http://new-example.com",
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
      url: "http://new-example.com",
      configuration: undefined,
      extensionPoints: ["service/point/1.0"],
    });
  });

  it("should return only enabled extensions when merging", () => {
    const appRegistryExtensions: InstalledExtensions = {
      ext1: { id: "ext1", url: "http://example.com" },
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
        disabled: true, // Disabled extension
        extensionPoints: [
          {
            extensionPoint: "service/point/1.0",
            url: "http://new-example.com",
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
/*
describe("ExtensionManagerProvider", () => {
  describe("extractProgramIdEnvId", () => {
    it("should correctly extract programId and envId from a valid repo string", () => {
      const repo = "p123-e456";
      const result = extractProgramIdEnvId(repo);
      expect(result).toEqual({ programId: "123", envId: "456" });
    });

    it("should throw an error for an invalid repo string", () => {
      const repo = "invalid-string";
      expect(() => extractProgramIdEnvId(repo)).toThrow(
        "Error parsing a repo value"
      );
    });
  });

  describe("getExtensionRegistryBaseUrl", () => {
    it("should return the correct base URL for production", () => {
      const url = getExtensionRegistryBaseUrl("prod", null);
      expect(url).toBe("https://appregistry.adobe.io");
    });

    it("should return the provided registry URL for staging", () => {
      const url = getExtensionRegistryBaseUrl(
        "stage",
        "https://custom-registry"
      );
      expect(url).toBe("https://custom-registry");
    });
  });

  describe("getExtensionManagerBaseUrl", () => {
    it("should return the correct base URL for production", () => {
      const url = getExtensionManagerBaseUrl("prod", null);
      expect(url).toBe("https://aemx-mngr.adobe.io");
    });

    it("should return the provided extension manager URL for staging", () => {
      const url = getExtensionManagerBaseUrl("stage", "https://custom-manager");
      expect(url).toBe("https://custom-manager");
    });
  });

  describe("buildExtensionManagerUrl", () => {
    const config: ExtensionManagerConfig = {
      apiKey: "test-api-key",
      auth: {
        schema: "Bearer",
        imsToken: "test-token",
      },
      service: "test-service",
      extensionPoint: "test-point",
      version: "1.0.0",
      imsOrg: "test-org",
      scope: { foo: "bar" },
      baseUrl: "https://example.com",
    };

    it("should correctly build the extension manager URL", () => {
      const url = buildExtensionManagerUrl(config);
      expect(url).toContain("v2/extensions");
      expect(url).toContain("extensionPoints=test-service/test-point/1.0.0");
    });
  });

  describe("fetchExtensionsFromExtensionManager", () => {
    it("should throw an error if the response status is not 200", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 500,
        text: () => Promise.resolve("Error"),
      });

      const config: ExtensionManagerConfig = {
        apiKey: "test-api-key",
        auth: {
          schema: "Bearer",
          imsToken: "test-token",
        },
        service: "test-service",
        extensionPoint: "test-point",
        version: "1.0.0",
        imsOrg: "test-org",
        baseUrl: "https://example.com",
      };

      await expect(fetchExtensionsFromExtensionManager(config)).rejects.toThrow(
        "Extension Manager returned non-200 response"
      );
    });

    it("should return the response data on successful fetch", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve([{ id: "ext1", name: "Extension 1" }]),
      });

      const config: ExtensionManagerConfig = {
        apiKey: "test-api-key",
        auth: {
          schema: "Bearer",
          imsToken: "test-token",
        },
        service: "test-service",
        extensionPoint: "test-point",
        version: "1.0.0",
        imsOrg: "test-org",
        baseUrl: "https://example.com",
      };

      const extensions = await fetchExtensionsFromExtensionManager(config);
      expect(extensions).toHaveLength(1);
      expect(extensions[0].name).toBe("Extension 1");
    });
  });

  describe("mergeExtensions", () => {
    it("should correctly merge extensions from the registry and extension manager", () => {
      const appRegistryExtensions = {
        ext1: {
          id: "ext1",
          url: "https://example.com",
          extensionPoints: ["service/point"],
        },
      };
      const extensionManagerExtensions: ExtensionManagerExtension[] = [
        {
          id: "ext2",
          name: "Extension 2",
          title: "Extension 2",
          description: "Description",
          status: "enabled",
          supportEmail: "support@example.com",
          extId: "ext2",
          disabled: false,
          extensionPoints: [
            { extensionPoint: "service/point", url: "https://example.com" },
          ],
          scope: {},
        },
      ];
      const extensionPointId: ExtensionPointId = {
        service: "service",
        name: "point",
        version: "1.0.0",
      };

      const result = mergeExtensions(
        appRegistryExtensions,
        extensionManagerExtensions,
        extensionPointId
      );
      expect(result).toHaveProperty("ext1");
      expect(result).toHaveProperty("ext2");
    });
  });
});
*/
