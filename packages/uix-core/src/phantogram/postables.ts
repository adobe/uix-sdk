/** @internal */
export interface MessageTarget {
  postMessage: Window["postMessage"];
}

/** @internal */
export interface MessageSource {
  onmessage: Window["onmessage"];
  addEventListener: Window["addEventListener"];
  removeEventListener: Window["addEventListener"];
}

/** @internal */
export type MessageDuplex = MessageTarget & MessageSource;

/** @internal */
export type MessagePortLike = Pick<
  MessagePort,
  | "onmessage"
  | "addEventListener"
  | "start"
  | "postMessage"
  | "removeEventListener"
>;
