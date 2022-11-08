import { jest } from "@jest/globals";
import { MessageDuplex } from "../postables";

export default class MockMessageDuplex implements MessageDuplex {
  mockPostMessage: any;
  set onmessage(listener: (event: MessageEvent) => void) {
    this.addEventListener("message", listener as EventListener);
  }
  start() {}
  postMessage(
    data: any,
    options?: WindowPostMessageOptions | string,
    ports?: WindowPostMessageOptions | Transferable[]
  ) {
    let origin = "*";
    if (typeof options === "string") {
      origin = options;
    } else if (typeof options === "object") {
      origin = options.targetOrigin;
    }
    this.events.dispatchEvent(
      new MessageEvent("message", {
        data,
        origin,
        ports: ports as MessagePort[],
      })
    );
  }
  listeners: [string, EventListener][];
  events = new EventTarget();
  constructor() {
    this.listeners = [];
    this.postMessage = jest.fn(this.postMessage.bind(this));
    this.addEventListener = jest.fn(this.addEventListener.bind(this));
    this.removeEventListener = jest.fn(this.removeEventListener.bind(this));
  }
  addEventListener(event: string, handler: (...args: any[]) => void) {
    this.listeners.push([event, handler]);
    return this.events.addEventListener(event, handler);
  }
  removeEventListener(event: string, handler: (...args: any[]) => void) {
    return this.events.removeEventListener(event, handler);
  }
  removeAllEventListeners() {
    let listener;
    while ((listener = this.listeners.pop())) {
      this.events.removeEventListener(listener[0], listener[1]);
    }
  }
  mockClear() {
    const self = jest.mocked(this);
    self.postMessage.mockClear();
    self.addEventListener.mockClear();
    self.removeEventListener.mockClear();
  }
  mockReset() {
    this.removeAllEventListeners();
    const self = jest.mocked(this);
    self.postMessage.mockReset();
    self.addEventListener.mockReset();
    self.removeEventListener.mockReset();
  }
}
