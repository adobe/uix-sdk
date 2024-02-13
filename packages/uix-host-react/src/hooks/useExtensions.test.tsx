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
import { renderHook } from "@testing-library/react";
import React, { ReactNode } from "react";
import { ExtensibleComponentBoundaryContext } from "../extensible-component-context";
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
];
jest.mocked(useHost).mockReturnValue({
  error: undefined,
  host: {
    addEventListener(): () => void {
      return function () {
        //do nothing, since its a mock
      };
    },
    removeEventListener(): void {
      return null;
    },
    getLoadedGuests() {
      return guests;
    },
    destroy(): null {
      return null;
    },
  } as unknown as Host,
});

const configFactory = (): UseExtensionsConfig<GuestApis, VirtualApi> =>
  ({
    requires: {},
    provides: {},
  } as UseExtensionsConfig<GuestApis, VirtualApi>);

describe("useExtension hook", () => {
  test("returns all extensions when no ExtensibleComponentBoundaryContext value is provided", () => {
    const { result } = renderHook(() =>
      useExtensions<GuestApis, VirtualApi>(configFactory, [])
    );
    expect(result.current.extensions.length).toBe(4);
  });

  test("returns filtered extensions when ExtensibleComponentBoundaryContext with extensionPoints value is provided", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ExtensibleComponentBoundaryContext.Provider
        value={[
          {
            service: "service-1",
            extensionPoint: "extension-point-a",
            version: "v1",
          },
        ]}
      >
        {children}
      </ExtensibleComponentBoundaryContext.Provider>
    );

    const { result } = renderHook(
      () => useExtensions<GuestApis, VirtualApi>(configFactory, []),
      { wrapper }
    );

    expect(result.current.extensions.length).toBe(2);
  });

  test("returns filtered extensions when ExtensibleComponentBoundaryContext with extensionPoints value is provided with different version", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ExtensibleComponentBoundaryContext.Provider
        value={[{
          service: "service-1",
          extensionPoint: "extension-point-a",
          version: "v2",
        }]}
      >
        {children}
      </ExtensibleComponentBoundaryContext.Provider>
    );

    const { result } = renderHook(
      () => useExtensions<GuestApis, VirtualApi>(configFactory, []),
      { wrapper }
    );

    expect(result.current.extensions.length).toBe(1);
  });
});
