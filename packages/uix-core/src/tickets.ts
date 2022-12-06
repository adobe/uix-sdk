import { INIT_CALLBACK } from "./constants";

export interface HandshakeAcceptedTicket {
  // #region Properties

  accepts: string;
  version: string;

  // #endregion Properties
}
export interface HandshakeOfferedTicket {
  // #region Properties

  offers: string;
  version: string;

  // #endregion Properties
}

/** @internal */
export interface DefTicket {
  // #region Properties

  fnId: string;

  // #endregion Properties
}
export interface InitTicket extends DefTicket {
  // #region Properties

  fnId: typeof INIT_CALLBACK;

  // #endregion Properties
}
export interface CallTicket extends DefTicket {
  // #region Properties

  callId: number;

  // #endregion Properties
}
export interface CallArgsTicket extends CallTicket {
  // #region Properties

  args: any[];

  // #endregion Properties
}
export interface ResolveTicket extends CallTicket {
  // #region Properties

  status: "resolve";
  value: any;

  // #endregion Properties
}
export interface RejectTicket extends CallTicket {
  // #region Properties

  error: Error;
  status: "reject";

  // #endregion Properties
}
export type RespondTicket = ResolveTicket | RejectTicket;

export type CleanupTicket = {};

export const INIT_TICKET: InitTicket = {
  fnId: INIT_CALLBACK,
};
