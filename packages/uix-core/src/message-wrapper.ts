import { NS_ROOT } from "./constants";
import { isPlainObject } from "./value-assertions";

/** @internal */
export type WrappedMessage<Message extends object> = { [NS_ROOT]: Message };

export function wrap<Message extends object = object>(
  message: Message
): WrappedMessage<Message> {
  return { [NS_ROOT]: message };
}

export function unwrap<Message extends object>(
  wrappedMessage: WrappedMessage<Message>
): Message {
  return wrappedMessage[NS_ROOT];
}

export function isWrapped<Message extends object = object>(
  item: unknown
): item is WrappedMessage<Message> {
  if (!isPlainObject(item)) {
    return false;
  }
  const keys = Object.keys(item);
  const hasRoot = keys.includes(NS_ROOT);
  if (hasRoot && keys.length != 1) {
    console.error(
      `malformed tunnel message, should have one prop "${NS_ROOT}" at root`,
      item
    );
    return false;
  }
  return hasRoot;
}
