import { timeoutPromise } from "./timed";
import { wait } from "./wait";

describe("promise wrappers", () => {
  const DONE = {};
  const finish = jest.fn().mockReturnValue(DONE);

  beforeEach(() => {
    finish.mockClear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  describe("wait(ms)", () => {
    it("returns a promise that resolves after n ms", async () => {
      const sayDone = wait(500).then(finish);

      jest.advanceTimersByTime(300);
      expect(finish).not.toHaveBeenCalled();
      jest.advanceTimersByTime(300);
      await expect(sayDone).resolves.toBe(DONE);
      expect(finish).toHaveBeenCalled();
    });
  });
  describe("timeoutPromise(promise, ms, cleanup) returns a promise", () => {
    const cleanup = jest.fn();

    beforeEach(() => cleanup.mockReset());
    it("that resolves with the original promise within ms", async () => {
      const makesIt = timeoutPromise(
        "should not fail",
        wait(50).then(finish),
        100,
        cleanup,
      );

      jest.advanceTimersByTime(75);
      await expect(makesIt).resolves.toBe(DONE);
      expect(cleanup).not.toHaveBeenCalled();
    });
    it("that rejects if the original promise did not resolve within ms", async () => {
      const makesIt = timeoutPromise(
        "took too long",
        wait(200).then(finish),
        100,
        cleanup,
      );

      jest.advanceTimersByTime(200);
      await expect(makesIt)
        .rejects // eslint-disable-next-line sonarjs/deprecation
        .toThrowError("took too long timed out after 100ms");
      expect(cleanup).toHaveBeenCalled();
    });
    it("runs the cleanup function if the promise rejects before timeout", async () => {
      const ngmi = timeoutPromise(
        "not a chance",
        Promise.reject(new Error("loool")),
        100,
        cleanup,
      );

      jest.advanceTimersByTime(50);
      await expect(ngmi)
        .rejects // eslint-disable-next-line sonarjs/deprecation
        .toThrowError("loool");
      expect(cleanup).toHaveBeenCalled();
    });
  });
});
