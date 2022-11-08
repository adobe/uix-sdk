import EventEmitter from "eventemitter3";
import { RemoteEvents } from "../remote-subject";
import {
  CallTicket,
  DefTicket,
  DisconnectionTicket,
  CleanupTicket,
} from "../tickets";

type RPCTicket = DefTicket | CallTicket | DisconnectionTicket | CleanupTicket;

type RemoteEventType = RemoteEvents["type"];

export class DataEmitter {
  private emitter: EventEmitter;
  constructor(emitter: EventEmitter) {
    this.emitter = emitter;
  }
  onReceive<T extends RemoteEventType>(
    type: T,
    handler: (arg: unknown) => void
  ) {
    this.emitter.on(type, handler);
    return () => {
      this.emitter.off(type, handler);
    };
  }
  onReceiveOnce<T extends RemoteEventType>(
    type: T,
    handler: (arg: unknown) => void
  ) {
    const unsubscribe = this.onReceive<T>(type, (ticket: unknown) => {
      unsubscribe();
      return handler(ticket);
    });
    return unsubscribe;
  }
  send(type: string, ticket: RPCTicket) {
    this.emitter.emit(type, ticket);
  }
}
