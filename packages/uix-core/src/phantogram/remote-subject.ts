import type {
  CallArgsTicket,
  CallTicket,
  DefTicket,
  RejectTicket,
  ResolveTicket,
  RespondTicket,
  CleanupTicket,
} from "./tickets";
import type { Materialized, Simulated } from "./object-walker";
import EventEmitter from "eventemitter3";

type EvTypeDef = `${string}_f`;
type EvTypeGC = `${string}_g`;
type EvTypeCall = `${string}_c`;
type EvTypeRespond = `${string}_r`;
type EvTypeDestroyed = "destroyed";
type EvTypeConnected = "connected";
type EvTypeError = "error";

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
type RemoteReconnectedEvent = {
  type: EvTypeConnected;
  payload: void;
};
type RemoteDestroyedEvent = {
  type: EvTypeDestroyed;
  payload: void;
};
type RemoteErrorEvent = {
  type: EvTypeError;
  payload: Error;
};

export type RemoteEvents =
  | RemoteDefEvent
  | RemoteCallEvent
  | RemoteResolveEvent
  | RemoteRejectEvent
  | RemoteCleanupEvent
  | RemoteReconnectedEvent
  | RemoteDestroyedEvent
  | RemoteErrorEvent;

type Simulates = <T>(localObject: T) => Simulated<T>;
type Materializes = <T>(simulatedObject: T) => Materialized<T>;

export interface Simulator {
  // #region Properties

  materialize: Materializes;
  simulate: Simulates;

  // #endregion Properties
}

type Mapper = Simulates | Materializes;

export class RemoteSubject {
  // #region Properties

  private emitter: EventEmitter;
  private simulator: Simulator;

  // #endregion Properties

  // #region Constructors

  constructor(emitter: EventEmitter, simulator: Simulator) {
    this.emitter = emitter;
    this.simulator = simulator;
  }

  // #endregion Constructors

  // #region Public Methods

  notifyCleanup(ticket: DefTicket) {
    return this.emitter.emit(`${ticket.fnId}_g`, {});
  }

  notifyConnect() {
    return this.emitter.emit("connected");
  }

  notifyDestroy() {
    return this.emitter.emit("destroyed");
  }

  onCall(ticket: DefTicket, handler: (ticket: CallArgsTicket) => void) {
    return this.subscribe(`${ticket.fnId}_c`, (ticket: CallArgsTicket) =>
      handler(this.processCallTicket(ticket, this.simulator.materialize))
    );
  }

  onConnected(handler: () => void) {
    return this.subscribe("connected", handler);
  }

  onDestroyed(handler: () => void) {
    return this.subscribe("destroyed", handler);
  }

  onOutOfScope(ticket: DefTicket, handler: () => void) {
    return this.subscribeOnce(`${ticket.fnId}_g`, handler);
  }

  onRespond(ticket: CallTicket, handler: (ticket: RespondTicket) => void) {
    const fnAndCall = `${ticket.fnId}${ticket.callId}`;
    return this.subscribeOnce(`${fnAndCall}_r`, (ticket: RespondTicket) =>
      handler(this.processResponseTicket(ticket, this.simulator.materialize))
    );
  }

  respond(ticket: RespondTicket) {
    const fnAndCall = `${ticket.fnId}${ticket.callId}`;
    return this.emitter.emit(
      `${fnAndCall}_r`,
      this.processResponseTicket(ticket, this.simulator.simulate)
    );
  }

  send(ticket: CallArgsTicket) {
    return this.emitter.emit(
      `${ticket.fnId}_c`,
      this.processCallTicket(ticket, this.simulator.simulate)
    );
  }

  // #endregion Public Methods

  // #region Private Methods

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

  private subscribe(type: string, handler: (arg: unknown) => void) {
    this.emitter.on(type, handler);
    return () => {
      this.emitter.off(type, handler);
    };
  }

  private subscribeOnce(type: string, handler: (arg: unknown) => void) {
    this.emitter.once(type, handler);
    return () => {
      this.emitter.off(type, handler);
    };
  }

  // #endregion Private Methods
}
