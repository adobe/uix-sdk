import fetch, { enableFetchMocks } from "jest-fetch-mock";

const {
  createExtensionRegistryAsObjectsProvider,
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
} = require("./extension-registry");

enableFetchMocks();

describe("Extension Registry", () => {
  beforeEach(() => {
    fetch.resetMocks();
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
