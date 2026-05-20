import type { CallArgsTicket, DefTicket } from "../tickets";
import type { RemoteSubject } from "../remote-subject";

export function receiveCalls(
  fn: CallableFunction,
  ticket: DefTicket,
  remote: WeakRef<RemoteSubject>
) {
  const responder = async ({ fnId, callId, args }: CallArgsTicket) => {
    /* istanbul ignore next: should never happen */
    try {
      const value = await fn(...args);
      remote.deref().respond({
        fnId,
        callId,
        value,
        status: "resolve",
      });
    } catch (error) {
      remote.deref().respond({
        fnId,
        callId,
        status: "reject",
        error,
      });
    }
  };
  return remote.deref().onCall(ticket, responder);
}
