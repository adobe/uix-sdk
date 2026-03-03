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

import type { ReactNode } from "react";
import React from "react";
import type { GuestApis, VirtualApi } from "@adobe/uix-core";
import type { Host } from "@adobe/uix-host";
import { renderHook } from "@testing-library/react-hooks";
import { ExtensibleComponentBoundary } from "../components/ExtensibleComponentBoundary";
import type { UseExtensionsConfig } from "./useExtensions";
import { useExtensions } from "./useExtensions";
import { useHost } from "./useHost";

jest.mock("@adobe/uix-host");
jest.mock("./useHost");

// dummy extensions/guests data
const guests = [
  {
    extensionPoints: [
      "service-1/extension-point-a/v1",
      "service-1/extension-point-b/v1",
    ],
    id: "extension-1",
    provide: jest.fn().mockName("guest.provide"),
  },
  {
    extensionPoints: [
      "service-1/extension-point-b/v1",
      "service-1/extension-point-c/v1",
    ],
    id: "extension-2",
    provide: jest.fn().mockName("guest.provide"),
  },
  {
    extensionPoints: [
      "service-1/extension-point-a/v1",
      "service-1/extension-point-c/v1",
    ],
    id: "extension-3",
    provide: jest.fn().mockName("guest.provide"),
  },
  {
    extensionPoints: [
      "service-1/extension-point-a/v2",
      "service-1/extension-point-c/v2",
    ],
    id: "extension-4",

    provide: jest.fn().mockName("guest.provide"),
  },
  {
    extensionPoints: [],
    id: "extension-5",
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

jest.mocked(useHost).mockReturnValue({
  error: undefined,
  host: {
    addEventListener(): () => void {
      return function () {
        // do nothing, since its a mock
      };
    },
    destroy(): null {
      return null;
    },
    getLoadedGuests() {
      return guests;
    },
    removeEventListener(): void {
      return null;
    },
  } as unknown as Host,
});

const configFactory = (): UseExtensionsConfig<GuestApis, VirtualApi> =>
  ({
    provides: {},
    requires: {},
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
            extensionPoint: "extension-point-a",
            service: "service-1",
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

  test("returns filtered extensions when ExtensibleComponentBoundaryContext with extensionPoints value is provided with different version", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ExtensibleComponentBoundary
        extensionPoints={[
          {
            extensionPoint: "extension-point-a",
            service: "service-1",
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
