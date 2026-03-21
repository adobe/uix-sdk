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

import React from "react";
import { renderHook } from "@testing-library/react-hooks";
import { Host } from "@adobe/uix-host";
import { ExtensionContext } from "../extension-context";
import { useExtensionListFetched } from "./useExtensionListFetched";

jest.mock("@adobe/uix-host");

const mockHost = {} as unknown as Host;

describe("useExtensionListFetched", () => {
  test("returns false when extensionListFetched is false", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        ExtensionContext.Provider,
        { value: { host: mockHost, extensionListFetched: false } },
        children,
      );

    const { result } = renderHook(() => useExtensionListFetched(), { wrapper });
    expect(result.current).toBe(false);
  });

  test("returns true when extensionListFetched is true", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        ExtensionContext.Provider,
        { value: { host: mockHost, extensionListFetched: true } },
        children,
      );

    const { result } = renderHook(() => useExtensionListFetched(), { wrapper });
    expect(result.current).toBe(true);
  });
});
