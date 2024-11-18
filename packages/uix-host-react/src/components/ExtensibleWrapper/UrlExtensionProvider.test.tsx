import {
  extractExtUrlParams,
  generateExtensionId,
  createUrlExtensionsProvider,
} from "./UrlExtensionProvider";
import { ExtensionPointId } from "./ExtensionManagerProvider";
import { InstalledExtensions } from "@adobe/uix-host";
import { Extension } from "@adobe/uix-core";
describe('extractExtUrlParams', () => {
    it('should return an empty object when no query string is provided', () => {
      expect(extractExtUrlParams(undefined)).toEqual({});
    });
  
    it('should return an empty object when the query string does not contain any valid extension params', () => {
      expect(extractExtUrlParams('foo=bar&baz=qux')).toEqual({});
    });
  
    it('should extract valid extension params', () => {
      const queryString = 'ext=foo&ext.service1.name1.version1=http://example.com';
      const expectedParams = {
        ext: 'foo',
        'ext.service1.name1.version1': 'http://example.com',
      };
      expect(extractExtUrlParams(queryString)).toEqual(expectedParams);
    });
  
    it('should only include params with the "ext" prefix', () => {
      const queryString = 'ext=foo&other=bar&ext.service1.name1.version1=http://example.com';
      const expectedParams = {
        ext: 'foo',
        'ext.service1.name1.version1': 'http://example.com',
      };
      expect(extractExtUrlParams(queryString)).toEqual(expectedParams);
    });
  });

  describe('generateExtensionId', () => {
    it('should replace non-word characters with underscores', () => {
      const url = 'http://example.com/some/path';
      expect(generateExtensionId(url)).toBe('http___example_com_some_path');
    });
  
    it('should return the same ID when there are no non-word characters', () => {
      const url = 'extension_1';
      expect(generateExtensionId(url)).toBe('extension_1');
    });
  });

  describe('createUrlExtensionsProvider', () => {
    const mockExtensionPointId: ExtensionPointId = {
      service: 'service1',
      name: 'name1',
      version: 'version1',
    };
  
    it('should return an ExtensionsProvider that provides installed extensions', async () => {
      const queryString = 'ext=foo&ext.service1/name1/version1=http://example2.com';
      const provider = createUrlExtensionsProvider(mockExtensionPointId, queryString);
  
      const extensions = await provider();
      expect(Object.keys(extensions)).toHaveLength(2);
      expect(extensions).toHaveProperty('foo');
      expect(extensions).toHaveProperty('http___example2_com');
      expect(extensions['http___example2_com']).toHaveProperty('url', 'http://example2.com');
    });
  
    it('should return an empty object if no valid extensions are found in the query string', async () => {
      const queryString = 'foo=bar&baz=qux';
      const provider = createUrlExtensionsProvider(mockExtensionPointId, queryString);
  
      const extensions = await provider();
      expect(extensions).toEqual({});
    });
  
  
    it('should filter extensions by the correct extension point', async () => {
      const queryString = 'ext.service1/name1/version1=http://example1.com&ext.service2/name2/version2=https://www.test.';
      const provider = createUrlExtensionsProvider(mockExtensionPointId, queryString);
  
      const extensions = await provider();
      expect(extensions).toHaveProperty('http___example1_com');
    });
  
    it('should return an empty object when the query string does not match the expected extension point', async () => {
      const queryString = 'ext.service2.name2.version2=http://example1.com';
      const provider = createUrlExtensionsProvider(mockExtensionPointId, queryString);
  
      const extensions = await provider();
      expect(extensions).toEqual({});
    });
  });
/*
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
*/