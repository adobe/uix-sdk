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

import type { ExtensionPointId } from "./ExtensionManagerProvider";
import {
  createUrlExtensionsProvider,
  generateExtensionId,
} from "./UrlExtensionProvider";

describe("generateExtensionId", () => {
  it("should replace non-word characters with underscores", () => {
    const url = "https://example.com/some/path";

    expect(generateExtensionId(url)).toBe("https___example_com_some_path");
  });

  it("should return the same ID when there are no non-word characters", () => {
    const url = "extension_1";

    expect(generateExtensionId(url)).toBe("extension_1");
  });
});

describe("createUrlExtensionsProvider", () => {
  const mockExtensionPointId: ExtensionPointId = {
    name: "name1",
    service: "service1",
    version: "version1",
  };

  it("should return an ExtensionsProvider that provides installed extensions", async () => {
    const queryString =
      "ext=https://example1.com&ext.service1/name1/version1=https://example2.com";
    const provider = createUrlExtensionsProvider(
      mockExtensionPointId,
      queryString,
    );

    const extensions = await provider();

    expect(Object.keys(extensions)).toHaveLength(2);
    expect(extensions).toHaveProperty("https___example1_com");
    expect(extensions).toHaveProperty("https___example2_com");
    expect(extensions["https___example2_com"]).toHaveProperty(
      "url",
      "https://example2.com",
    );
  });

  it("should return an empty object if no valid extensions are found in the query string", async () => {
    const queryString = "foo=bar&baz=qux";
    const provider = createUrlExtensionsProvider(
      mockExtensionPointId,
      queryString,
    );

    const extensions = await provider();

    expect(extensions).toEqual({});
  });

  it("should filter extensions by the correct extension point", async () => {
    const queryString =
      "ext.service1/name1/version1=https://example1.com&ext.service2/name2/version2=https://www.test.";
    const provider = createUrlExtensionsProvider(
      mockExtensionPointId,
      queryString,
    );

    const extensions = await provider();

    expect(extensions).toHaveProperty("https___example1_com");
  });

  it("should return an empty object when the query string does not match the expected extension point", async () => {
    const queryString = "ext.service2.name2.version2=https://example1.com";
    const provider = createUrlExtensionsProvider(
      mockExtensionPointId,
      queryString,
    );

    const extensions = await provider();

    expect(extensions).toEqual({});
  });
});
