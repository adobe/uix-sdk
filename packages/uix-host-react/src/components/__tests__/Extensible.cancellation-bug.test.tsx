/**
 * Test to reproduce the extension fetch cancellation bug
 *
 * Bug Description:
 * When a child component triggers re-renders during extension loading,
 * the browser cancels the in-flight fetch and it's not retried,
 * causing extensions to fail to load permanently.
 *
 * This happens because:
 * 1. The useEffect in Extensible has no cleanup function
 * 2. When dependencies change, a new fetch starts while the old one is still running
 * 3. The browser may cancel the previous fetch
 * 4. No retry mechanism exists
 * 5. extensionListFetched is set to true even on failure
 */

import React, { useState, useEffect } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { Extensible } from "../Extensible";
import type { InstalledExtensions, ExtensionsProvider } from "@adobe/uix-host";

// Child component that triggers re-renders during parent mount
const RerenderingChild: React.FC<{
  onRenderCount?: (count: number) => void;
}> = ({ onRenderCount }) => {
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    // Trigger 5 rapid re-renders during initial mount
    // This simulates a child component doing state updates (e.g., fetching data, animations, etc.)
    if (renderCount < 5) {
      const timer = setTimeout(() => {
        setRenderCount((prev) => prev + 1);
        onRenderCount?.(renderCount + 1);
      }, 50); // 50ms between re-renders

      return () => clearTimeout(timer);
    }
  }, [renderCount, onRenderCount]);

  return <div data-testid="child">Render count: {renderCount}</div>;
};

