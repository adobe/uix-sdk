/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import type { HostMethodAddress, RemoteMethodInvoker } from "@adobe/uix-core";

import { Guest } from "./guest";

const testAddress: HostMethodAddress = {
  args: [],
  name: "testMethod",
  path: ["testNamespace"],
};

// Helper to access private methods for testing
type GuestPrivate = {
  invokeChecker: (
    invoker: RemoteMethodInvoker<unknown>,
    address: HostMethodAddress,
  ) => Promise<unknown>;
  invokeAwaiter: (
    invoker: RemoteMethodInvoker<unknown>,
    address: HostMethodAddress,
  ) => Promise<unknown>;
};

describe("Guest.invokeAwaiter()", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should resolve when the host method becomes available", async () => {
    const guest = new Guest({ id: "test-guest" });
    const expectedResult = { value: 42 };

    jest
      .spyOn(guest as unknown as GuestPrivate, "invokeChecker")
      .mockResolvedValue(expectedResult);

    const result = await (guest as unknown as GuestPrivate).invokeAwaiter(
      jest.fn(),
      testAddress,
    );

    expect(result).toBe(expectedResult);
  });

  it("BUG: setTimeout callback returns an unhandled rejected Promise instead of rejecting the returned promise", async () => {
    // Intercept setTimeout to capture the 20s timeout callback without
    // triggering a real timer (and without jest fake timers, which prevent
    // Promise microtasks from settling in this test environment).
    const capturedCallbacks: Array<() => unknown> = [];

    jest.spyOn(global, "setTimeout").mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cb: any, ms?: number) => {
        if (ms === 20000) {
          capturedCallbacks.push(cb);

          return 0 as unknown as ReturnType<typeof setTimeout>;
        }

        return 0 as unknown as ReturnType<typeof setTimeout>;
      },
    );

    const guest = new Guest({ id: "test-guest" });

    // invokeChecker never resolves — simulates the host method not existing
    jest
      .spyOn(guest as unknown as GuestPrivate, "invokeChecker")
      .mockReturnValue(
        new Promise(() => {
          /* noop */
        }),
      );

    let isSettled = false;

    (guest as unknown as GuestPrivate)
      .invokeAwaiter(jest.fn(), testAddress)
      .then(
        () => {
          isSettled = true;
        },
        () => {
          isSettled = true;
        },
      );

    await Promise.resolve(); // flush initial microtasks

    expect(capturedCallbacks).toHaveLength(1);

    // Fire the 20-second timeout callback manually
    const callbackResult = capturedCallbacks[0]();

    // BUG (1): The callback returns a rejected Promise — this is an unhandled
    // rejection. The correct fix would be to reject the invokeAwaiter promise
    // via a mechanism that's connected to the outer async function (e.g.
    // Promise.race or a reject handle captured from the outer promise).
    expect(callbackResult).toBeInstanceOf(Promise);
    // Handle the rejection here so it doesn't become an unhandled rejection
    await expect(callbackResult as Promise<unknown>).rejects.toMatch(
      /doesn't exist/,
    );

    await Promise.resolve(); // flush remaining microtasks

    // BUG (2): The awaiterPromise is still pending — the setTimeout callback
    // rejection was never connected to it, so the caller will wait forever.
    expect(isSettled).toBe(false);
  });
});
