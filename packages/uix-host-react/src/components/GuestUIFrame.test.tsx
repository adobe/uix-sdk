/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react";
import { Host } from "@adobe/uix-host";
import { GuestUIFrame } from "./GuestUIFrame";
import { useHost } from "../hooks/useHost";

jest.mock("@adobe/uix-host", () => ({
  ...jest.requireActual("@adobe/uix-host"),
  Host: jest.fn(),
}));
jest.mock("../hooks/useHost");

const mockedUseHost = jest.mocked(useHost);

interface MockGuest {
  id: string;
  url: URL;
  provide: jest.Mock;
  attachUI: jest.Mock;
  addEventListener: jest.Mock;
}

const createGuest = (id = "guest-1"): MockGuest => ({
  id,
  url: new URL("https://example.com/guest/"),
  provide: jest.fn().mockName("guest.provide"),
  attachUI: jest
    .fn()
    .mockName("guest.attachUI")
    .mockResolvedValue({
      tunnel: { destroy: jest.fn() },
    }),
  addEventListener: jest
    .fn()
    .mockName("guest.addEventListener")
    .mockReturnValue(jest.fn()),
});

const mockHostWithGuest = (guest?: MockGuest) =>
  ({
    guests: {
      get: jest.fn().mockReturnValue(guest),
    },
  } as unknown as Host);

describe("GuestUIFrame", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("renders null when no host is available", () => {
    mockedUseHost.mockReturnValue({ host: undefined, error: undefined });

    const { container } = render(
      <GuestUIFrame guestId="guest-1" src="index.html" />
    );

    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders null without crashing when the guest is not found", () => {
    mockedUseHost.mockReturnValue({
      host: mockHostWithGuest(undefined),
      error: undefined,
    });

    expect(() =>
      render(<GuestUIFrame guestId="missing-guest" src="index.html" />)
    ).not.toThrow();

    const { container } = render(
      <GuestUIFrame guestId="missing-guest" src="index.html" />
    );
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders an iframe with a resolved src and name when the guest exists", () => {
    const guest = createGuest("guest-1");
    mockedUseHost.mockReturnValue({
      host: mockHostWithGuest(guest),
      error: undefined,
    });

    const { container } = render(
      <GuestUIFrame guestId="guest-1" src="page.html" />
    );

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://example.com/guest/page.html"
    );
    expect(iframe?.getAttribute("name")).toBe("uix-guest-guest-1");
  });

  it("attaches the UI and invokes onConnect once connected", async () => {
    const guest = createGuest("guest-1");
    mockedUseHost.mockReturnValue({
      host: mockHostWithGuest(guest),
      error: undefined,
    });
    const onConnect = jest.fn();

    render(
      <GuestUIFrame guestId="guest-1" src="page.html" onConnect={onConnect} />
    );

    await waitFor(() => {
      expect(guest.attachUI).toHaveBeenCalled();
      expect(onConnect).toHaveBeenCalled();
    });
  });

  it("provides host methods to the guest when methods are passed", async () => {
    const guest = createGuest("guest-1");
    mockedUseHost.mockReturnValue({
      host: mockHostWithGuest(guest),
      error: undefined,
    });
    const methods = { ns: { doThing: jest.fn() } };

    render(
      <GuestUIFrame guestId="guest-1" src="page.html" methods={methods} />
    );

    await waitFor(() => {
      expect(guest.provide).toHaveBeenCalledWith(methods);
    });
  });

  it("registers a guestresize listener when onResize is provided", () => {
    const guest = createGuest("guest-1");
    mockedUseHost.mockReturnValue({
      host: mockHostWithGuest(guest),
      error: undefined,
    });
    const onResize = jest.fn();

    render(
      <GuestUIFrame guestId="guest-1" src="page.html" onResize={onResize} />
    );

    expect(guest.addEventListener).toHaveBeenCalledWith(
      "guestresize",
      expect.any(Function)
    );
  });

  it("calls onConnectionError when the connection fails", async () => {
    const guest = createGuest("guest-1");
    guest.attachUI.mockRejectedValue(new Error("boom"));
    mockedUseHost.mockReturnValue({
      host: mockHostWithGuest(guest),
      error: undefined,
    });
    const onConnectionError = jest.fn();

    render(
      <GuestUIFrame
        guestId="guest-1"
        src="page.html"
        onConnectionError={onConnectionError}
      />
    );

    await waitFor(() => {
      expect(onConnectionError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
