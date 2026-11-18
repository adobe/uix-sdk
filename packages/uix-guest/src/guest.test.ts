import { Guest } from "./guest";
import type { HostMethodAddress } from "@adobe/uix-core";

function createGuest() {
  return new Guest<any>({ id: "test-guest" });
}

const address: HostMethodAddress = {
  args: [],
  name: "get",
  path: ["editorState"],
};

describe("Guest invokeChecker tracing", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    logSpy.mockRestore();
    window.__UIX_DEBUG__?.disable();
  });

  it("logs nothing while the uix-guest namespace is disabled", async () => {
    const guest = createGuest();
    const invoker = jest.fn().mockResolvedValue("value");

    await (guest as any).invokeChecker(invoker, address);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("logs a single attempt/succeeded pair for a call that resolves on the first try", async () => {
    const guest = createGuest();
    const invoker = jest.fn().mockResolvedValue("value");
    window.__UIX_DEBUG__?.enable("uix-guest");

    await (guest as any).invokeChecker(invoker, address);

    const lines = logSpy.mock.calls.map(([line]: [string]) => line);
    expect(
      lines.some(
        (line) =>
          line.includes("invokeChecker attempt") && line.includes('"attempt":0')
      )
    ).toBe(true);
    expect(
      lines.some(
        (line) =>
          line.includes("invokeChecker succeeded") &&
          line.includes('"attempt":0')
      )
    ).toBe(true);
  });

  it("logs a failed attempt and retries with an incrementing attempt count and stable callId", async () => {
    const guest = createGuest();
    const invoker = jest
      .fn()
      .mockRejectedValueOnce(new Error("not ready"))
      .mockResolvedValueOnce("value");
    window.__UIX_DEBUG__?.enable("uix-guest");

    const resultPromise = (guest as any).invokeChecker(
      invoker,
      address
    ) as Promise<unknown>;
    await jest.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toBe("value");
    const lines = logSpy.mock.calls.map(([line]: [string]) => line);

    const failedLine = lines.find((line) =>
      line.includes("invokeChecker failed")
    );
    expect(failedLine).toContain('"attempt":0');
    expect(failedLine).toContain("not ready");

    const retryAttemptLine = lines.find(
      (line) =>
        line.includes("invokeChecker attempt") && line.includes('"attempt":1')
    );
    expect(retryAttemptLine).toBeDefined();

    const succeededLine = lines.find((line) =>
      line.includes("invokeChecker succeeded")
    );
    expect(succeededLine).toContain('"attempt":1');

    // Every line for this call shares one callId, generated once at the top of the retry chain.
    const callIds = new Set(
      lines.map((line) => (line.match(/"callId":"(\w+)"/) ?? [])[1])
    );
    expect(callIds.size).toBe(1);
    expect([...callIds][0]).toEqual(expect.stringMatching(/^[a-z0-9]+$/));
  });
});
