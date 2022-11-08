import { jest } from "@jest/globals";
import TunnelMessage from "./tunnel-message";
import MockMessageDuplex from "../__mocks__/mock-messageduplex";
import type { MessageDuplex, MessageSource } from "../postables";
import {
  destroyTunnel,
  createTunnel,
  TunnelOptions,
  TunnelConfig,
} from "./tunnel";
import { wait } from "../promises/wait";
import { NS_ROOT } from "../constants";
import type {
  HandshakeAcceptedTicket,
  HandshakeOfferedTicket,
} from "../tickets";
import { unwrap, wrap, WrappedMessage } from "../message-wrapper";

type HandshakeTicket =
  | WrappedMessage<HandshakeAcceptedTicket>
  | WrappedMessage<HandshakeOfferedTicket>;

function mockPostable(): jest.Mocked<MessageDuplex> {
  return jest.mocked(new MockMessageDuplex());
}

function emitMessageEvent(
  postable: jest.Mocked<MessageDuplex>,
  options: MessageEventInit
) {
  const events = Reflect.get(postable, "events");
  events.dispatchEvent(new MessageEvent("message", options));
}

const validConfig = (overrides: TunnelOptions) => ({
  postTo: mockPostable(),
  receiveFrom: mockPostable(),
  timeout: 150,
  ...overrides,
});

const withConfig = (opts: Partial<TunnelOptions>) =>
  createTunnel(validConfig(opts as TunnelOptions));

