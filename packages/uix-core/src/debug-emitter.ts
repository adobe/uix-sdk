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

import type { DebugLogger, Theme } from "./debuglog.js";
import { _customConsole } from "./debuglog.js";
import type { Emits, Unsubscriber } from "./types.js";

/**
 * Adds methods for logging events
 * @internal
 */
export interface EmitterDebugLogger extends DebugLogger {
  /**
   * Listen to an event and pass the logger to the handler
   * @internal
   */
  listen(
    type: string,
    listener: (logger: EmitterDebugLogger, ev: CustomEvent) => unknown,
  ): this;
}

/**
 * Debugger for EventTarget objects like Hosts, Ports and Guests, which
 * patches dispatchEvent to log events
 * Adapter to attach console logging listeners to all events on an emitter.
 * @internal
 */
export function debugEmitter(
  emitter: Emits,
  opts: {
    theme: Theme;
    type?: string;
    id?: string;
  },
): EmitterDebugLogger {
  const logger = _customConsole(
    opts.theme,
    opts.type ||
      (Object.getPrototypeOf(emitter) as typeof emitter).constructor.name,
    opts.id || emitter.id,
  ) as EmitterDebugLogger;
  const oldDispatch = emitter.dispatchEvent;

  emitter.dispatchEvent = (event) => {
    logger.pushState({ name: event.type, type: "event" });
    const retVal = oldDispatch.call(emitter, event) as boolean;

    logger.popState();
    return retVal;
  };

  const subscriptions: Unsubscriber[] = [];

  const oldDetach = logger.detach;

  logger.detach = () => {
    oldDetach.call(logger);
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };

  /**
   * Listens and passes a logger to callbacks
   */
  function listen(
    type: string,
    listener: (logger: EmitterDebugLogger, ev: CustomEvent) => unknown,
  ) {
    subscriptions.push(
      emitter.addEventListener(type, (event) => listener(logger, event)),
    );
    return logger;
  }

  logger.listen = listen;

  return logger;
}
