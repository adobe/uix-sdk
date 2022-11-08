import EventEmitter from "eventemitter3";
import { MessagePortLike } from "../postables";
import { RemoteEvents } from "../remote-subject";

const emit = EventEmitter.prototype.emit;

const emitData = (
  emitter: EventEmitter,
  { data: { type, payload } }: MessageEvent<RemoteEvents>
) => {
  emit.call(emitter, type, payload);
};

export class MessagePortEmitter extends EventEmitter {
  private messagePort: MessagePortLike;
  constructor(remote: MessagePortLike) {
    super();
    this.messagePort = remote;
    this.messagePort.addEventListener("message", (event) =>
      emitData(this, event)
    );
  }
  start() {
    this.messagePort.start();
  }
  emit<T extends string | symbol, P extends object>(
    type: T,
    payload: P
  ): boolean {
    this.messagePort.postMessage({ type: type, payload });
    return true;
  }
}
