import {
  extractExtUrlParams,
  generateExtensionId,
  createUrlExtensionsProvider,
} from "./UrlExtensionProvider";
import { ExtensionPointId } from "./ExtensionManagerProvider";
import { InstalledExtensions } from "@adobe/uix-host";
import { Extension } from "@adobe/uix-core";

describe("UrlExtensionProvider", () => {
  describe("extractExtUrlParams", () => {
    it('should extract parameters starting with "ext"', () => {
      const queryString = "ext=param1&ext.service/point/1.0.0=param2";
      const result = extractExtUrlParams(queryString);
      expect(result).toEqual({
        ext: "param1",
        "ext.service/point/1.0.0": "param2",
      });
    });

    it('should return an empty object if no "ext" parameters are found', () => {
      const queryString = "other=param1";
      const result = extractExtUrlParams(queryString);
      expect(result).toEqual({});
    });
  });

  describe("generateExtensionId", () => {
    it("should generate a valid ID from a URL", () => {
      const url = "https://example.com/extension";
      const extensionId = generateExtensionId(url);
      expect(extensionId).toBe("https___example_com_extension");
    });
  });

  describe("createUrlExtensionsProvider", () => {
    it("should create an ExtensionsProvider for URL-based extensions", async () => {
      const extensionPointId: ExtensionPointId = {
        service: "service",
        name: "point",
        version: "1.0.0",
      };
      const queryString = "ext.service/point/1.0.0=https://example.com";
      const provider = createUrlExtensionsProvider(
        extensionPointId,
        queryString
      );
      const extensions: InstalledExtensions = await provider();
      expect(extensions).toHaveProperty("https___example_com");
      const extension = extensions["https___example_com"] as Extension;
      expect(extension.url).toBe("https://example.com");
    });
  });
});
