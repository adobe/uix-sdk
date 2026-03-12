import type { CrossRealmObject, Emits } from "@adobe/uix-core";
import { connectIframe, Emitter } from "@adobe/uix-core";
import { Port } from "./port";

// Mock connectIframe from uix-core
jest.mock("@adobe/uix-core", () => {
  const actual = jest.requireActual("@adobe/uix-core");

  return {
    ...actual,
    connectIframe: jest.fn(),
  };
});

// Mock normalizeIframe as a no-op
jest.mock("./dom-utils", () => ({
  normalizeIframe: jest.fn(),
}));

const mockConnectIframe = connectIframe as jest.MockedFunction<
  typeof connectIframe
>;

function createMockConnectIframe(guestVersion: string) {
  const fakeRemoteApi = {
    apis: {},
    emit: jest.fn(),
    metadata: {},
  };
  const fakeCrossRealmObject = {
    getRemoteApi: () => fakeRemoteApi,
  } as unknown as CrossRealmObject<any>;

  mockConnectIframe.mockImplementation(
    async (_frame, _opts, _api, versionCallback) => {
      if (versionCallback) {
        versionCallback(guestVersion);
      }

      return fakeCrossRealmObject;
    },
  );
}

let containers: HTMLElement[] = [];

function createPort(options?: { timeout?: number }) {
  const container = document.createElement("div");

  document.body.appendChild(container);
  containers.push(container);
  const events = new Emitter("test-events") as unknown as Emits;

  const port = new Port({
    events,
    extensionPoints: ["test-ep"],
    id: "test-extension",
    options: { timeout: options?.timeout ?? 20000 },
    owner: "test-owner",
    runtimeContainer: container,
    sharedContext: {},
    url: new URL("https://example.com/extension"),
  });

  return { container, port };
}

describe("Port", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockConnectIframe.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    for (const c of containers) {
      c.remove();
    }

    containers = [];
  });

  describe("guest-ready behavior", () => {
    it("should not create guestReady timeout for guests < 1.1.4", async () => {
      createMockConnectIframe("1.0.1");
      const { port } = createPort();

      const loadPromise = port.load();

      // Flush the microtask queue so attachFrame resolves
      await jest.runAllTimersAsync();
      await loadPromise;

      // Port should be ready without needing a guest-ready message
      expect(port.isReady()).toBe(true);

      // Advance timers past the 20s timeout — should NOT cause an unhandled rejection
      jest.advanceTimersByTime(25000);
    });

    it("should wait for guest-ready message for guests >= 1.1.4", async () => {
      jest.useRealTimers();
      createMockConnectIframe("1.1.4");

      const { port, container } = createPort({ timeout: 10000 });
      const loadPromise = port.load();

      await new Promise((r) => setTimeout(r, 50));

      expect(port.isReady()).toBe(false);

      // Get the iframe from OUR container (not other tests' iframes)
      const iframe = container.querySelector("iframe") as HTMLIFrameElement;
      const fakeEvent = new MessageEvent("message", {
        data: { guestId: "test-extension", type: "guest-ready" },
        source: iframe.contentWindow,
      });

      window.dispatchEvent(fakeEvent);

      await loadPromise;

      expect(port.isReady()).toBe(true);
      jest.useFakeTimers();
    }, 15000);

    it("should reject with timeout error if guest >= 1.1.4 never sends ready", async () => {
      createMockConnectIframe("1.1.4");
      const { port } = createPort({ timeout: 5000 });

      const loadPromise = port.load();

      // Let attachFrame resolve
      await Promise.resolve();
      await Promise.resolve();

      // Advance past timeout
      jest.advanceTimersByTime(6000);

      await expect(loadPromise).rejects.toThrow(
        "did not send ready message within 5000ms",
      );
    });
  });
});
