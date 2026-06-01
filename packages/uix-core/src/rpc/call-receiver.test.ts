import { wait } from "../promises/wait";
import EventEmitter from "eventemitter3";
import { RemoteSubject } from "../remote-subject";
import { receiveCalls } from "./call-receiver";
import { FakeFinalizationRegistry } from "../__mocks__/mock-finalization-registry";
import { FakeWeakRef } from "../__mocks__/mock-weak-ref";
import { ObjectSimulator } from "../object-simulator";

describe("a listener for remote calls to a local function", () => {
  const MURMURS = ["baa", "moo", "ahoy"];
  const FARAWAY_SOUND = "(distant) riiiiicolaaaa";
  const ECHOES = "(echoes) riiiiicolaaaa";
  const village = jest.fn().mockReturnValue(MURMURS);
  const villageId = "village_1";
  const villageTicket = { fnId: villageId };
  let emitter: EventEmitter;
  let subject: RemoteSubject;
  let simulator: ObjectSimulator;
  beforeEach(() => {
    village.mockClear();
    jest.spyOn(console, "error").mockImplementation(() => {});
    emitter = new EventEmitter();
    simulator = ObjectSimulator.create(emitter, FakeFinalizationRegistry);
    subject = simulator.subject;
    receiveCalls(village, villageTicket, new FakeWeakRef(subject));
  });
  it("turns fn_call events into calls to local function", async () => {
    const responder = jest.fn();
    const call4Ticket = {
      ...villageTicket,
      callId: 4,
    };
    subject.onRespond(call4Ticket, responder);
    subject.send({
      ...call4Ticket,
      args: [FARAWAY_SOUND, ECHOES],
    });
    await expect(village).toHaveBeenCalledWith(FARAWAY_SOUND, ECHOES);
    expect(responder).toHaveBeenCalledWith(
      expect.objectContaining({
        ...call4Ticket,
        status: "resolve",
        value: expect.arrayContaining(["baa", "moo", "ahoy"]),
      })
    );
  });
  it("sends events notifying of rejections", async () => {
    const responder = jest.fn();
    const call500Ticket = {
      ...villageTicket,
      callId: 500,
    };
    subject.onRespond(call500Ticket, responder);
    village.mockRejectedValueOnce(new Error("what is that infernal noise"));
    subject.send({
      ...call500Ticket,
      args: [FARAWAY_SOUND],
    });
    await expect(village).toHaveBeenCalledWith(FARAWAY_SOUND);
    await wait(100);
    expect(responder).toHaveBeenCalledWith(
      expect.objectContaining({
        ...call500Ticket,
        status: "reject",
        error: expect.any(Error),
      })
    );
  });
  it.skip("unsubscribes itself when receiving a cleanup event", async () => {
    const responder = jest.fn();
    const call76Ticket = {
      ...villageTicket,
      callId: 76,
    };
    subject.onRespond(call76Ticket, responder);
    village.mockRejectedValueOnce(new Error("what is that infernal noise"));

    subject.notifyCleanup(call76Ticket);

    await wait(100);

    subject.send({
      ...call76Ticket,
      args: [FARAWAY_SOUND],
    });

    await wait(100);
    expect(responder).not.toHaveBeenCalled();
  });
});
