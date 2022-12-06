import { fireEvent } from "@testing-library/dom";
import { wait } from "../promises/wait";
import { Tunnel } from "./tunnel";
import { makeAccepted, makeOffered } from "./tunnel-message";

const defaultTunnelConfig = {
  targetOrigin: "*",
  timeout: 4000,
};
type TunnelHarness = { tunnel: Tunnel; port: MessagePort };
const openPorts: MessagePort[] = [];
function tunnelHarness(
  port: MessagePort,
  config = defaultTunnelConfig
): TunnelHarness {
  const tunnel = new Tunnel(config);
  tunnel.connect(port);
  openPorts.push(port);
  return {
    tunnel,
    port,
  };
}

async function testEventExchange(local: Tunnel, remote: Tunnel) {
  const replyHandler = jest.fn();
  remote.on("outgoing", replyHandler);
  local.on("incoming", (data) => {
    local.emit("outgoing", {
      reply: `${data.greeting} It is I!`,
    });
  });
  remote.emit("incoming", { greeting: "Who goes there?" });
  await wait(10);
  expect(replyHandler).toHaveBeenCalledTimes(1);
  expect(replyHandler.mock.lastCall[0]).toMatchObject({
    reply: "Who goes there? It is I!",
  });
}

describe("an EventEmitter dispatching and receiving from a MessagePort", () => {
  let local: TunnelHarness;
  let remote: TunnelHarness;
  beforeEach(() => {
    const channel = new MessageChannel();
    local = tunnelHarness(channel.port1);
    remote = tunnelHarness(channel.port2);
  });
  afterEach(() => {
    while (openPorts.length > 0) {
      openPorts.pop().close();
    }
  });
  it("receives MessageEvents and emits local events to listeners", async () => {
    const test1Handler = jest.fn();
    local.tunnel.on("test1", test1Handler);
    remote.port.postMessage({
      type: "test1",
      payload: {
        test1Payload: true,
      },
    });
    await wait(100);
    expect(test1Handler).toHaveBeenCalled();
    expect(test1Handler.mock.lastCall[0]).toMatchObject({ test1Payload: true });
  });
  it("exchanges connect events", async () => {
    const localConnectHandler = jest.fn();
    const remoteConnectHandler = jest.fn();
    local.tunnel.on("connected", localConnectHandler);
    remote.tunnel.on("connected", remoteConnectHandler);
    await wait(100);
    expect(localConnectHandler).toHaveBeenCalledTimes(1);
    expect(remoteConnectHandler).toHaveBeenCalledTimes(1);
  });
  it("#emitRemote() sends remote events after connect", async () => {
    const messageListener = jest.fn();
    remote.port.addEventListener("message", messageListener);
    local.tunnel.emit("test2", { test2Payload: true });
    local.tunnel.emit("test3", { test3Payload: true });
    await wait(10);
    expect(messageListener).toHaveBeenCalledTimes(3);
    const connectMessageEvent = messageListener.mock.calls[0][0];
    expect(connectMessageEvent).toHaveProperty("data", {
      type: "connected",
    });
    const test2MessageEvent = messageListener.mock.calls[1][0];
    expect(test2MessageEvent).toHaveProperty("data", {
      type: "test2",
      payload: {
        test2Payload: true,
      },
    });
    const test3MessageEvent = messageListener.mock.calls[2][0];
    expect(test3MessageEvent).toHaveProperty("data", {
      type: "test3",
      payload: {
        test3Payload: true,
      },
    });
  });
  it("exchanges events between two emitters sharing ports", async () => {
    await testEventExchange(local.tunnel, remote.tunnel);
  });
  it("#connect(port) accepts a new messageport", async () => {
    const connectHandler = jest.fn();
    local.tunnel.on("connected", connectHandler);
    remote.tunnel.on("reconnect", connectHandler);
    const confirmHandler = jest.fn();
    local.tunnel.on("confirm", confirmHandler);
    const dispelHandler = jest.fn();
    remote.tunnel.on("dispel", dispelHandler);
    local.tunnel.emit("dispel", { dispelled: 1 });
    remote.tunnel.emit("confirm", { confirmed: 1 });
    await wait(10);
    expect(confirmHandler).toHaveBeenCalledTimes(1);
    expect(dispelHandler).toHaveBeenCalledTimes(1);

    const replacementChannel = new MessageChannel();
    local.tunnel.connect(replacementChannel.port2);

    // this event should wait until remote connects port1;
    local.tunnel.emit("dispel", { dispelled: 2 });

    // this event fires on the dead port, since remote.tunnel still has it
    remote.tunnel.emit("confirm", { confirmed: 2 });
    await wait(10);
    // so neither is called
    expect(confirmHandler).toHaveBeenCalledTimes(1);
    expect(dispelHandler).toHaveBeenCalledTimes(1);

    remote.tunnel.connect(replacementChannel.port1);
    await wait(10);
    // dispel handler fired when port1 was opened by #reconnect
    expect(dispelHandler).toHaveBeenCalledTimes(2);

    // this dispel event should work now
    remote.tunnel.emit("confirm", { confirmed: 3 });
    await wait(10);

    expect(confirmHandler).toHaveBeenCalledTimes(2);
    expect(confirmHandler.mock.calls[1][0]).toMatchObject({ confirmed: 3 });

    expect(connectHandler).toHaveBeenCalledTimes(2);
    replacementChannel.port1.close();
    replacementChannel.port2.close();
  });
});
describe("static Tunnel.toIframe(iframe, options)", () => {
  let localTunnel: Tunnel;
  let remoteTunnel: Tunnel;
  afterEach(() => {
    localTunnel && localTunnel.destroy();
    remoteTunnel && remoteTunnel.destroy();
  });
  /**
   * skipped in unit tests because JSDOM's iframe and postMessage don't
   * implement proper MessageEvents as of 2022/11/30. See
   * https://github.com/jsdom/jsdom/blob/22f7c3c51829a6f14387f7a99e5cdf087f72e685/lib/jsdom/living/post-message.js#L31-L37
   */
  describe.skip("creates a Tunnel connected to an iframe", () => {
    it.only("listens for handshakes from the frame window", async () => {
      let remoteTunnel: Tunnel;
      const connectMessageHandler = jest.fn();
      const acceptListener = jest.fn();
      const loadedFrame = document.createElement("iframe");
      loadedFrame.src = "https://example.com:4001";
      document.body.appendChild(loadedFrame);
      loadedFrame.contentWindow.addEventListener("message", acceptListener);
      const localTunnel = Tunnel.toIframe(loadedFrame, {
        targetOrigin: "https://example.com:4001",
        timeout: 9999,
      });
      localTunnel.on("connected", connectMessageHandler);
      await wait(100);
      fireEvent(
        window,
        new MessageEvent("message", {
          data: makeOffered("iframe-test-1"),
          origin: loadedFrame.src,
          source: loadedFrame.contentWindow,
        })
      );
      await wait(100);
      expect(acceptListener).toHaveBeenCalled();
      const acceptEvent = acceptListener.mock.lastCall[0];
      expect(acceptEvent).toHaveProperty("data", makeAccepted("iframe-test-1"));
      expect(acceptEvent.ports).toHaveLength(1);
      remoteTunnel = new Tunnel(defaultTunnelConfig);
      remoteTunnel.connect(acceptEvent.ports[0]);
      await wait(100);
      expect(connectMessageHandler).toHaveBeenCalledTimes(1);
      await testEventExchange(localTunnel, remoteTunnel);
    });
  });
});