describe("tunnel", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    TunnelMessage.resetWarnings();
  });
  describe("validates config object", () => {
    it("requires an object argument", async () => {
      await expect(
        createTunnel(null as unknown as TunnelConfig)
      ).rejects.toThrow("requires a config object");
      await expect(createTunnel(7 as unknown as TunnelConfig)).rejects.toThrow(
        "requires a config object"
      );
    });
    it("requires a string key", async () => {
      await expect(
        withConfig({
          key: undefined,
        })
      ).rejects.toThrowError("requires a string key");
    });
    it.skip("requires a timeout number", async () => {
      await expect(
        withConfig({
          timeout: "blah" as unknown as number,
        })
      ).rejects.toThrowError("timeout value must be a number");
    });
    it("requires a target origin", async () => {
      await expect(
        withConfig({
          targetOrigin: undefined,
        })
      ).rejects.toThrowError("tunnel requires a URL string target origin");
      await expect(
        withConfig({
          targetOrigin: 12 as unknown as string,
        })
      ).rejects.toThrowError("tunnel requires a URL string target origin");
      await expect(
        withConfig({
          targetOrigin: "akhbsdkjabhds",
        })
      ).rejects.toThrowError("target origin must either be a valid URL origin");
      await expect(
        withConfig({
          targetOrigin: "https://example.com:1234/plus-path/?wuary",
        })
      ).rejects.toThrowError("target origin must be only a URL origin");
    });
    it("expects a postTo that has postMessage", async () => {
      await expect(
        withConfig({
          remote: {
            postTo: {
              ...mockPostable(),
              postMessage: undefined as unknown as MessageDuplex["postMessage"],
            },
            receiveFrom: mockPostable(),
          },
        })
      ).rejects.toThrowError("postTo object must have a postMessage method");
    });
    it("expects a receiveFrom object that emits message events", async () => {
      await expect(
        withConfig({
          remote: {
            ...mockPostable(),
            postTo: mockPostable(),
            receiveFrom: {
              addEventListener:
                undefined as unknown as EventTarget["addEventListener"],
            } as MessageSource,
          },
        })
      ).rejects.toThrowError("receiveFrom object must be an event listener");
      await expect(
        withConfig({
          remote: {
            receiveFrom: {
              ...mockPostable(),
              removeEventListener:
                undefined as unknown as EventTarget["addEventListener"],
            },
            postTo: mockPostable(),
          },
        })
      ).rejects.toThrowError("receiveFrom object must be an event listener");
    });
    it("throws all config problems in a list", async () => {
      await expect(
        createTunnel({
          key: "aint phantogram",
          targetOrigin: "*",
          remote: {
            receiveFrom: false as unknown as MessageDuplex,
            postTo: false as unknown as MessageDuplex,
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
        "invalid config:
         - postTo object must have a postMessage method
         - receiveFrom object must be an event listener"
      `);
    });
  });
  describe("handles errors constructing tunnel", () => {
    it("ignores or logs busted messages", async () => {
      const receiveFrom = mockPostable();
      const tunnelPromise = createTunnel({
        key: "test1",
        remote: { postTo: mockPostable(), receiveFrom },
        targetOrigin: "*",
        timeout: 200,
      });
      await wait(100);
      [
        "",
        {
          wrong: "key",
        },
        {
          too: "many",
          keys: "dude",
        },
        {
          [NS_ROOT]: 5,
          keys: "dude",
        },
        {
          [NS_ROOT]: 5,
        },
        {
          [NS_ROOT]: {},
        },
        {
          [NS_ROOT]: {
            version: "-1.0.0",
          },
        },
        {
          [NS_ROOT]: {
            version: "-1.0.0",
            type: "test_type",
          },
        },
        {
          [NS_ROOT]: {
            version: "-1.0.0",
            type: "test_type",
            payload: {},
          },
        },
      ].forEach((data) => {
        emitMessageEvent(receiveFrom, { data });
      });
      await expect(tunnelPromise).rejects.toThrowErrorMatchingInlineSnapshot(
        `"MessageChannel handshake timed out after 200ms"`
      );
    });
  });
  describe("exchanges messageports", () => {
    it("posts to the postTo with a message port", async () => {
      const postTo = mockPostable();
      const receiveFrom = mockPostable();
      jest.useFakeTimers();
      const tunnelPromise = createTunnel({
        key: "test1",
        remote: { postTo, receiveFrom },
        targetOrigin: "*",
        timeout: 1000,
      });
      jest.advanceTimersByTime(500);
      expect(postTo.postMessage).toHaveBeenCalledWith(
        expect.objectContaining(TunnelMessage.makeOffered("test1")),
        "*",
        expect.arrayContaining([expect.any(MessagePort)])
      );
      jest.advanceTimersByTime(1000);
      await expect(tunnelPromise).rejects.toThrowError("timed out");
      jest.useRealTimers();
    });
    it("chooses its own messageport when received handshake_accepted before handshake_offered", async () => {
      expect.assertions(5);
      let destPort: MessagePort;
      const postTo = mockPostable();
      const receiveFrom = mockPostable();
      const accepted = TunnelMessage.makeAccepted("test1");
      const offered = TunnelMessage.makeOffered("test1");
      postTo.addEventListener("message", (e: MessageEvent) => {
        expect(e.data).toMatchObject(offered);
        expect(e.ports[0]).toBeInstanceOf(MessagePort);
        destPort = e.ports[0];
        emitMessageEvent(receiveFrom, {
          data: accepted,
        });
      });
      const tunnelPromise = createTunnel({
        key: "test1",
        remote: { postTo, receiveFrom },
        targetOrigin: "*",
      });
      receiveFrom.postMessage(TunnelMessage.makeOffered("test1"), "*");
      await expect(tunnelPromise).resolves.toBeInstanceOf(MessagePort);
      const tunnelPort = await tunnelPromise;
      const testMessage1 = wrap({
        highly: "irregular",
      });
      destPort!.addEventListener("message", (e) => {
        expect(e.data).toMatchObject(testMessage1);
      });
      const testMessage2 = wrap({
        medium: "rare",
      });
      tunnelPort!.addEventListener("message", (e) => {
        expect(e.data).toMatchObject(testMessage2);
      });
      tunnelPort.start();
      destPort!.start();
      tunnelPort.postMessage(testMessage1);
      destPort!.postMessage(testMessage2);
      await wait(100);
      destroyTunnel(tunnelPort);
    });
    describe("handles message irregularities", () => {
      const postTo = new MockMessageDuplex();
      const receiveFrom = new MockMessageDuplex();
      beforeEach(() => {
        postTo.mockReset();
        receiveFrom.mockReset();
      });
      it("ignores messages from the wrong origin", async () => {});
      it("ignores messages with the wrong key", async () => {
        const offeredWrong = TunnelMessage.makeOffered("WRONG_KEY");
        const accepted = TunnelMessage.makeAccepted("WRONG_KEY");
        async function sendWrongKey(message: unknown) {
          const shouldNotTrigger = jest.fn();
          postTo.addEventListener("message", shouldNotTrigger);
          const tunnelPromise = createTunnel({
            timeout: 100,
            key: "right-key",
            remote: { postTo, receiveFrom },
            targetOrigin: "*",
          });
          receiveFrom.postMessage(message);
          await expect(tunnelPromise).rejects.toThrowError("timed out");
          expect(shouldNotTrigger).not.toHaveBeenCalledWith(
            expect.objectContaining({
              data: accepted,
            })
          );
        }
        await sendWrongKey(offeredWrong);
        await sendWrongKey(accepted);
      });
    });
    it("chooses offered messageport when received handshake_offered before handshake_accepted", async () => {
      expect.assertions(3);
      const postTo = mockPostable();
      const receiveFrom = mockPostable();
      const accepted = TunnelMessage.makeAccepted("test1");
      const offered = TunnelMessage.makeOffered("test1");
      const postHandler =
        jest.fn<(event: MessageEvent<HandshakeTicket>) => void>();
      postTo.addEventListener("message", postHandler);
      const tunnelPromise = createTunnel({
        key: "test1",
        remote: { postTo, receiveFrom },
        targetOrigin: "*",
      });
      const toOffer = new MessageChannel();
      emitMessageEvent(receiveFrom, { data: offered, ports: [toOffer.port2] });
      emitMessageEvent(receiveFrom, { data: accepted }); // should do nothing!
      await expect(tunnelPromise).resolves.toBe(toOffer.port2);
      expect(postHandler.mock.calls.length).toBeGreaterThan(0);
      const acceptedCall: [MessageEvent<HandshakeTicket>] | undefined =
        postHandler.mock.calls.find(
          (call) =>
            TunnelMessage.is(call[0].data) &&
            unwrap(call[0].data as WrappedMessage<HandshakeAcceptedTicket>)
              .type === "handshake_accepted"
        );
      expect(acceptedCall && acceptedCall[0].data).toMatchObject(accepted);
      destroyTunnel(await tunnelPromise);
    });
    it("joins with a second tunnel in a loving embrace", async () => {
      const near = mockPostable();
      const far = mockPostable();
      const mySide = createTunnel({
        timeout: 4000,
        key: "test2",
        remote: { postTo: far, receiveFrom: near },
        targetOrigin: "*",
      });
      const yourSide = createTunnel({
        timeout: 4000,
        key: "test2",
        remote: { postTo: near, receiveFrom: far },
        targetOrigin: "*",
      });
      const mine = await mySide;
      const yours = await yourSide;
      expect(mine).toBeInstanceOf(MessagePort);
      expect(yours).toBeInstanceOf(MessagePort);
      const me = jest.fn();
      const you = jest.fn();
      mine.onmessage = me;
      yours.onmessage = you;
      mine.start();
      yours.start();
      mine.postMessage("haaaaay");
      yours.postMessage("whaaaaat");
      await wait(100);
      expect(me).toHaveBeenCalledWith(
        expect.objectContaining({
          data: "whaaaaat",
        })
      );
      expect(you).toHaveBeenCalledWith(
        expect.objectContaining({
          data: "haaaaay",
        })
      );
      destroyTunnel(mine);
      destroyTunnel(yours);
    });
  });
});
