import type {
  CallArgsTicket,
  CallTicket,
  DefTicket,
  RejectTicket,
  ResolveTicket,
  RespondTicket,
  DisconnectionTicket,
  CleanupTicket,
} from "./tickets";
import type { Materialized, Simulated } from "./object-walker";
import { DataEmitter } from "./emitters/data-emitter";

type EvTypeDef = `${string}_f`;
type EvTypeGC = `${string}_g`;
type EvTypeCall = `${string}_c`;
type EvTypeRespond = `${string}_r`;
type EvTypeDisconnect = "disconnected";

type RemoteDefEvent = {
  type: EvTypeDef;
  payload: DefTicket;
};
type RemoteCallEvent = {
  type: EvTypeCall;
  payload: CallArgsTicket;
};
type RemoteResolveEvent = {
  type: EvTypeRespond;
  payload: ResolveTicket;
};
type RemoteRejectEvent = {
  type: EvTypeRespond;
  payload: RejectTicket;
};
type RemoteCleanupEvent = {
  type: EvTypeGC;
  payload: CleanupTicket;
};
type RemoteDisconnectedEvent = {
  type: EvTypeDisconnect;
  payload: DisconnectionTicket;
};

export type RemoteEvents =
  | RemoteDefEvent
  | RemoteCallEvent
  | RemoteResolveEvent
  | RemoteRejectEvent
  | RemoteCleanupEvent
  | RemoteDisconnectedEvent;

type Simulates = <T>(localObject: T) => Simulated<T>;
type Materializes = <T>(simulatedObject: T) => Materialized<T>;

export interface Simulator {
  simulate: Simulates;
  materialize: Materializes;
}

type Mapper = Simulates | Materializes;

export class RemoteSubject {
  private emitter: DataEmitter;
  private simulator: Simulator;
  constructor(emitter: DataEmitter, simulator: Simulator) {
    this.emitter = emitter;
    this.simulator = simulator;
  }
  private processCallTicket(
    { args, ...ticket }: CallArgsTicket,
    mapper: Mapper
  ) {
    return {
      ...ticket,
      args: args.map(mapper),
    };
  }
  private processResponseTicket(ticket: RespondTicket, mapper: Mapper) {
    return ticket.status === "resolve"
      ? { ...ticket, value: mapper(ticket.value) }
      : ticket;
  }
  disconnect({ reason }: { reason: string }) {
    return this.emitter.send("disconnected", { reason });
  }
  send(ticket: CallArgsTicket) {
    return this.emitter.send(
      `${ticket.fnId}_c`,
      this.processCallTicket(ticket, this.simulator.simulate)
    );
  }
  onRespond(ticket: CallTicket, handler: (ticket: RespondTicket) => void) {
    const fnAndCall = `${ticket.fnId}${ticket.callId}`;
    return this.emitter.onReceiveOnce(
      `${fnAndCall}_r`,
      (ticket: RespondTicket) =>
        handler(this.processResponseTicket(ticket, this.simulator.materialize))
    );
  }
  onCall(ticket: DefTicket, handler: (ticket: CallArgsTicket) => void) {
    return this.emitter.onReceive(
      `${ticket.fnId}_c`,
      (ticket: CallArgsTicket) =>
        handler(this.processCallTicket(ticket, this.simulator.materialize))
    );
  }
  respond(ticket: RespondTicket) {
    const fnAndCall = `${ticket.fnId}${ticket.callId}`;
    return this.emitter.send(
      `${fnAndCall}_r`,
      this.processResponseTicket(ticket, this.simulator.simulate)
    );
  }
  onDisconnected(handler: (connection: DisconnectionTicket) => void) {
    return this.emitter.onReceiveOnce("disconnected", handler);
  }
  onOutOfScope(ticket: DefTicket, handler: () => void) {
    return this.emitter.onReceiveOnce(`${ticket.fnId}_g`, handler);
  }
  notifyCleanup(ticket: DefTicket) {
    return this.emitter.send(`${ticket.fnId}_g`, {});
  }
}
