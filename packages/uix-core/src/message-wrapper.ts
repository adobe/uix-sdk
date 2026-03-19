import { NS_ROOT } from "./constants";
import { isPlainObject } from "./value-assertions";

/** @internal */
export type WrappedMessage<Message extends object> = { [NS_ROOT]: Message };

export const wrap = <Message extends object = object>(
  message: Message,
): WrappedMessage<Message> => ({ [NS_ROOT]: message });

export const unwrap = <Message extends object>(
  wrappedMessage: WrappedMessage<Message>,
): Message => wrappedMessage[NS_ROOT];

export const isWrapped = <Message extends object = object>(
  item: unknown,
): item is WrappedMessage<Message> => {
  if (!isPlainObject(item)) {
    return false;
  }

  const keys = Object.keys(item);
  const hasRoot = keys.includes(NS_ROOT);

  if (hasRoot && keys.length != 1) {
    console.error(
      `malformed tunnel message, should have one prop "${NS_ROOT}" at root`,
      item,
    );
    return false;
  }

  return hasRoot;
};
