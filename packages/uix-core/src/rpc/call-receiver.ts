import type { RemoteSubject } from "../remote-subject";
import type { CallArgsTicket, DefTicket } from "../tickets";

export function receiveCalls(
  fn: CallableFunction,
  ticket: DefTicket,
  remote: WeakRef<RemoteSubject>,
) {
  const responder = async ({ fnId, callId, args }: CallArgsTicket) => {
    /* istanbul ignore next: should never happen */
    try {
      const value = await fn(...args);

      remote.deref().respond({
        callId,
        fnId,
        status: "resolve",
        value,
      });
    } catch (error) {
      remote.deref().respond({
        callId,
        error,
        fnId,
        status: "reject",
      });
    }
  };

  return remote.deref().onCall(ticket, responder);
}
