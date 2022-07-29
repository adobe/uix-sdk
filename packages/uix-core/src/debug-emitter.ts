/* eslint-disable @typescript-eslint/unbound-method */
/**
 * Adapter to attach console logging listeners to all events on an emitter.
 * @hidden
 */
import { customConsole, DebugLogger, Theme } from "./debuglog.js";
import { Emits, Unsubscriber } from "./types.js";

interface EmitterDebugLogger extends DebugLogger {
  listen(
    type: string,
    listener: (logger: EmitterDebugLogger, ev: CustomEvent) => unknown
  ): this;
}

export function debugEmitter(
  emitter: Emits,
  opts: {
    theme: Theme;
    type?: string;
    id?: string;
  }
): EmitterDebugLogger {
  const logger = customConsole(
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
