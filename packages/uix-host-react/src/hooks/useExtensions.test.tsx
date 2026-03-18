/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { GuestApis, VirtualApi } from "@adobe/uix-core";
import { Host } from "@adobe/uix-host";
import { act, renderHook } from "@testing-library/react-hooks";
import React, { ReactNode } from "react";
import { ExtensibleComponentBoundary } from "../components/ExtensibleComponentBoundary";
import { UseExtensionsConfig, useExtensions } from "./useExtensions";
import { useHost } from "./useHost";

jest.mock("@adobe/uix-host");
jest.mock("./useHost");

//dummy extensions/guests data
const guests = [
  {
    id: "extension-1",
    extensionPoints: [
      "service-1/extension-point-a/v1",
      "service-1/extension-point-b/v1",
    ],
    provide: jest.fn().mockName("guest.provide"),
  },
  {
    id: "extension-2",
    extensionPoints: [
      "service-1/extension-point-b/v1",
      "service-1/extension-point-c/v1",
    ],
    provide: jest.fn().mockName("guest.provide"),
  },
  {
    id: "extension-3",
    extensionPoints: [
      "service-1/extension-point-a/v1",
      "service-1/extension-point-c/v1",
    ],
    provide: jest.fn().mockName("guest.provide"),
  },
  {
    id: "extension-4",
    extensionPoints: [
      "service-1/extension-point-a/v2",
      "service-1/extension-point-c/v2",
    ],

    provide: jest.fn().mockName("guest.provide"),
  },
  {
    id: "extension-5",
    extensionPoints: [],
    metadata: {
      extensions: [
        {
          extensionPoint: "service-1/extension-point-a/v1",
        },
        {
          extensionPoint: "service-1/extension-point-a/v2",
        },
      ],
    },
    provide: jest.fn().mockName("guest.provide"),
  },
] as unknown as GuestApis[];
const mockListeners: Record<string, EventListener[]> = {};

const mockHost = {
  addEventListener(event: string, handler: EventListener): () => void {
    if (!mockListeners[event]) mockListeners[event] = [];
    mockListeners[event].push(handler);
    return function () {
      mockListeners[event] = mockListeners[event].filter((h) => h !== handler);
    };
  },
  destroy(): null {
    return null;
  },
  getLoadedGuests() {
    return guests;
  },
  loading: false,
  removeEventListener(event: string, handler: EventListener): void {
    if (mockListeners[event]) {
      mockListeners[event] = mockListeners[event].filter((h) => h !== handler);
    }
  },
} as unknown as Host;

jest.mocked(useHost).mockReturnValue({
  error: undefined,
  host: mockHost,
});

const configFactory = (): UseExtensionsConfig<GuestApis, VirtualApi> =>
  ({
    requires: {},
    provides: {},
  }) as UseExtensionsConfig<GuestApis, VirtualApi>;

