import { Host } from "./host";

// Mock Port entirely -- these tests are about Host.addLoadsNewGuests/
// loadOneGuest's tracing, not about real iframe connection behavior (which
// port.test.ts already covers).
const loadBehaviors = new Map<string, () => Promise<void>>();

jest.mock("./port", () => {
  class MockPort {
    id: string;
    url: URL;
    error?: Error;

    constructor(config: { id: string; url: URL }) {
      this.id = config.id;
      this.url = config.url;
    }

    async load() {
      const behavior = loadBehaviors.get(this.id);
      try {
        await behavior?.();
      } catch (e) {
        this.error = e instanceof Error ? e : new Error(String(e));
        throw e;
      }
    }
  }
  return { Port: MockPort };
});

function createHost() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return new Host({ hostName: "test-host", runtimeContainer: container });
}

describe("Host", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    loadBehaviors.clear();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    window.__UIX_DEBUG__?.disable();
  });

  describe("uix-host tracing", () => {
    it("logs nothing while the uix-host namespace is disabled", async () => {
      loadBehaviors.set("working", async () => undefined);
      const host = createHost();

      await host.load({ working: "https://example.com/working" });

      expect(logSpy).not.toHaveBeenCalled();
    });

    it("logs batch start/settle and per-guest connect outcomes once enabled", async () => {
      loadBehaviors.set("working", async () => undefined);
      loadBehaviors.set("broken", async () => {
        throw new Error("connect failed");
      });
      window.__UIX_DEBUG__?.enable("uix-host");
      const host = createHost();

      await host.load({
        broken: "https://example.com/broken",
        working: "https://example.com/working",
      });

      const lines = logSpy.mock.calls.map(([line]: [string]) => line);

      expect(
        lines.some((line) => line.includes("addLoadsNewGuests batch start"))
      ).toBe(true);
      expect(
        lines.some((line) => line.includes('"batchIds":["broken","working"]'))
      ).toBe(true);

      expect(
        lines.some(
          (line) =>
            line.includes("loadOneGuest connect start") &&
            line.includes('"id":"working"')
        )
      ).toBe(true);
      expect(
        lines.some(
          (line) =>
            line.includes("loadOneGuest connect succeeded") &&
            line.includes('"id":"working"')
        )
      ).toBe(true);
      expect(
        lines.some(
          (line) =>
            line.includes("loadOneGuest connect failed") &&
            line.includes('"id":"broken"') &&
            line.includes("connect failed")
        )
      ).toBe(true);

      const settled = lines.find((line) =>
        line.includes("addLoadsNewGuests batch settled")
      );
      expect(settled).toContain('"failedIds":["broken"]');
      expect(settled).toContain('"loadedIds":["working"]');
    });

    it("does not log for a namespace that was never enabled", async () => {
      loadBehaviors.set("working", async () => undefined);
      window.__UIX_DEBUG__?.enable("some-other-namespace");
      const host = createHost();

      await host.load({ working: "https://example.com/working" });

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
