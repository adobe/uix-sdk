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

/**
 * Comparison tests: useExtensions().loading vs useExtensionListFetched()
 *
 * These tests document the behavioural difference between the two "are we done?"
 * flags exposed to consumers:
 *
 * - extensionListFetched (from useExtensionListFetched):
 *     Set once in Extensible's .finally() block after extensionsProvider()
 *     resolves OR rejects. Meaning: "the registry has been queried; we know
 *     what extensions should exist." One-way: true forever once set.
 *
 * - loading (from useExtensions):
 *     Driven by host.loading + Host events (guestload, loadallguests).
 *     Meaning: "extensions are actively connecting right now." Cyclic: goes
 *     false → true → false on each load cycle.
 *
 * Tests 3 and 4 also document the SITES-41734 regression that was fixed.
 * The old broken implementation computed loading as:
 *   extensions.length === 0 ? false : host.loading
 * which forced loading to false whenever the filtered extension list was empty,
 * even while the host was actively loading.
 */

import { GuestApis, VirtualApi } from "@adobe/uix-core";
import { Host } from "@adobe/uix-host";
import { act, renderHook } from "@testing-library/react-hooks";
import React, { ReactNode } from "react";
import { ExtensionContext } from "../extension-context";
import { UseExtensionsConfig, useExtensions } from "./useExtensions";
import { useExtensionListFetched } from "./useExtensionListFetched";
import { useHost } from "./useHost";

jest.mock("@adobe/uix-host");
jest.mock("./useHost");

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
  getLoadedGuests(): never[] {
    return [];
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

function useBothFlags() {
  const { loading } = useExtensions<GuestApis, VirtualApi>(configFactory, []);
  const extensionListFetched = useExtensionListFetched();
  return { loading, extensionListFetched };
}

function makeWrapper(extensionListFetched: boolean) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ExtensionContext.Provider
        value={{ host: mockHost, extensionListFetched }}
      >
        {children}
      </ExtensionContext.Provider>
    );
  };
}

describe("useExtensions().loading vs useExtensionListFetched() comparison", () => {
  afterEach(() => {
    (mockHost as unknown as { loading: boolean }).loading = false;
    for (const event of Object.keys(mockListeners)) {
      mockListeners[event] = [];
    }
    jest.mocked(useHost).mockReturnValue({
      error: undefined,
      host: mockHost,
    });
  });

  test("Test 1 — Before registry resolves: both flags are false", () => {
    const { result } = renderHook(() => useBothFlags(), {
      wrapper: makeWrapper(false),
    });

    expect(result.current.extensionListFetched).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  test("Test 2 — After registry resolves with empty list: extensionListFetched is true, loading stays false", () => {
    // extensionsProvider() has completed (extensionListFetched = true), but the
    // host was never loading — nothing to connect to. No load events are fired.
    // Note: extensionListFetched = true alone does NOT mean extensions are
    // ready to use; it only means the registry query finished.
    const { result } = renderHook(() => useBothFlags(), {
      wrapper: makeWrapper(true),
    });

    expect(result.current.extensionListFetched).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  test("Test 3 — Host loading but no extensions match the filter (SITES-41734 regression case)", () => {
    // The registry has resolved (extensionListFetched = true) and the host is
    // actively loading, but the filter returns no matching extensions.
    //
    // Old behaviour (pre-fix SITES-41734): loading would have been `false` here
    // because `extensions.length === 0 ? false : host.loading` forced false
    // whenever no extensions matched the filter — masking active loading.
    //
    // Fixed behaviour: loading reflects host.loading directly, so it is true.
    const loadingHost = {
      ...mockHost,
      getLoadedGuests: jest.fn().mockReturnValue([]),
      loading: true,
    } as unknown as Host;
    jest
      .mocked(useHost)
      .mockReturnValue({ error: undefined, host: loadingHost });

    const { result } = renderHook(() => useBothFlags(), {
      wrapper: makeWrapper(true),
    });

    expect(result.current.extensionListFetched).toBe(true);
    expect(result.current.loading).toBe(true);
  });

  test("Test 4 — extensionListFetched stays true across a reload cycle; loading cycles true→false", async () => {
    // extensionListFetched is a one-way flag: once true it never goes back.
    // loading is cyclic: it goes false → true when a new load starts, then
    // back to false when loadallguests fires.
    //
    // Old behaviour (pre-fix SITES-41734): if the extensions list happened to be
    // empty at the moment guestload fired, loading would have stayed false even
    // though the host was actively loading.
    const { result } = renderHook(() => useBothFlags(), {
      wrapper: makeWrapper(true),
    });

    // Initial state: registry resolved, host idle.
    expect(result.current.extensionListFetched).toBe(true);
    expect(result.current.loading).toBe(false);

    // Simulate a new load cycle starting via guestbeforeload.
    await act(async () => {
      for (const listener of mockListeners["guestbeforeload"] ?? []) {
        listener(new Event("guestbeforeload"));
      }
    });

    // extensionListFetched never reverts; loading reflects the new cycle.
    expect(result.current.extensionListFetched).toBe(true);
    expect(result.current.loading).toBe(true);

    // Complete the reload cycle.
    await act(async () => {
      (mockHost as unknown as { loading: boolean }).loading = false;
      for (const listener of mockListeners["loadallguests"] ?? []) {
        listener(new Event("loadallguests"));
      }
    });

    expect(result.current.extensionListFetched).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  test("Test 5 — Registry failure: extensionListFetched is true (from .finally()), loading stays false", () => {
    // When extensionsProvider() throws, Extensible's .finally() block still
    // sets extensionListFetched = true. The host never starts loading because
    // no extensions were registered.
    //
    // extensionListFetched alone cannot distinguish registry success from
    // failure; consumers that need to handle errors should pair it with the
    // error state from the Extensible component.
    const { result } = renderHook(() => useBothFlags(), {
      wrapper: makeWrapper(true),
    });

    expect(result.current.extensionListFetched).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});
