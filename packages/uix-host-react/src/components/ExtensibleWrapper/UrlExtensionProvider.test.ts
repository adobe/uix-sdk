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

import {
  extractExtUrlParams,
  generateExtensionId,
  createUrlExtensionsProvider,
} from "./UrlExtensionProvider";
import { ExtensionPointId } from "./ExtensionManagerProvider";
describe("extractExtUrlParams", () => {
  it("should return an empty object when no query string is provided", () => {
    expect(extractExtUrlParams(undefined)).toEqual({});
  });

  it("should return an empty object when the query string does not contain any valid extension params", () => {
    expect(extractExtUrlParams("foo=bar&baz=qux")).toEqual({});
  });

  it("should extract valid extension params", () => {
    const queryString =
      "ext=javascript:alert(document.domain)&ext.service1.name1.version1=http://example.com";
    const expectedParams = {
      "ext.service1.name1.version1": "http://example.com",
    };
    expect(extractExtUrlParams(queryString)).toEqual(expectedParams);
  });

  it('should only include params with the "ext" prefix', () => {
    const queryString =
      "ext=http://example2.com&other=bar&ext.service1.name1.version1=http://example.com";
    const expectedParams = {
      ext: "http://example2.com",
      "ext.service1.name1.version1": "http://example.com",
    };
    expect(extractExtUrlParams(queryString)).toEqual(expectedParams);
  });
});

describe("generateExtensionId", () => {
  it("should replace non-word characters with underscores", () => {
    const url = "http://example.com/some/path";
    expect(generateExtensionId(url)).toBe("http___example_com_some_path");
  });

  it("should return the same ID when there are no non-word characters", () => {
    const url = "extension_1";
    expect(generateExtensionId(url)).toBe("extension_1");
  });
});

describe("createUrlExtensionsProvider", () => {
  const mockExtensionPointId: ExtensionPointId = {
    service: "service1",
    name: "name1",
    version: "version1",
  };

  it("should return an ExtensionsProvider that provides installed extensions", async () => {
    const queryString =
      "ext=http://example1.com&ext.service1/name1/version1=http://example2.com";
    const provider = createUrlExtensionsProvider(
      mockExtensionPointId,
      queryString
    );

    const extensions = await provider();
    expect(Object.keys(extensions)).toHaveLength(2);
    expect(extensions).toHaveProperty("http___example1_com");
    expect(extensions).toHaveProperty("http___example2_com");
    expect(extensions["http___example2_com"]).toHaveProperty(
      "url",
      "http://example2.com"
    );
  });

  it("should return an empty object if no valid extensions are found in the query string", async () => {
    const queryString = "foo=bar&baz=qux";
    const provider = createUrlExtensionsProvider(
      mockExtensionPointId,
      queryString
    );

    const extensions = await provider();
    expect(extensions).toEqual({});
  });

  it("should filter extensions by the correct extension point", async () => {
    const queryString =
      "ext.service1/name1/version1=http://example1.com&ext.service2/name2/version2=https://www.test.";
    const provider = createUrlExtensionsProvider(
      mockExtensionPointId,
      queryString
    );

    const extensions = await provider();
    expect(extensions).toHaveProperty("http___example1_com");
  });

  it("should return an empty object when the query string does not match the expected extension point", async () => {
    const queryString = "ext.service2.name2.version2=http://example1.com";
    const provider = createUrlExtensionsProvider(
      mockExtensionPointId,
      queryString
    );

    const extensions = await provider();
    expect(extensions).toEqual({});
  });
});
