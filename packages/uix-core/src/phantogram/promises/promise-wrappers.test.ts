import { wait } from "./wait";
import { timeoutPromise } from "./timed";
import { defer } from "./deferred";

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
        cleanup
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
        cleanup
      );
      jest.advanceTimersByTime(200);
      await expect(makesIt).rejects.toThrowError(
        "took too long timed out after 100ms"
      );
      expect(cleanup).toHaveBeenCalled();
    });
    it("runs the cleanup function if the promise rejects before timeout", async () => {
      const ngmi = timeoutPromise(
        "not a chance",
        Promise.reject(new Error("loool")),
        100,
        cleanup
      );
      jest.advanceTimersByTime(50);
      await expect(ngmi).rejects.toThrowError("loool");
      expect(cleanup).toHaveBeenCalled();
    });
  });
  describe("defer() returns a {promise, resolve, reject} tuple", () => {
    it("can be resolved externally", async () => {
      const deferred = defer();
      jest.advanceTimersByTime(50);
      deferred.resolve(DONE);
      await expect(deferred.promise).resolves.toBe(DONE);
    });
    it("can be rejected externally", async () => {
      const deferred = defer();
      jest.advanceTimersByTime(50);
      deferred.reject(new Error("nope"));
      await expect(deferred.promise).rejects.toThrowError("nope");
    });
    it("can be resolved synchronously", async () => {
      jest.useRealTimers();
      const deferred = defer();
      deferred.resolve(DONE);
      await expect(deferred.promise).resolves.toBe(DONE);
    });
    it("can be rejected synchronously", async () => {
      jest.useRealTimers();
      const deferred = defer();
      deferred.reject(new Error("nope"));
      await expect(deferred.promise).rejects.toThrowError("nope");
    });
  });
});
