import { Emits, Unsubscriber, NamedEvent } from "./types.js";

/**
 * Browser-native [EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)
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
 */
export class Emitter<Events extends NamedEvent>
  extends EventTarget
  implements Emits<Events>
{
  id: string;
  constructor(id: string) {
    super();
    this.id = id;
  }
  protected emit<Event extends Events>(
    type: Event["type"],
    detail: Event["detail"]
  ): void {
    const event = new CustomEvent<typeof detail>(type, { detail });
    this.dispatchEvent(event);
  }
  /**
   * Subscribe to an event and receive an unsubscribe callback.
   * @see [EventTarget.addEventListener - MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
   *
   * @typeParam E - Name of one of the allowed events this can emit
   * @param type - Event type
   * @param listener - Event handler
   * @returns Call to unsubscribe listener.
   */
  addEventListener<
    Type extends Events["type"],
    Event extends Extract<Events, { type: Type }>
  >(type: Type, listener: (ev: Event) => unknown): Unsubscriber {
    super.addEventListener(type, listener);
    return () => super.removeEventListener(type, listener);
  }
}
