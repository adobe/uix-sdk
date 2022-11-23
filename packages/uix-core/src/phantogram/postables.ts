/** @internal */
export type MessageSource = WindowProxy;

/** @internal */
export type MessagePortLike = Pick<
  MessagePort,
  | "onmessage"
  | "addEventListener"
  | "start"
  | "postMessage"
  | "removeEventListener"
  | "close"
>;
