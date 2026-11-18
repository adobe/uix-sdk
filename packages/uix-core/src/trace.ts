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

/**
 * Namespaced, runtime-toggleable tracing for diagnosing extension-loading and
 * RPC timing issues, in the SDK itself and in apps that consume it.
 *
 * Unlike {@link debugEmitter}/{@link _customConsole} (which require a `debug`
 * option at construction time and produce human-oriented colored console
 * output), a trace channel can be enabled *after the fact*, at runtime, by
 * anyone with devtools access -- `__UIX_DEBUG__.enable("uix-host")` -- and
 * produces single-line, JSON-structured output that survives a plain-text
 * devtools console export.
 *
 * @packageDocumentation
 */

/** A plain object of details to attach to a trace line. */
type TraceDetails = Record<string, unknown>;

/**
 * A namespaced trace function. Calling it is a no-op unless its namespace is
 * currently enabled, in which case it logs `[namespace] label {...details}`
 * with an ISO timestamp.
 *
 * `details` may be a plain object or a function returning one. Prefer a
 * function whenever building `details` costs more than a property read or
 * two (mapping a list, serializing an error) -- it will not be called at all
 * while the namespace is disabled.
 */
export interface Tracer {
  (label: string, details?: TraceDetails | (() => TraceDetails)): void;
  /** Whether this tracer's namespace is currently enabled. Safe to check before doing any work the tracer itself doesn't need. */
  readonly enabled: boolean;
}

/** Methods for enabling/inspecting trace channels at runtime, exposed as `window.__UIX_DEBUG__`. */
export interface UixDebug {
  /**
   * Enable one or more namespace patterns. Patterns may be an exact
   * namespace (`"uix-host"`), a trailing wildcard (`"uix-*"`), or `"*"` for
   * everything. Persists across reloads via `localStorage`.
   */
  enable(pattern?: string): void;
  /** Disable all tracing and clear the persisted preference. */
  disable(): void;
  /** Every namespace any tracer has been created for so far, enabled or not. */
  list(): string[];
}

const STORAGE_KEY = "uix:debug";

function readInitialPatterns(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  const fromQuery = new URLSearchParams(window.location?.search ?? "").get(
    "uixDebug"
  );
  const fromStorage = (() => {
    try {
      return window.localStorage?.getItem(STORAGE_KEY);
    } catch {
      // localStorage can throw in sandboxed/private contexts; treat as unset.
      return null;
    }
  })();
  const raw = fromQuery ?? fromStorage ?? "";
  return raw
    .split(",")
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);
}

let enabledPatterns: string[] = readInitialPatterns();
const registry = new Set<string>();

function matches(pattern: string, namespace: string): boolean {
  if (pattern === "*" || pattern === namespace) {
    return true;
  }
  return pattern.endsWith("*") && namespace.startsWith(pattern.slice(0, -1));
}

function isNamespaceEnabled(namespace: string): boolean {
  return enabledPatterns.some((pattern) => matches(pattern, namespace));
}

/**
 * Create a trace function for the given namespace. Cheap to call at module
 * load time from anywhere -- registration itself has no cost, and the
 * returned function does no work beyond a property read while its namespace
 * is disabled.
 */
export function createTracer(namespace: string): Tracer {
  registry.add(namespace);

  const tracer = ((
    label: string,
    details?: TraceDetails | (() => TraceDetails)
  ) => {
    if (!isNamespaceEnabled(namespace)) {
      return;
    }
    const resolved = typeof details === "function" ? details() : details;
    // eslint-disable-next-line no-console
    console.log(
      `[${namespace}] ${label} ${JSON.stringify({
        at: new Date().toISOString(),
        ...resolved,
      })}`
    );
  }) as Tracer;

  Object.defineProperty(tracer, "enabled", {
    get: () => isNamespaceEnabled(namespace),
  });

  return tracer;
}

const uixDebug: UixDebug = {
  disable(): void {
    enabledPatterns = [];
    try {
      window.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // ignore -- localStorage unavailable
    }
  },
  enable(pattern = "*"): void {
    enabledPatterns = [...new Set([...enabledPatterns, pattern])];
    try {
      window.localStorage?.setItem(STORAGE_KEY, enabledPatterns.join(","));
    } catch {
      // ignore -- localStorage unavailable
    }
  },
  list(): string[] {
    return [...registry].sort();
  },
};

declare global {
  interface Window {
    __UIX_DEBUG__?: UixDebug;
  }
}

if (typeof window !== "undefined") {
  window.__UIX_DEBUG__ = uixDebug;
}

/** @internal exported for tests only */
export const __resetTraceStateForTests = (): void => {
  enabledPatterns = readInitialPatterns();
  registry.clear();
};
