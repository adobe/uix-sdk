import {
  buildExtensionManagerUrl,
  fetchExtensionsFromExtensionManager,
  mergeExtensions,
  extractProgramIdEnvId,
  ExtensionManagerConfig,
  ExtensionManagerExtension,
  ExtensionPointId,
  getExtensionManagerBaseUrl,
  getExtensionRegistryBaseUrl,
} from "./ExtensionManagerProvider";

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
