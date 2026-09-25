// Mock Port so Host's batching/event behavior can be tested without a real
// iframe handshake. Each fake Port's load() resolves/rejects after a
// controllable delay, standing in for a fast-connecting guest or one that
// never responds (e.g. a 404'd extension) until Port's own connect timeout.
jest.mock("./port.js", () => ({ Port: jest.fn() }));

import { Port } from "./port.js";
import { Host } from "./host";

const MockPort = Port as unknown as jest.Mock;

interface FakePortBehavior {
  /** load() resolves successfully after this many ms. */
  readyAfterMs?: number;
  /** load() rejects (guest never connected) after this many ms. */
  failAfterMs?: number;
}

function installFakePorts(behaviors: Record<string, FakePortBehavior>) {
  MockPort.mockImplementation((config: { id: string; url: URL }) => {
    const behavior = behaviors[config.id] ?? { readyAfterMs: 0 };
    const instance: Record<string, unknown> & {
      _ready: boolean;
      error?: Error;
    } = {
      id: config.id,
      url: config.url,
      _ready: false,
      error: undefined,
      isReady: () => instance._ready,
      unload: jest.fn().mockResolvedValue(undefined),
      hasCapabilities: jest.fn().mockReturnValue(true),
    };
    instance.load = jest.fn(async () => {
      if (behavior.failAfterMs !== undefined) {
        await new Promise((resolve) =>
          setTimeout(resolve, behavior.failAfterMs)
        );
        instance.error = new Error(
          `Guest ${config.id} did not send ready message within ${behavior.failAfterMs}ms`
        );
        throw instance.error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, behavior.readyAfterMs ?? 0)
      );
      instance._ready = true;
    });
    return instance;
  });
}

function createHost() {
  return new Host({ hostName: "test-host", disableMetrics: true });
}

describe("Host guest-loading events", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockPort.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    document
      .querySelectorAll("[data-uix-guest-container]")
      .forEach((el) => el.remove());
  });

  // Documents the mechanism that, once consumed correctly, already avoids
  // the bug from the extension-loading-timeout investigation: the per-guest
  // "guestload" event (and getLoadedGuests()/isReady()) reflect a healthy
  // guest immediately, without waiting for a broken sibling guest's full
  // connection timeout. (universal-editor's Api.ts bug was subscribing to
  // the batch-level "loadallguests" event instead of this one.)
  it("fires 'guestload' for a healthy guest well before a broken sibling's connection timeout elapses", async () => {
    installFakePorts({
      healthy: { readyAfterMs: 50 },
      broken: { failAfterMs: 20000 },
    });

    const host = createHost();
    const guestloadTimes: string[] = [];
    host.addEventListener("guestload", (event) => {
      const { guest } = (event as CustomEvent<{ guest: { id: string } }>)
        .detail;
      guestloadTimes.push(guest.id);
    });

    const loadPromise = host.load({
      healthy: "https://example.com/healthy",
      broken: "https://example.com/broken",
    });

    await jest.advanceTimersByTimeAsync(51);
    expect(guestloadTimes).toEqual(["healthy"]);
    expect(host.getLoadedGuests().map((g) => g.id)).toEqual(["healthy"]);

    await jest.advanceTimersByTimeAsync(20000);
    await loadPromise;
    expect(guestloadTimes).toEqual(["healthy"]);
  });

  // Documents that Promise.all-based batching in addLoadsNewGuests is
  // intentional: "loadallguests" is a whole-cohort signal and correctly
  // waits for the slowest/broken guest to settle. This is by design, not
  // the bug -- consumers that need a guest's methods as soon as that guest
  // is ready should use "guestload"/getLoadedGuests() instead, as the test
  // above demonstrates.
  it("only fires 'loadallguests' once every guest in the batch has settled, including a broken one", async () => {
    installFakePorts({
      healthy: { readyAfterMs: 50 },
      broken: { failAfterMs: 20000 },
    });

    type LoadAllGuestsDetail = {
      failed: { id: string }[];
      loaded: { id: string }[];
    };
    const host = createHost();
    let loadAllGuestsDetail: LoadAllGuestsDetail | undefined;
    host.addEventListener("loadallguests", (event) => {
      loadAllGuestsDetail = (event as CustomEvent<LoadAllGuestsDetail>).detail;
    });

    const loadPromise = host.load({
      healthy: "https://example.com/healthy",
      broken: "https://example.com/broken",
    });

    await jest.advanceTimersByTimeAsync(19999);
    expect(loadAllGuestsDetail).toBeUndefined();

    await jest.advanceTimersByTimeAsync(2);
    await loadPromise;

    expect(loadAllGuestsDetail).toBeDefined();
    expect(loadAllGuestsDetail?.loaded.map((g) => g.id)).toEqual(["healthy"]);
    expect(loadAllGuestsDetail?.failed.map((g) => g.id)).toEqual(["broken"]);
  });
});
