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

import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react";
import { Extensible } from "./Extensible";
import { Host } from "@adobe/uix-host";
import type { InstalledExtensions } from "@adobe/uix-host";

jest.mock("@adobe/uix-host");

const MockedHost = Host as jest.MockedClass<typeof Host>;

describe("Extensible", () => {
  let mockUnload: jest.Mock;
  let mockLoad: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUnload = jest.fn().mockResolvedValue(undefined);
    mockLoad = jest.fn().mockResolvedValue(undefined);

    MockedHost.mockImplementation(
      () =>
        ({
          unload: mockUnload,
          load: mockLoad,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        } as unknown as Host)
    );

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  describe("Host cleanup on unmount", () => {
    it("should unload host when component unmounts", async () => {
      const mockExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      };

      const extensionsProvider = jest.fn().mockResolvedValue(mockExtensions);

      const { unmount } = render(
        <Extensible appName="test-app" extensionsProvider={extensionsProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      // Wait for extensions to load and host to be created
      await waitFor(() => {
        expect(MockedHost).toHaveBeenCalled();
      });

      // Unmount the component
      unmount();

      // Verify that unload was called
      await waitFor(() => {
        expect(mockUnload).toHaveBeenCalled();
      });
    });

    it("should handle unload errors gracefully on unmount", async () => {
      const mockExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      };

      const extensionsProvider = jest.fn().mockResolvedValue(mockExtensions);

      mockUnload.mockRejectedValue(new Error("Unload failed"));

      const { unmount } = render(
        <Extensible appName="test-app" extensionsProvider={extensionsProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      await waitFor(() => {
        expect(MockedHost).toHaveBeenCalled();
      });

      // Should not throw when unmounting even if unload fails
      expect(() => unmount()).not.toThrow();

      await waitFor(() => {
        expect(mockUnload).toHaveBeenCalled();
      });
    });

    it("should not call unload if host was never created", () => {
      const extensionsProvider = jest.fn().mockResolvedValue({});

      const { unmount } = render(
        <Extensible appName="test-app" extensionsProvider={extensionsProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      unmount();

      // Unload should not be called if host was never created
      expect(mockUnload).not.toHaveBeenCalled();
    });
  });

  describe("Old host unloading when creating new host", () => {
    it("should unload old host before creating a new one when sharedContext changes and extensions reload", async () => {
      const firstExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      };

      const secondExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
        "ext-2": { id: "ext-2", url: "https://example.com/ext2" },
      };

      const firstProvider = jest.fn().mockResolvedValue(firstExtensions);
      const secondProvider = jest.fn().mockResolvedValue(secondExtensions);

      const { rerender } = render(
        <Extensible
          appName="test-app"
          extensionsProvider={firstProvider}
          sharedContext={{ theme: "light" }}
        >
          <div>Test Child</div>
        </Extensible>
      );

      // Wait for initial host creation
      await waitFor(() => {
        expect(MockedHost).toHaveBeenCalledTimes(1);
      });

      // Change both sharedContext and extensions provider to trigger re-render and host recreation
      rerender(
        <Extensible
          appName="test-app"
          extensionsProvider={secondProvider}
          sharedContext={{ theme: "dark" }}
        >
          <div>Test Child</div>
        </Extensible>
      );

      // Wait for old host to be unloaded and new host to be created
      await waitFor(() => {
        expect(mockUnload).toHaveBeenCalled();
        expect(MockedHost).toHaveBeenCalledTimes(2);
      });
    });

    it("should not unload or recreate host when only debug changes", async () => {
      const mockExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      };

      const extensionsProvider = jest.fn().mockResolvedValue(mockExtensions);

      const { rerender } = render(
        <Extensible
          appName="test-app"
          extensionsProvider={extensionsProvider}
          debug={false}
        >
          <div>Test Child</div>
        </Extensible>
      );

      await waitFor(() => {
        expect(MockedHost).toHaveBeenCalledTimes(1);
      });

      mockUnload.mockClear();

      // Change debug to trigger effect re-run
      rerender(
        <Extensible
          appName="test-app"
          extensionsProvider={extensionsProvider}
          debug={true}
        >
          <div>Test Child</div>
        </Extensible>
      );

      // Since debug is in the dependency array, the effect should re-run
      // and since host already exists, it should NOT unload (it only unloads in the if (!host || sharedContextChanged) branch)
      await waitFor(() => {
        expect(MockedHost).toHaveBeenCalledTimes(1); // No new host created
      });

      // Unload should not be called because the existing host is reused
      expect(mockUnload).not.toHaveBeenCalled();
    });

    it("should handle unload errors when creating new host due to sharedContext change", async () => {
      const firstExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      };

      const secondExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
        "ext-2": { id: "ext-2", url: "https://example.com/ext2" },
      };

      const firstProvider = jest.fn().mockResolvedValue(firstExtensions);
      const secondProvider = jest.fn().mockResolvedValue(secondExtensions);

      mockUnload.mockRejectedValue(new Error("Unload failed"));

      const { rerender } = render(
        <Extensible
          appName="test-app"
          extensionsProvider={firstProvider}
          sharedContext={{ theme: "light" }}
        >
          <div>Test Child</div>
        </Extensible>
      );

      await waitFor(() => {
        expect(MockedHost).toHaveBeenCalledTimes(1);
      });

      // Should not throw even if unload fails
      expect(() =>
        rerender(
          <Extensible
            appName="test-app"
            extensionsProvider={secondProvider}
            sharedContext={{ theme: "dark" }}
          >
            <div>Test Child</div>
          </Extensible>
        )
      ).not.toThrow();

      await waitFor(() => {
        expect(mockUnload).toHaveBeenCalled();
        expect(MockedHost).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Cancel stale extension fetches", () => {
    it("should cancel stale extension fetch when extensionsProvider changes", async () => {
      const firstExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      };

      const secondExtensions: InstalledExtensions = {
        "ext-2": { id: "ext-2", url: "https://example.com/ext2" },
      };

      let firstResolve: (value: InstalledExtensions) => void;
      const firstProviderPromise = new Promise<InstalledExtensions>(
        (resolve) => {
          firstResolve = resolve;
        }
      );

      const firstProvider = jest.fn().mockReturnValue(firstProviderPromise);
      const secondProvider = jest.fn().mockResolvedValue(secondExtensions);

      const { rerender } = render(
        <Extensible appName="test-app" extensionsProvider={firstProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      // Change the provider before the first one resolves
      rerender(
        <Extensible appName="test-app" extensionsProvider={secondProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      // Now resolve the first provider (after deps have changed)
      firstResolve!(firstExtensions);

      // Wait for second provider to complete
      await waitFor(() => {
        expect(secondProvider).toHaveBeenCalled();
      });

      // Verify that Host was only created for the second set of extensions
      await waitFor(() => {
        expect(MockedHost).toHaveBeenCalled();
      });

      // The mock load should be called with secondExtensions, not firstExtensions
      await waitFor(() => {
        expect(mockLoad).toHaveBeenCalledWith(secondExtensions, undefined);
      });
    });

    it("should not log error for cancelled fetch", async () => {
      let firstResolve: (value: never) => void;
      let firstReject: (reason: Error) => void;
      const firstProviderPromise = new Promise<InstalledExtensions>(
        (resolve, reject) => {
          firstResolve = resolve;
          firstReject = reject;
        }
      );

      const secondExtensions: InstalledExtensions = {
        "ext-2": { id: "ext-2", url: "https://example.com/ext2" },
      };

      const firstProvider = jest.fn().mockReturnValue(firstProviderPromise);
      const secondProvider = jest.fn().mockResolvedValue(secondExtensions);

      const { rerender } = render(
        <Extensible appName="test-app" extensionsProvider={firstProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      // Change the provider before the first one completes
      rerender(
        <Extensible appName="test-app" extensionsProvider={secondProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      // Reject the first provider (simulating an error)
      firstReject!(new Error("Fetch failed"));

      // Wait for second provider to complete
      await waitFor(() => {
        expect(secondProvider).toHaveBeenCalled();
      });

      // Console.error should not be called for the cancelled fetch
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        "Fetching list of extensions failed!",
        expect.any(Error)
      );
    });

    it("should cancel extension fetch on unmount", async () => {
      let resolveExtensions: (value: InstalledExtensions) => void;
      const extensionsPromise = new Promise<InstalledExtensions>((resolve) => {
        resolveExtensions = resolve;
      });

      const extensionsProvider = jest.fn().mockReturnValue(extensionsPromise);

      const { unmount } = render(
        <Extensible appName="test-app" extensionsProvider={extensionsProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      // Unmount before the promise resolves
      unmount();

      // Resolve the promise after unmount
      resolveExtensions!({
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      });

      // Wait a bit to ensure any pending updates are processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Host should not be created since component was unmounted
      expect(MockedHost).not.toHaveBeenCalled();
    });

    it("should handle extensionsListCallback with cancelled fetch", async () => {
      const firstExtensions: InstalledExtensions = {
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      };

      const secondExtensions: InstalledExtensions = {
        "ext-2": { id: "ext-2", url: "https://example.com/ext2" },
      };

      let firstResolve: (value: InstalledExtensions) => void;
      const firstProviderPromise = new Promise<InstalledExtensions>(
        (resolve) => {
          firstResolve = resolve;
        }
      );

      const firstProvider = jest.fn().mockReturnValue(firstProviderPromise);
      const secondProvider = jest.fn().mockResolvedValue(secondExtensions);

      const extensionsListCallback = jest.fn((exts) => exts);

      const { rerender } = render(
        <Extensible
          appName="test-app"
          extensionsProvider={firstProvider}
          extensionsListCallback={extensionsListCallback}
        >
          <div>Test Child</div>
        </Extensible>
      );

      // Change the callback (which is a dependency)
      const newCallback = jest.fn((exts) => exts);
      rerender(
        <Extensible
          appName="test-app"
          extensionsProvider={secondProvider}
          extensionsListCallback={newCallback}
        >
          <div>Test Child</div>
        </Extensible>
      );

      // Resolve the first provider after deps changed
      firstResolve!(firstExtensions);

      await waitFor(() => {
        expect(secondProvider).toHaveBeenCalled();
      });

      // Only the second callback should be called
      await waitFor(() => {
        expect(newCallback).toHaveBeenCalled();
      });

      // The first callback should not be called with cancelled results
      expect(extensionsListCallback).not.toHaveBeenCalled();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle rapid provider changes and cancel stale fetches", async () => {
      const providers = Array.from({ length: 5 }, (_, i) =>
        jest.fn().mockResolvedValue({
          [`ext-${i}`]: { id: `ext-${i}`, url: `https://example.com/ext${i}` },
        })
      );

      const { rerender } = render(
        <Extensible appName="test-app" extensionsProvider={providers[0]}>
          <div>Test Child</div>
        </Extensible>
      );

      // Rapidly change providers
      for (let i = 1; i < providers.length; i++) {
        rerender(
          <Extensible appName="test-app" extensionsProvider={providers[i]}>
            <div>Test Child</div>
          </Extensible>
        );
      }

      // Wait for everything to settle
      await waitFor(() => {
        expect(providers[providers.length - 1]).toHaveBeenCalled();
      });

      // All providers should have been called
      providers.forEach((provider) => {
        expect(provider).toHaveBeenCalled();
      });

      // Host should be created (at least for the last provider)
      await waitFor(() => {
        expect(MockedHost).toHaveBeenCalled();
      });
    });

    it("should properly cleanup when unmounting during active fetch", async () => {
      let resolveExtensions: (value: InstalledExtensions) => void;
      const extensionsPromise = new Promise<InstalledExtensions>((resolve) => {
        resolveExtensions = resolve;
      });

      const extensionsProvider = jest.fn().mockReturnValue(extensionsPromise);

      const { unmount } = render(
        <Extensible appName="test-app" extensionsProvider={extensionsProvider}>
          <div>Test Child</div>
        </Extensible>
      );

      // Unmount while fetch is still pending
      unmount();

      // Resolve after unmount
      resolveExtensions!({
        "ext-1": { id: "ext-1", url: "https://example.com/ext1" },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have created a host or logged errors
      expect(MockedHost).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
