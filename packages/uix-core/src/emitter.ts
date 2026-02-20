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

import type { Emits, NamedEvent, Unsubscriber } from "./types.js";

/**
 * Browser-native {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget | EventTarget}
 * whose {@link Emitter.addEventListener} method returns an anonymous function
 * which unsubscribes the original handler.
 *
 * Also provides typed events via generics. You can create or extend this class
 * to define custom emitters with known event names and signatures.
 *
 * @example
 * ```ts
 * import type { NamedEvent, Emitter } from '@adobe/uix-sdk'
 *
 * class FizzBuzzEmitter extends Emitter<
 *   NamedEvent<"fizz", { fizzCount: number }> |
 *   NamedEvent<"buzz", { buzzCount: number }> |
 *   NamedEvent<"fizzbuzz">
 * > {
 * }
 * ```
 * The `FizzBuzzEmitter` class will now type check its events and event
 * listeners, providing autosuggest in editors.
 *
 * @see [EventTarget - MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)
 *
 * @public
 */
export class Emitter<Events extends NamedEvent>
  extends EventTarget
  implements Emits<Events>
{
  /**
   * An arbitrary string to uniquely identify this emitter and its events.
   * @public
   */
  id: string;
  constructor(id: string) {
    super();
    this.id = id;
  }
  /**
   * Convenience method to construct and dispatch custom events.
   *
   * @param type - Name of one of the allowed events this can emit
   * @param detail - Object to expose in the {@link https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail | CustomEvent#detail}
   * property.
   * @public
   */
  protected emit<Event extends Events>(
    type: Event["type"],
    detail: Event["detail"],
  ): void {
    const event = new CustomEvent<typeof detail>(type, { detail });

    this.dispatchEvent(event);
  }
  /**
   * Subscribe to an event and receive an unsubscribe callback.
   * @see [EventTarget.addEventListener - MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
   *
   * Identical to `EventTarget.addEventListener`, but returns an "unsubscriber"
   * function which detaches the listener when invoked. Solves an ergonomic
   * problem with native EventTargets where it's impossible to detach listeners
   * without having a reference to the original handler.
   *
   * @typeParam E - Name of one of the allowed events this can emit
   * @param type - Event type
   * @param listener - Event handler
   * @returns Call to unsubscribe listener.
   */
  addEventListener<
    Type extends Events["type"],
    Event extends Extract<Events, { type: Type }>,
  >(type: Type, listener: (ev: Event) => unknown): Unsubscriber {
    super.addEventListener(type, listener);
    return () => super.removeEventListener(type, listener);
  }
}
