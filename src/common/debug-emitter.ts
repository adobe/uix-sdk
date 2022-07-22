/* eslint-disable @typescript-eslint/unbound-method */
import { customConsole, DebugLogger, Theme } from "./debuglog";
import { Emits, NamedEvent, Unsubscriber } from "./types";

interface EmitterDebugLogger<Events extends NamedEvent> extends DebugLogger {
  listen<Type extends Events["type"]>(
    type: Type,
    listener: (
      logger: DebugLogger,
      ev: Extract<Events, { type: Type }>
    ) => unknown
  ): this;
}

export function debugEmitter<Events extends NamedEvent>(
  emitter: Emits<Events>,
  opts: {
    theme: Theme;
    id?: string;
  }
): EmitterDebugLogger<Events> {
  const logger = customConsole(
    opts.theme,
    (Object.getPrototypeOf(emitter) as typeof emitter).constructor.name,
    opts.id || emitter.id
  );
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

  const emitterLogger = logger as EmitterDebugLogger<Events>;

  function listen<Type extends Events["type"]>(
    type: Type,
    listener: (
      logger: DebugLogger,
      ev: Extract<Events, { type: Type }>
    ) => unknown
  ): typeof emitterLogger {
    subscriptions.push(
      emitter.addEventListener(type, (event) => listener(emitterLogger, event))
    );
    return emitterLogger;
  }

  emitterLogger.listen = listen;

  return emitterLogger;
}
