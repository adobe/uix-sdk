import { INIT_CALLBACK } from "./constants";

export interface HandshakeAcceptedTicket {
  type: "handshake_accepted";
  key: string;
  version: string;
}
export interface HandshakeOfferedTicket {
  type: "handshake_offered";
  key: string;
  version: string;
}

/** @internal */
export interface DefTicket {
  fnId: string;
}
export interface InitTicket extends DefTicket {
  fnId: typeof INIT_CALLBACK;
}
export interface CallTicket extends DefTicket {
  callId: number;
}
export interface CallArgsTicket extends CallTicket {
  args: any[];
}
export interface ResolveTicket extends CallTicket {
  status: "resolve";
  value: any;
}
export interface RejectTicket extends CallTicket {
  status: "reject";
  error: Error;
}
export type RespondTicket = ResolveTicket | RejectTicket;

export type DisconnectionTicket = {
  reason: string;
};

export type CleanupTicket = {};

export const INIT_TICKET: InitTicket = {
  fnId: INIT_CALLBACK,
};
