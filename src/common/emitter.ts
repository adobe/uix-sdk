import { Emits, Unsubscriber, NamedEvent } from "./types";

/**
 * Browser-native [EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)
 * whose {@link Emitter.addEventListener} method returns an anonymous function
 * which unsubscribes the original handler.
 * @see [EventTarget - MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)
 */
export class Emitter<Events extends NamedEvent>
  extends EventTarget
  implements Emits<Events>
{
  constructor() {
    super();
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
   * @template {string} E - Name of one of the allowed events this can emit
   * @param {E} type - Event type
   * @param {(ev: Events[E]) => unknown} listener
   * @return {Unsubscriber} Call to unsubscribe listener.
   */
  addEventListener<
    Type extends Events["type"],
    Event extends Events & { type: Type }
  >(type: Type, listener: (ev: Event) => unknown): Unsubscriber {
    super.addEventListener(type, listener);
    return () => super.removeEventListener(type, listener);
  }
}
