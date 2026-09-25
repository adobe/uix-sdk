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
  config?: { timeout?: number; callTimeout?: number }
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

  // A host method call used to be subject to a hardcoded 10000ms timeout in
  // guest.ts's `host` proxy, decoupled from GuestConfig.timeout (which only
  // ever governed the initial connectParentWindow handshake, not per-call
  // RPC timeouts). This meant any call that legitimately took between 10s
  // and 20s (e.g. because the host was still resolving a load batch
  // containing an unrelated slow/broken guest) failed with a false "timed
  // out" error, since Port's own connection timeout defaults to 20000ms
  // (port.ts's defaultOptions.timeout) -- longer than the old 10000ms call
  // ceiling.
  //
  // The fix: GuestConfig.callTimeout, independent of GuestConfig.timeout,
  // defaulting to 20000ms to match Port's default.
  it("uses the default 20000ms call timeout, independent of a smaller GuestConfig.timeout (connect timeout)", async () => {
    // Never resolves/rejects: simulates a host method call that is still
    // legitimately in flight (e.g. the host is mid-batch loading a sibling
    // extension) rather than one that has actually failed.
    const invokeHostMethod = jest.fn(() => new Promise(() => undefined));
    // A small connect timeout should have no bearing on the call timeout.
    const guest = await connectGuest(invokeHostMethod, { timeout: 5000 });

    const callPromise = guest.host.someNamespace.someMethod();
    const assertion = expect(callPromise).rejects.toThrow(
      "timed out after 20000ms"
    );

    await jest.advanceTimersByTimeAsync(20001);
    await assertion;
  });

  it("times out a host method call at 20000ms with no config set (default)", async () => {
    const invokeHostMethod = jest.fn(() => new Promise(() => undefined));
    const guest = await connectGuest(invokeHostMethod);

    const callPromise = guest.host.someNamespace.someMethod();
    const assertion = expect(callPromise).rejects.toThrow(
      "timed out after 20000ms"
    );

    await jest.advanceTimersByTimeAsync(20001);
    await assertion;
  });

  it("respects an explicit GuestConfig.callTimeout override", async () => {
    const invokeHostMethod = jest.fn(() => new Promise(() => undefined));
    const guest = await connectGuest(invokeHostMethod, { callTimeout: 5000 });

    const callPromise = guest.host.someNamespace.someMethod();
    const assertion = expect(callPromise).rejects.toThrow(
      "timed out after 5000ms"
    );

    await jest.advanceTimersByTimeAsync(5001);
    await assertion;
  });

  it("succeeds when the host responds comfortably inside the call timeout (control case)", async () => {
    const invokeHostMethod = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("ok"), 500))
    );
    const guest = await connectGuest(invokeHostMethod);

    const callPromise = guest.host.someNamespace.someMethod();
    const assertion = expect(callPromise).resolves.toBe("ok");

    await jest.advanceTimersByTimeAsync(501);
    await assertion;
  });

  // The scenario from the investigation: a call that resolves at 12000ms --
  // past the old, buggy 10000ms ceiling, but comfortably inside the new
  // 20000ms default -- now succeeds instead of spuriously timing out.
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