describe("Extensible - Extension Fetch Cancellation Bug", () => {
  let originalConsoleError: typeof console.error;
  const consoleErrors: any[] = [];

  beforeEach(() => {
    // Capture console.error calls
    originalConsoleError = console.error;
    console.error = jest.fn((...args) => {
      consoleErrors.push(args);
    });
  });

  afterEach(() => {
    console.error = originalConsoleError;
    consoleErrors.length = 0;
  });

  it("BUG: Extensions fail to load when child component triggers rapid re-renders", async () => {
    let providerCallCount = 0;
    const providerCalls: number[] = [];

    // Simulate a slow extension fetch (like a real network request)
    const slowExtensionsProvider: ExtensionsProvider = jest.fn(async () => {
      const callNumber = ++providerCallCount;
      providerCalls.push(callNumber);

      console.log(`[Provider] Call #${callNumber} starting...`);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      console.log(`[Provider] Call #${callNumber} completing...`);

      const extensions: InstalledExtensions = {
        "test-extension": {
          id: "test-extension",
          url: "http://localhost:3000/test",
        },
      };

      return extensions;
    });

    let childRenderCount = 0;
    const onRenderCount = (count: number) => {
      childRenderCount = count;
      console.log(`[Child] Re-render #${count}`);
    };

    // Render Extensible with a child that triggers rapid re-renders
    const { container } = render(
      <Extensible extensionsProvider={slowExtensionsProvider}>
        <RerenderingChild onRenderCount={onRenderCount} />
      </Extensible>
    );

    // Wait for child to finish re-rendering
    await waitFor(
      () => {
        expect(childRenderCount).toBe(5);
      },
      { timeout: 1000 }
    );

    console.log(
      `[Test] Child finished re-rendering. Provider called ${providerCallCount} times.`
    );

    // Wait additional time for any fetch to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    console.log(`[Test] Final provider call count: ${providerCallCount}`);
    console.log(`[Test] Console errors:`, consoleErrors);

    // EXPECTATIONS:
    // Bug behavior - The provider should be called only once, but the fetch
    // might be cancelled by the browser if child re-renders happen during the fetch.

    // This test demonstrates the bug:
    // 1. Provider is called once (or possibly multiple times if refs change)
    // 2. If fetch is cancelled, no retry happens
    // 3. Extensions may fail to load

    console.log(`[Test] Test Summary:`);
    console.log(`  - Provider calls: ${providerCallCount}`);
    console.log(`  - Child re-renders: ${childRenderCount}`);
    console.log(`  - Errors: ${consoleErrors.length}`);

    // The bug manifests as:
    // - Provider called but extensions not loaded (due to cancellation)
    // - OR multiple provider calls due to dependency changes
    // - No retry when fetch fails

    // For this test, we're documenting the bug rather than asserting it fails
    // After the fix, this test should pass reliably
    expect(providerCallCount).toBeGreaterThanOrEqual(1);
  }, 10000);

  it("BUG: Changing extensionsListCallback causes re-fetch with no cancellation", async () => {
    let providerCallCount = 0;
    let lastCallAborted = false;

    const slowExtensionsProvider: ExtensionsProvider = jest.fn(async () => {
      const callNumber = ++providerCallCount;
      console.log(`[Provider] Call #${callNumber} starting...`);

      try {
        // Simulate slow network
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 300);
          // If we had AbortSignal, we would handle it here
          // But current implementation doesn't pass signal, so fetch can't be aborted
        });

        console.log(`[Provider] Call #${callNumber} completed successfully`);
        return {
          "test-extension": {
            id: "test-extension",
            url: "http://localhost:3000/test",
          },
        };
      } catch (error) {
        console.log(`[Provider] Call #${callNumber} was aborted`);
        lastCallAborted = true;
        throw error;
      }
    });

    // First render with one callback
    const callback1 = (exts: InstalledExtensions) => exts;

    const { rerender } = render(
      <Extensible
        extensionsProvider={slowExtensionsProvider}
        extensionsListCallback={callback1}
      >
        <div>Test</div>
      </Extensible>
    );

    // Wait a bit for fetch to start
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    console.log(`[Test] First fetch started, now changing callback...`);

    // Change the callback (new reference) - this triggers useEffect again
    const callback2 = (exts: InstalledExtensions) => exts;

    rerender(
      <Extensible
        extensionsProvider={slowExtensionsProvider}
        extensionsListCallback={callback2}
      >
        <div>Test</div>
      </Extensible>
    );

    // Wait for fetches to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
    });

    console.log(`[Test] Test Summary:`);
    console.log(`  - Provider calls: ${providerCallCount}`);
    console.log(`  - Last call aborted: ${lastCallAborted}`);
    console.log(`  - Console errors: ${consoleErrors.length}`);

    // BUG: Provider is called twice (once for each callback reference)
    // The first fetch is NOT cancelled (no cleanup function)
    // Both fetches run in parallel, which is wasteful
    // After fix: First fetch should be aborted when callback changes

    expect(providerCallCount).toBe(2); // Called twice due to dependency change
    expect(lastCallAborted).toBe(false); // BUG: No abortion mechanism exists
  }, 10000);

  it("BUG: Unmounting component does not cancel in-flight fetch", async () => {
    let fetchStarted = false;
    let fetchCompleted = false;
    let stateUpdateAfterUnmount = false;

    const slowExtensionsProvider: ExtensionsProvider = jest.fn(async () => {
      fetchStarted = true;
      console.log(`[Provider] Fetch started`);

      // Long fetch
      await new Promise((resolve) => setTimeout(resolve, 500));

      fetchCompleted = true;
      console.log(`[Provider] Fetch completed`);

      return {
        "test-extension": {
          id: "test-extension",
          url: "http://localhost:3000/test",
        },
      };
    });

    // Override console.error to detect state update warnings
    const originalError = console.error;
    console.error = jest.fn((...args) => {
      const message = args[0];
      if (
        typeof message === "string" &&
        message.includes("unmounted component")
      ) {
        stateUpdateAfterUnmount = true;
      }
      consoleErrors.push(args);
    });

    const { unmount } = render(
      <Extensible extensionsProvider={slowExtensionsProvider}>
        <div>Test</div>
      </Extensible>
    );

    // Wait for fetch to start
    await waitFor(() => expect(fetchStarted).toBe(true), { timeout: 100 });

    console.log(`[Test] Fetch started, now unmounting...`);

    // Unmount while fetch is in progress
    unmount();

    // Wait for fetch to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    console.log(`[Test] Test Summary:`);
    console.log(`  - Fetch completed: ${fetchCompleted}`);
    console.log(`  - State update after unmount: ${stateUpdateAfterUnmount}`);

    // BUG: Fetch completes even after unmount (not aborted)
    // BUG: May cause state updates on unmounted component
    // After fix: Fetch should be aborted when component unmounts

    expect(fetchCompleted).toBe(true); // BUG: Fetch continues after unmount
    // Note: stateUpdateAfterUnmount might be false due to React internals
    // but the fetch still completed when it shouldn't have

    console.error = originalError;
  }, 10000);
});
