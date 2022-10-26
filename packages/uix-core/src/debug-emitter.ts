import { _customConsole, DebugLogger, Theme } from "./debuglog.js";
import { Emits, Unsubscriber } from "./types.js";

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
    listener: (logger: EmitterDebugLogger, ev: CustomEvent) => unknown
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
  }
): EmitterDebugLogger {
  const logger = _customConsole(
    opts.theme,
    opts.type ||
      (Object.getPrototypeOf(emitter) as typeof emitter).constructor.name,
    opts.id || emitter.id
  ) as EmitterDebugLogger;
  const oldDispatch = emitter.dispatchEvent;
  emitter.dispatchEvent = (event) => {
    logger.pushState({ type: "event", name: event.type });
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
    listener: (logger: EmitterDebugLogger, ev: CustomEvent) => unknown
  ) {
    subscriptions.push(
      emitter.addEventListener(type, (event) => listener(logger, event))
    );
    return logger;
  }

  logger.listen = listen;

  return logger;
}
