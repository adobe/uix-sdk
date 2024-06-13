/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Adapter to attach console logging listeners to a Host running in an app
 * @hidden
 */
import { Emitter } from "@adobe/uix-core";
import type { HostEvents } from "./host.js";
import type { Metrics } from "@adobe/exc-app/metrics";
import MetricsApi from "@adobe/exc-app/metrics";

type EventPayload = {
  event: string | string[];
  args: any;
};

/**
 * Wrapper class for handling metrics and event tracking.
 */
class MetricsWrapper {
  private eventPool: EventPayload[] = [];
  private metricsInstance?: Readonly<Metrics> | undefined = undefined;

  /**
   * Sends collected events to the metrics instance.
   */
  private flush(): void {
    if (!this.metricsInstance) {
      return;
    }

    this.eventPool.forEach((eventPayload) => {
      this.metricsInstance.event(eventPayload.event, eventPayload.args);
    });
    this.eventPool = [];
  }

  /**
   * Gets the current metrics instance.
   */
  public get mertricsInstance(): Readonly<Metrics> | undefined {
    return this.metricsInstance;
  }

  /**
   * Sets the metrics instance and flushes any pending events.
   */
  public set mertricsInstance(metrics: Readonly<Metrics>) {
    this.metricsInstance = metrics;
    this.metricsInstance && this.flush();
  }

  /**
   * Tracks an event using the metrics instance, or adds it to the event pool if no instance is set.
   */
  public event(event: string, args: any): void {
    if (this.metricsInstance) {
      this.metricsInstance.event(event, args);
    } else {
      this.eventPool.push({ event, args });
    }
  }
}
const metrics = new MetricsWrapper();

const seenGuests = new Set();
const runtimeWaitTimeout = 10000;
const createMetricsInstance = () => MetricsApi.create("exc.uix.core");

const startTime = Date.now();
/**
 * Monitors the availability of the runtime module and creates a metrics instance when it becomes available.
 * If the runtime module is not found within the specified timeout, it exits and no events will be sent.
 * @returns {void}
 */
const runtimeSpy = () => {
  if (startTime + runtimeWaitTimeout < Date.now()) {
    // Timeout, time to hang up
    return;
  }
  if ("exc-module-runtime" in window) {
    metrics.mertricsInstance = createMetricsInstance();
    return;
  }
  setTimeout(runtimeSpy, 1000);
};
runtimeSpy();

/**
 * Adds metrics tracking to the host.
 *
 * @param host - The host emitter to attach the metrics to.
 */
export function addMetrics(host: Emitter<HostEvents>): void {
  host.addEventListener("guestload", (evt) => {
    const guest = evt.detail.guest;
    if (seenGuests.has(guest)) {
      return;
    }
    seenGuests.add(guest);
    const addGuestId = (payload: any): any => {
      payload["guestId"] = guest.id;
      return payload;
    };

    metrics.event("load", addGuestId({}));

    guest.addEventListener("beforecallguestmethod", (callDetails) => {
      const { path } = callDetails.detail;
      metrics.event(
        "callguestmethod",
        addGuestId({
          path: (path as string[]).join("."),
        })
      );
    });
    guest.addEventListener("beforecallhostmethod", (callDetails) => {
      const { path, name } = callDetails.detail;
      path.push(name);
      metrics.event(
        "callhostmethod",
        addGuestId({
          path: (path as string[]).join("."),
        })
      );
    });
  });

  host.addEventListener("error", () => {
    metrics.event("error", {});
  });
}
