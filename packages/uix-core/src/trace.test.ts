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

import { createTracer, __resetTraceStateForTests } from "./trace";

describe("createTracer", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    window.localStorage.clear();
    __resetTraceStateForTests();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    window.__UIX_DEBUG__?.disable();
  });

  it("is disabled by default and logs nothing", () => {
    const trace = createTracer("uix-host");

    expect(trace.enabled).toBe(false);
    trace("something happened");

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("never calls a details thunk while disabled", () => {
    const trace = createTracer("uix-host");
    const buildDetails = jest.fn(() => ({ expensive: "work" }));

    trace("something happened", buildDetails);

    expect(buildDetails).not.toHaveBeenCalled();
  });

  it("logs a single JSON-structured line once its exact namespace is enabled", () => {
    const trace = createTracer("uix-host");

    window.__UIX_DEBUG__?.enable("uix-host");
    expect(trace.enabled).toBe(true);

    trace("guest connected", { id: "msm" });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [line] = logSpy.mock.calls[0] as [string];
    expect(line).toMatch(/^\[uix-host\] guest connected \{.*\}$/);
    const payload = JSON.parse(
      line.replace(/^\[uix-host\] guest connected /, "")
    ) as Record<string, unknown>;
    expect(payload).toMatchObject({ id: "msm" });
    expect(payload.at).toEqual(expect.any(String));
  });

  it("calls a details thunk once enabled, and uses its return value", () => {
    const trace = createTracer("uix-host");
    window.__UIX_DEBUG__?.enable("uix-host");

    trace("guest connected", () => ({ id: "msm" }));

    const [line] = logSpy.mock.calls[0] as [string];
    expect(
      JSON.parse(line.replace(/^\[uix-host\] guest connected /, ""))
    ).toMatchObject({ id: "msm" });
  });

  it("does not enable other namespaces when enabling one by exact name", () => {
    const hostTrace = createTracer("uix-host");
    const guestTrace = createTracer("uix-guest");

    window.__UIX_DEBUG__?.enable("uix-host");

    expect(hostTrace.enabled).toBe(true);
    expect(guestTrace.enabled).toBe(false);
  });

  it("supports trailing-wildcard patterns", () => {
    const hostTrace = createTracer("uix-host");
    const guestTrace = createTracer("uix-guest");
    const otherTrace = createTracer("rte-before-load");

    window.__UIX_DEBUG__?.enable("uix-*");

    expect(hostTrace.enabled).toBe(true);
    expect(guestTrace.enabled).toBe(true);
    expect(otherTrace.enabled).toBe(false);
  });

  it("'*' enables every namespace, including ones registered afterward", () => {
    const hostTrace = createTracer("uix-host");

    window.__UIX_DEBUG__?.enable("*");
    expect(hostTrace.enabled).toBe(true);

    // A tracer created after enable("*") should also come up enabled -- the
    // check is live against the current pattern set, not baked in at
    // createTracer() time.
    const laterTrace = createTracer("some-new-namespace");
    expect(laterTrace.enabled).toBe(true);
  });

  it("enable() defaults to '*' when called with no pattern", () => {
    const trace = createTracer("uix-host");

    window.__UIX_DEBUG__?.enable();

    expect(trace.enabled).toBe(true);
  });

  it("disable() turns every namespace back off and clears the persisted preference", () => {
    const trace = createTracer("uix-host");
    window.__UIX_DEBUG__?.enable("uix-host");
    expect(trace.enabled).toBe(true);

    window.__UIX_DEBUG__?.disable();

    expect(trace.enabled).toBe(false);
    expect(window.localStorage.getItem("uix:debug")).toBeNull();
  });

  it("list() returns every namespace a tracer has been created for, regardless of enabled state", () => {
    createTracer("uix-host");
    createTracer("uix-guest");

    expect(window.__UIX_DEBUG__?.list()).toEqual(["uix-guest", "uix-host"]);
  });

  it("persists enabled patterns to localStorage and a fresh page load honours them", () => {
    const trace = createTracer("uix-host");
    window.__UIX_DEBUG__?.enable("uix-host");

    expect(window.localStorage.getItem("uix:debug")).toBe("uix-host");

    // Simulate a reload: reset in-memory state, but leave localStorage as-is.
    __resetTraceStateForTests();
    const traceAfterReload = createTracer("uix-host");

    expect(traceAfterReload.enabled).toBe(true);
    void trace; // keep referenced for clarity of the "before" state above
  });
});
