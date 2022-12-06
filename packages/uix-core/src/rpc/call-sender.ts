import type { CallArgsTicket, DefTicket } from "../tickets";
import type { RemoteSubject } from "../remote-subject";

type RejectionPool = Set<(e: Error) => unknown>;

class DisconnectionError extends Error {
  constructor() {
    super(
      "Function belongs to a simulated remote object which has been disconnected! The tunnel may have been destroyed by page navigation or reload."
    );
  }
}

function dispatch(
  subject: RemoteSubject,
  callTicket: CallArgsTicket,
  rejectionPool: RejectionPool,
  resolve: { (value: unknown): void; (arg0: any): void },
  reject: { (reason?: string): void; (arg0: any): void }
) {
  subject.onRespond(callTicket, (responseTicket) => {
    rejectionPool.delete(reject);
    if (responseTicket.status === "resolve") {
      resolve(responseTicket.value);
    } else {
      reject(responseTicket.error);
    }
  });
  subject.send(callTicket);
}

export function makeCallSender(
  { fnId }: DefTicket,
  subjectRef: WeakRef<RemoteSubject>
) {
  let callCounter = 0;
  const rejectionPool: RejectionPool = new Set();
  let sender = function (...args: unknown[]) {
    return new Promise((resolve, reject) => {
      rejectionPool.add(reject);
      const callId = ++callCounter;
      const callTicket: CallArgsTicket = {
        fnId,
        callId,
        args,
      };
      return dispatch(
        subjectRef.deref(),
        callTicket,
        rejectionPool,
        resolve,
        reject
      );
    });
  };
  const destroy = () => {
    subjectRef = null;
    sender = () => {
      throw new DisconnectionError();
    };
    for (const reject of rejectionPool) {
      reject(new DisconnectionError());
    }
    rejectionPool.clear();
  };
  subjectRef.deref().onDestroyed(destroy);
  const facade = async function (...args: unknown[]) {
    return sender(...args);
  };
  Object.defineProperty(facade, "name", { value: fnId });
  return facade;
}