describe("useExtension hook", () => {
  afterEach(() => {
    // Reset mockHost.loading so a failing assertion in one test
    // does not poison subsequent tests that depend on its value.
    (mockHost as unknown as { loading: boolean }).loading = false;

    // Drain all registered listeners so event handlers from one test
    // do not leak into the next.
    for (const event of Object.keys(mockListeners)) {
      mockListeners[event] = [];
    }

    // Reset guest.provide() call history between tests.
    for (const guest of guests) {
      (guest as unknown as { provide: jest.Mock }).provide.mockClear();
    }
  });

  test("returns all extensions when no ExtensibleComponentBoundaryContext value is provided", () => {
    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configFactory, []),
    );
    expect(result.current.extensions.length).toBe(5);
  });

  test("returns filtered extensions when ExtensibleComponentBoundaryContext with extensionPoints value is provided", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ExtensibleComponentBoundary
        extensionPoints={[
          {
            service: "service-1",
            extensionPoint: "extension-point-a",
            version: "v1",
          },
        ]}
      >
        {children}
      </ExtensibleComponentBoundary>
    );

    const { result } = renderHook(
      () => useExtensions<GuestApis, VirtualApi>(configFactory, []),
      { wrapper },
    );

    expect(result.current.extensions.length).toBe(3);
  });

  test("loading is true while host.loading is true", () => {
    (mockHost as unknown as { loading: boolean }).loading = true;
    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configFactory, []),
    );
    expect(result.current.loading).toBe(true);
  });

  test("loading becomes false after loadallguests fires", async () => {
    (mockHost as unknown as { loading: boolean }).loading = true;
    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configFactory, []),
    );
    expect(result.current.loading).toBe(true);

    await act(async () => {
      const listeners = mockListeners["loadallguests"] ?? [];
      for (const listener of listeners) {
        listener(new Event("loadallguests"));
      }
    });

    expect(result.current.loading).toBe(false);
  });

  test("returns filtered extensions when ExtensibleComponentBoundaryContext with extensionPoints value is provided with different version", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ExtensibleComponentBoundary
        extensionPoints={[
          {
            service: "service-1",
            extensionPoint: "extension-point-a",
            version: "v2",
          },
        ]}
      >
        {children}
      </ExtensibleComponentBoundary>
    );

    const { result } = renderHook(
      () => useExtensions<GuestApis, VirtualApi>(configFactory, []),
      { wrapper },
    );

    expect(result.current.extensions.length).toBe(2);
  });

  test("loading resets to true on a subsequent load cycle when a guestload fires", async () => {
    // Start with host loading
    (mockHost as unknown as { loading: boolean }).loading = true;
    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configFactory, []),
    );
    expect(result.current.loading).toBe(true);

    // Complete the first load cycle
    await act(async () => {
      (mockHost as unknown as { loading: boolean }).loading = false;
      for (const listener of mockListeners["loadallguests"] ?? []) {
        listener(new Event("loadallguests"));
      }
    });
    expect(result.current.loading).toBe(false);

    // Simulate a second load cycle: host.loading flips to true and a guestload
    // fires (host.loading is checked inside the guestload handler).
    await act(async () => {
      (mockHost as unknown as { loading: boolean }).loading = true;
      for (const listener of mockListeners["guestload"] ?? []) {
        listener(new Event("guestload"));
      }
    });
    expect(result.current.loading).toBe(true);

    // Complete the second cycle
    await act(async () => {
      (mockHost as unknown as { loading: boolean }).loading = false;
      for (const listener of mockListeners["loadallguests"] ?? []) {
        listener(new Event("loadallguests"));
      }
    });
    expect(result.current.loading).toBe(false);
  });

  test("guest.provide() is called for each extension when extensions load", async () => {
    const providedApi = { myMethod: jest.fn() };
    const configWithProvides = (): UseExtensionsConfig<GuestApis, VirtualApi> =>
      ({
        requires: {},
        provides: providedApi,
      }) as unknown as UseExtensionsConfig<GuestApis, VirtualApi>;

    renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configWithProvides, []),
    );

    // The provides effect runs after render. Each loaded guest should
    // receive the provided API via guest.provide().
    for (const guest of guests) {
      expect(
        (guest as unknown as { provide: jest.Mock }).provide,
      ).toHaveBeenCalledWith(providedApi);
    }
  });

  test("loading is false on initial mount when host is not loading", () => {
    (mockHost as unknown as { loading: boolean }).loading = false;
    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configFactory, []),
    );
    expect(result.current.loading).toBe(false);
  });

  test("returns loading:false and error when useHost returns an error", () => {
    jest.mocked(useHost).mockReturnValueOnce({
      host: undefined,
      error: new Error("outside extension context"),
    });
    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configFactory, []),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.extensions).toHaveLength(0);
    expect(result.current.error?.message).toBe("outside extension context");
  });

  test("extensions update on each guestload in updateOn:each mode (default)", async () => {
    let callCount = 0;
    const trackingHost = {
      ...mockHost,
      getLoadedGuests() {
        callCount++;
        return guests;
      },
    } as unknown as Host;
    jest.mocked(useHost).mockReturnValueOnce({
      error: undefined,
      host: trackingHost,
    });

    renderHook(() => useExtensions<GuestApis, VirtualApi>(configFactory, []));
    const initialCallCount = callCount;

    await act(async () => {
      for (const listener of mockListeners["guestload"] ?? []) {
        listener(new Event("guestload"));
      }
    });

    // getLoadedGuests should have been called again after guestload fired
    expect(callCount).toBeGreaterThan(initialCallCount);
  });

  test("extensions do not update on guestload in updateOn:all mode", async () => {
    let callCount = 0;
    const trackingHost = {
      ...mockHost,
      getLoadedGuests() {
        callCount++;
        return guests;
      },
    } as unknown as Host;
    jest.mocked(useHost).mockReturnValueOnce({
      error: undefined,
      host: trackingHost,
    });

    const allModeConfig = (): UseExtensionsConfig<GuestApis, VirtualApi> =>
      ({ updateOn: "all" }) as UseExtensionsConfig<GuestApis, VirtualApi>;

    renderHook(() => useExtensions<GuestApis, VirtualApi>(allModeConfig, []));
    const initialCallCount = callCount;

    await act(async () => {
      for (const listener of mockListeners["guestload"] ?? []) {
        listener(new Event("guestload"));
      }
    });

    // guestload should not trigger getLoadedGuests in "all" mode
    expect(callCount).toBe(initialCallCount);

    await act(async () => {
      for (const listener of mockListeners["loadallguests"] ?? []) {
        listener(new Event("loadallguests"));
      }
    });

    // loadallguests should trigger getLoadedGuests
    expect(callCount).toBeGreaterThan(initialCallCount);
  });

  test("guestunload removes the unloaded guest from extensions", async () => {
    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configFactory, []),
    );
    expect(result.current.extensions.length).toBe(5);

    await act(async () => {
      for (const listener of mockListeners["guestunload"] ?? []) {
        (listener as unknown as (e: CustomEvent) => void)(
          new CustomEvent("guestunload", {
            detail: { guest: guests[0] },
          }),
        );
      }
    });

    expect(result.current.extensions.length).toBe(4);
    expect(
      result.current.extensions.find((e) => e.id === "extension-1"),
    ).toBeUndefined();
  });

  test("guest.provide() is re-called when extensions list changes", async () => {
    const providedApi = { myMethod: jest.fn() };
    const configWithProvides = (): UseExtensionsConfig<GuestApis, VirtualApi> =>
      ({
        requires: {},
        provides: providedApi,
      }) as unknown as UseExtensionsConfig<GuestApis, VirtualApi>;

    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configWithProvides, []),
    );

    // Clear call counts after initial render
    for (const guest of guests) {
      (guest as unknown as { provide: jest.Mock }).provide.mockClear();
    }

    // Simulate a guest loading by firing guestload (the default "each" mode
    // subscriber). This calls setExtensions(getExtensions()), which returns
    // a new array reference and triggers the provides effect to re-run.
    await act(async () => {
      const listeners = mockListeners["guestload"] ?? [];
      for (const listener of listeners) {
        listener(new Event("guestload"));
      }
    });

    // The provides effect depends on [provides, extensions]. When
    // extensions changes (new array reference from getExtensions()),
    // guest.provide() is called again for each extension. This documents
    // that provide() is re-invoked on every load event, even if the
    // provided API has not changed.
    const extensionCount = result.current.extensions.length;
    expect(extensionCount).toBeGreaterThan(0);
    for (const guest of guests) {
      expect(
        (guest as unknown as { provide: jest.Mock }).provide,
      ).toHaveBeenCalledWith(providedApi);
    }
  });
});
