import fetch, { enableFetchMocks } from "jest-fetch-mock";
import fetchMock from "jest-fetch-mock";

const {
  createExtensionRegistryAsObjectsProvider,
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
          name: "my-test-extn",
          endpoints: {
            "myservice/testextpoint/1": {
              view: [
                {
                  href: "https://example.com/index.html",
                },
              ],
            },
          },
          status: "PUBLISHED",
        },
        {
          name: "my-test-extn-1",
          endpoints: {
            "myservice/testextpoint/1": {
              view: [
                {
                  href: "https://example.com/index.html",
                },
              ],
            },
          },
          status: "DRAFT",
        },
      ])
    );

    const config = {
      service: "myservice",
      extensionPoint: "testextpoint",
      version: "1",
      imsOrg: "test-org",
      baseUrl: "http://example.com",
      apiKey: "test-key",
      auth: {
        schema: "Basic",
        imsToken: "test-token",
      },
    };
    const extensionRegistry = createExtensionRegistryAsObjectsProvider(config);
    const extensions = await extensionRegistry();

    expect(extensions).toEqual({
      "my-test-extn": {
        id: "my-test-extn",
        url: "https://example.com/index.html",
        extensionPoints: ["myservice/testextpoint/1"],
      },
    });
    expect(extensions).not.toContain({
      "my-test-extn-1": {
        id: "my-test-extn-1",
        url: "https://example.com/index.html",
        extensionPoints: ["myservice/testextpoint/1"],
      },
    });
  });
});
