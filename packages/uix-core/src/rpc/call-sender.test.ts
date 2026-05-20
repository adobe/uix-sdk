import { RemoteSubject } from "../remote-subject";
import { makeCallSender } from "./call-sender";
import { ObjectSimulator } from "../object-simulator";
import { FakeFinalizationRegistry } from "../__mocks__/mock-finalization-registry";
import { FakeWeakRef } from "../__mocks__/mock-weak-ref";
import { wait } from "../promises/wait";
import EventEmitter from "eventemitter3";

describe("an proxy representing a function in the other realm", () => {
  const SOUND = "RIIIICOLAAAA";
  const FARAWAY_SOUND = "(distant) riiiiicolaaaa";
  const alpenhorn = jest.fn().mockReturnValue(SOUND);
  const alpenhornId = "alpenhorn_1";
  let simulator: ObjectSimulator;
  let emitter;
  let subject: RemoteSubject;
  let remoteAlpenhorn: ((...args: any[]) => Promise<unknown>) | (() => any);
  beforeEach(() => {
    alpenhorn.mockClear();
    emitter = new EventEmitter();
    simulator = ObjectSimulator.create(emitter, FakeFinalizationRegistry);
    subject = simulator.subject;
    remoteAlpenhorn = makeCallSender(
      { fnId: alpenhornId },
      new FakeWeakRef(subject)
    );
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  it("resolves through the emitter", async () => {
    subject.onCall(
      {
        fnId: alpenhornId,
      },
      (callTicket) => {
        const { callId, fnId } = callTicket;
        subject.respond({
          callId,
          fnId,
          status: "resolve",
          value: FARAWAY_SOUND,
        });
      }
    );
    await expect(remoteAlpenhorn()).resolves.toBe(FARAWAY_SOUND);
  });
  it("rejects through the emitter", async () => {
    subject.onCall({ fnId: alpenhornId }, (callTicket) => {
      const { callId, fnId } = callTicket;
      subject.respond({
        callId,
        fnId,
        status: "reject",
        error: new Error("bonk"),
      });
    });
    await expect(remoteAlpenhorn()).rejects.toThrowError("bonk");
  });
  it("destroys itself on disconnect", async () => {
    subject.onCall({ fnId: alpenhornId }, async (callTicket) => {
      const { callId, fnId } = callTicket;
      subject.notifyDestroy();
      await wait(100);
      subject.respond({
        callId,
        fnId,
        status: "reject",
        error: new Error("bonk"),
      });
    });
    await expect(remoteAlpenhorn()).rejects.toThrowError("destroyed");
    await expect(remoteAlpenhorn()).rejects.toThrowError("destroyed");
  });
});
