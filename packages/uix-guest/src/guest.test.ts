import { Guest } from "./guest";
import type {
  CrossRealmObject,
  GuestApis,
  HostConnection,
} from "@adobe/uix-core";

interface TestHostApis extends GuestApis {
  someNamespace: { someMethod: () => Promise<unknown> };
}

type TestGuest = Guest<{
  incoming: TestHostApis;
  outgoing: GuestApis;
  sharedContext: Record<string, unknown>;
}>;

// Mock connectParentWindow from uix-core so we can control the guest's
// "host connection" without a real postMessage handshake.
jest.mock("@adobe/uix-core", () => {
  const actual = jest.requireActual("@adobe/uix-core");
  return {
    ...actual,
    connectParentWindow: jest.fn(),
  };
});

import { connectParentWindow } from "@adobe/uix-core";
const mockConnectParentWindow = connectParentWindow as jest.MockedFunction<
  typeof connectParentWindow
>;

function connectGuest(
  invokeHostMethod: jest.Mock,
  config?: { timeout?: number }
) {
  const fakeRemoteApi = {
    invokeHostMethod,
    getSharedContext: jest.fn().mockResolvedValue({}),
    getConfiguration: jest.fn().mockResolvedValue({}),
  };
  const fakeHostConnection = {
    getRemoteApi: () => fakeRemoteApi,
  } as unknown as CrossRealmObject<HostConnection>;

  mockConnectParentWindow.mockResolvedValue(fakeHostConnection);

  const guest: TestGuest = new Guest({ id: "test-guest", ...config });
  return guest.connect().then(() => guest);
}

describe("Guest host-method call timeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockConnectParentWindow.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Characterizes the bug from the extension-loading-timeout investigation
  // (docs/extension-loading-timeout-investigation.md): a call to a host
  // method is subject to a hardcoded 10000ms timeout in guest.ts's `host`
  // proxy, which is completely independent of GuestConfig.timeout. That
  // config option (see guest.ts's `this.timeout`) only governs the initial
  // connectParentWindow handshake, not per-call RPC timeouts -- there is
  // currently no way to configure the latter at all.
  it("times out a host method call at 10000ms even when GuestConfig.timeout is set much higher", async () => {
    // Never resolves/rejects: simulates a host method call that is still
    // legitimately in flight (e.g. the host is mid-batch loading a sibling
    // extension) rather than one that has actually failed.
    const invokeHostMethod = jest.fn(() => new Promise(() => undefined));
    const guest = await connectGuest(invokeHostMethod, { timeout: 20000 });

    const callPromise = guest.host.someNamespace.someMethod();
    const assertion = expect(callPromise).rejects.toThrow(
      "timed out after 10000ms"
    );

    await jest.advanceTimersByTimeAsync(10001);
    await assertion;
  });

  it("times out a host method call at the same 10000ms with no GuestConfig.timeout set (default config)", async () => {
    const invokeHostMethod = jest.fn(() => new Promise(() => undefined));
    const guest = await connectGuest(invokeHostMethod);

    const callPromise = guest.host.someNamespace.someMethod();
    const assertion = expect(callPromise).rejects.toThrow(
      "timed out after 10000ms"
    );

    await jest.advanceTimersByTimeAsync(10001);
    await assertion;
  });

  it("succeeds when the host responds comfortably inside 10000ms (control case)", async () => {
    const invokeHostMethod = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("ok"), 500))
    );
    const guest = await connectGuest(invokeHostMethod);

    const callPromise = guest.host.someNamespace.someMethod();
    const assertion = expect(callPromise).resolves.toBe("ok");

    await jest.advanceTimersByTimeAsync(501);
    await assertion;
  });

  // RED TEST -- expected to FAIL until the fix for the extension-loading-
  // timeout bug lands (docs/extension-loading-timeout-investigation.md).
  // `uix-host`'s Port connection timeout defaults to 20000ms (port.ts's
  // defaultOptions.timeout), longer than uix-guest's current hardcoded
  // 10000ms call timeout -- so any host method call that legitimately takes
  // between 10s and 20s (e.g. because the host is still resolving a load
  // batch containing an unrelated slow/broken guest) fails with a false
  // "timed out" error today. Once the guest-side call timeout is raised or
  // made configurable to be >= 20000ms (or otherwise decoupled from this
  // hardcoded value), a call resolving at 12000ms should succeed instead of
  // spuriously timing out, and this test will go green with no changes to
  // the test itself.
  it("does not time out a call that resolves at 12000ms, past the old 10000ms ceiling", async () => {
    const invokeHostMethod = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("ok"), 12000))
    );
    const guest = await connectGuest(invokeHostMethod);

    const callPromise = guest.host.someNamespace.someMethod();
    const assertion = expect(callPromise).resolves.toBe("ok");

    await jest.advanceTimersByTimeAsync(12001);
    await assertion;
  });
});
