import fetch, { enableFetchMocks } from "jest-fetch-mock";

const {
  createExtensionRegistryAsObjectsProvider,
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
} = require("./extension-registry");

enableFetchMocks();

const BASE_CONFIG = {
  apiKey: "test-key",
  auth: {
    imsToken: "test-token",
    schema: "Basic" as const,
  },
  baseUrl: "http://example.com",
  extensionPoint: "testextpoint",
  imsOrg: "test-org",
  service: "myservice",
  version: "1",
};

const PUBLISHED_EXTENSION = {
  endpoints: {
    "myservice/testextpoint/1": {
      view: [{ href: "https://example.com/index.html" }],
    },
  },
  name: "my-test-extn",
  status: "PUBLISHED",
};

const DRAFT_EXTENSION = {
  ...PUBLISHED_EXTENSION,
  name: "my-draft-extn",
  status: "DRAFT",
};

describe("Extension Registry", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  describe("createExtensionRegistryProvider() — deprecated", () => {
    test("returns only PUBLISHED extensions as url strings", async () => {
      fetch.mockResponseOnce(
        JSON.stringify([PUBLISHED_EXTENSION, DRAFT_EXTENSION]),
      );

      const extensionRegistry =
        // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
        require("./extension-registry").createExtensionRegistryProvider(
          BASE_CONFIG,
        );
      const extensions = await extensionRegistry();

      // The dead code `return Promise.resolve({})` on line 148 of extension-registry.ts
      // is unreachable — the function always returns the fetch result. These tests confirm
      // that real fetch results are returned, not the empty fallback.
      expect(extensions).toEqual({
        "my-test-extn": "https://example.com/index.html",
      });
      expect(extensions).not.toHaveProperty("my-draft-extn");
    });

    test("rejects when the registry returns a non-200 response — not silently returns {}", async () => {
      fetch.mockResponseOnce("Unauthorized", { status: 401 });

      const extensionRegistry =
        // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
        require("./extension-registry").createExtensionRegistryProvider(
          BASE_CONFIG,
        );

      // If the dead code were reachable (e.g. in a catch block), this would resolve to {}.
      // It should reject instead.
      await expect(extensionRegistry()).rejects.toThrow(
        "extension registry returned non-200 response (401)",
      );
    });
  });

  test("createExtensionRegistryAsObjectsProvider()() should return published extension objects", async () => {
    fetch.mockResponseOnce(
      JSON.stringify([
        {
          endpoints: {
            "myservice/testextpoint/1": {
              view: [
                {
                  href: "https://example.com/index.html",
                },
              ],
            },
          },
          name: "my-test-extn",
          status: "PUBLISHED",
        },
        {
          endpoints: {
            "myservice/testextpoint/1": {
              view: [
                {
                  href: "https://example.com/index.html",
                },
              ],
            },
          },
          name: "my-test-extn-1",
          status: "DRAFT",
        },
      ]),
    );

    const config = {
      apiKey: "test-key",
      auth: {
        imsToken: "test-token",
        schema: "Basic",
      },
      baseUrl: "http://example.com",
      extensionPoint: "testextpoint",
      imsOrg: "test-org",
      service: "myservice",
      version: "1",
    };
    const extensionRegistry = createExtensionRegistryAsObjectsProvider(config);
    const extensions = await extensionRegistry();

    expect(extensions).toEqual({
      "my-test-extn": {
        extensionPoints: ["myservice/testextpoint/1"],
        id: "my-test-extn",
        url: "https://example.com/index.html",
      },
    });
    expect(extensions).not.toContain({
      "my-test-extn-1": {
        extensionPoints: ["myservice/testextpoint/1"],
        id: "my-test-extn-1",
        url: "https://example.com/index.html",
      },
    });
  });
});
