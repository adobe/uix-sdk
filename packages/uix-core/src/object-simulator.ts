import { isWrapped, unwrap, wrap } from "./message-wrapper";
import EventEmitter from "eventemitter3";
import type { DefMessage, Materialized, Simulated } from "./object-walker";
import { NOT_TRANSFORMED, transformRecursive } from "./object-walker";
import { makeCallSender, receiveCalls } from "./rpc";
import type { Simulator } from "./remote-subject";
import { RemoteSubject } from "./remote-subject";
import type { DefTicket } from "./tickets";
import { hasProp } from "./value-assertions";

function isDefMessage(value: unknown): value is DefMessage {
  return isWrapped(value) && hasProp(unwrap(value), "fnId");
}

const bindAll = <T>(inst: T, methods: (keyof T)[]) => {
  for (const methodName of methods) {
    const method = inst[methodName];
    if (typeof method === "function") {
      inst[methodName] = method.bind(inst);
    }
  }
};

interface CleanupNotifier {
  // #region Public Methods

  register(obj: any, heldValue: string, ref?: any): void;
  unregister(ref: any): void;

  // #endregion Public Methods
}

interface CleanupNotifierConstructor {
  new (callback: (heldValue: unknown) => void): CleanupNotifier;
}

export class ObjectSimulator implements Simulator {
  // #region Properties

  private cleanupNotifier: CleanupNotifier;
  private fnCounter = 0;
  private receiverTicketCache: WeakMap<CallableFunction, DefTicket> =
    new WeakMap();
  private senderCache: WeakMap<DefTicket, CallableFunction> = new WeakMap();

  subject: RemoteSubject;

  // #endregion Properties

  // #region Constructors

  constructor(subject: RemoteSubject, cleanupNotifier: CleanupNotifier) {
    this.cleanupNotifier = cleanupNotifier;
    this.subject = subject;

    bindAll(this, ["makeSender", "makeReceiver", "simulate", "materialize"]);
  }

  // #endregion Constructors

  // #region Public Static Methods

  static create(
    emitter: EventEmitter,
    Cleanup: CleanupNotifierConstructor
  ): ObjectSimulator {
    let simulator: Simulator;
    // proxy simulator, so as not to have cyclic dependency
    const simulatorInterface: Simulator = {
      simulate: (x) => simulator.simulate(x),
      materialize: (x) => simulator.materialize(x),
    };

    const subject = new RemoteSubject(emitter, simulatorInterface);

    const cleanupNotifier = new Cleanup((fnId: string) => {
      return subject.notifyCleanup({ fnId });
    });

    simulator = new ObjectSimulator(subject, cleanupNotifier);

    return simulator as ObjectSimulator;
  }

  // #endregion Public Static Methods

  // #region Public Methods

  makeReceiver(fn: CallableFunction, parent?: Object) {
    if (typeof fn !== "function") {
      return NOT_TRANSFORMED;
    }
    let fnTicket = this.receiverTicketCache.get(fn);
    if (!fnTicket) {
      fnTicket = {
        fnId: `${fn.name || "<anonymous>"}_${++this.fnCounter}`,
      };
      // Bind function to parent object if it exists
      let boundFunction = fn;
      if (parent) {
        boundFunction = fn.bind(parent);
      }
      const cleanup = receiveCalls(
        boundFunction,
        fnTicket,
        new WeakRef(this.subject)
      );
      this.subject.onOutOfScope(fnTicket, cleanup);
      this.receiverTicketCache.set(boundFunction, fnTicket);
    }
    return wrap(fnTicket);
  }

  makeSender(message: unknown) {
    if (!isDefMessage(message)) {
      return NOT_TRANSFORMED;
    }
    const ticket = unwrap(message);
    /* istanbul ignore else: preopt */
    if (!this.senderCache.has(ticket)) {
      const sender = makeCallSender(ticket, new WeakRef(this.subject));
      this.cleanupNotifier.register(sender, ticket.fnId, sender);
      this.senderCache.set(ticket, sender);
      return sender;
    } else {
      return this.senderCache.get(ticket) as CallableFunction;
    }
  }

  materialize<T>(simulated: T) {
    return transformRecursive<CallableFunction>(
      this.makeSender,
      simulated
    ) as Materialized<T>;
  }

  simulate<T>(localObject: T) {
    return transformRecursive<DefMessage>(
      this.makeReceiver,
      localObject
    ) as Simulated<T>;
  }

  // #endregion Public Methods
}
