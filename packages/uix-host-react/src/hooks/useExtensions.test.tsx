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
    (mockHost as unknown as { loading: boolean }).loading = false;
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
    (mockHost as unknown as { loading: boolean }).loading = false;
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
});
