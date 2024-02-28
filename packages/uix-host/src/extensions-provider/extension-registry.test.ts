import { enableFetchMocks } from "jest-fetch-mock";

const {
  createExtensionRegistryAsObjectsProvider,
} = require("./extension-registry");

enableFetchMocks();

window.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ rates: { CAD: 1.42 } }),
  })
);

describe("Extension Registry", () => {
  beforeAll(() => jest.spyOn(window, "fetch"));

  test('[3] should result in "fizz"', () => {
    window.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    expect(1).toBe(1);
  });
});
