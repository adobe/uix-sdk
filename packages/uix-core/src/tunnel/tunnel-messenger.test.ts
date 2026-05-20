import { NS_ROOT, VERSION } from "../constants";
import { TunnelMessenger } from "./tunnel-messenger";

const fakeConsole = {
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as jest.Mocked<Console>;

describe("tunnel negotiation message factory", () => {
  let messenger: TunnelMessenger;
  beforeEach(() => {
    messenger = new TunnelMessenger({
      myOrigin: "https://me",
      targetOrigin: "https://you",
      logger: fakeConsole,
    });
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  it("makeAccepted", () => {
    expect(messenger.makeAccepted("test1")).toMatchObject({
      [NS_ROOT]: {
        accepts: "test1",
        version: VERSION,
      },
    });
  });
  it("makeOffered", () => {
    expect(messenger.makeOffered("test1")).toMatchObject({
      [NS_ROOT]: {
        offers: "test1",
        version: VERSION,
      },
    });
  });
  it("isHandshakeOffer", () => {
    expect(
      messenger.isHandshakeOffer({
        [NS_ROOT]: {
          offers: "test2",
          version: VERSION,
        },
      })
    ).toBeTruthy();
    expect(
      messenger.isHandshakeOffer({
        [NS_ROOT]: {
          accepts: "test2",
          version: VERSION,
        },
      })
    ).toBeFalsy();
    expect(messenger.isHandshakeOffer({})).toBeFalsy();
  });
  it("isHandshakeAccepting(message, id) matches on id", () => {
    expect(
      messenger.isHandshakeAccepting(
        {
          [NS_ROOT]: {
            accepts: "test3",
            version: VERSION,
          },
        },
        "test3"
      )
    ).toBeTruthy();
    expect(
      messenger.isHandshakeAccepting(
        {
          accepts: "test3",
          version: VERSION,
        },
        "mismatch"
      )
    ).toBeFalsy();
    expect(messenger.isHandshakeAccepting({}, "test3")).toBeFalsy();
  });
  describe("isHandshake rejects malformed messages", () => {
    it("non-plain-objects", () => {
      expect(messenger.isHandshake([])).toBeFalsy();
      expect(messenger.isHandshake("")).toBeFalsy();
      expect(messenger.isHandshake(true)).toBeFalsy();
      expect(fakeConsole.error).toHaveBeenCalledTimes(3);
      expect(fakeConsole.error.mock.calls.map(([msg]) => msg))
        .toMatchInlineSnapshot(`
        [
          "Malformed tunnel message sent from SDK at https://you to https://me:
        []
        Message must be an object with "_$pg" property, which must be an object with a "version" string and an either an "accepts" or "offers" property containing an ID string.",
          "Malformed tunnel message sent from SDK at https://you to https://me:
        ""
        Message must be an object with "_$pg" property, which must be an object with a "version" string and an either an "accepts" or "offers" property containing an ID string.",
          "Malformed tunnel message sent from SDK at https://you to https://me:
        true
        Message must be an object with "_$pg" property, which must be an object with a "version" string and an either an "accepts" or "offers" property containing an ID string.",
        ]
      `);
    });
    it("without a sub-object at the expected root property", () => {
      expect(
        messenger.isHandshakeOffer({
          someOtherRoot: false,
        })
      ).toBeFalsy();
      expect(
        messenger.isHandshake({
          [NS_ROOT]: 5,
        })
      ).toBeFalsy();
      expect(fakeConsole.error.mock.calls.map(([msg]) => msg))
        .toMatchInlineSnapshot(`
        [
          "Malformed tunnel message sent from SDK at https://you to https://me:
        {
          "someOtherRoot": false
        }
        Message must be an object with "_$pg" property, which must be an object with a "version" string and an either an "accepts" or "offers" property containing an ID string.",
          "Malformed tunnel message sent from SDK at https://you to https://me:
        {
          "_$pg": 5
        }
        Message must be an object with "_$pg" property, which must be an object with a "version" string and an either an "accepts" or "offers" property containing an ID string.",
        ]
      `);
    });
    it("without accept or offers properties", () => {
      expect(
        messenger.isHandshake({
          [NS_ROOT]: {
            version: VERSION,
          },
        })
      ).toBeFalsy();
    });
    it("with no version string", () => {
      expect(
        messenger.isHandshake({
          [NS_ROOT]: {
            offers: "test4",
          },
        })
      ).toBeFalsy();
    });
  });
  describe("version mismatch handling", () => {
    const withVersion = (version: string) => ({
      [NS_ROOT]: {
        offers: "test5",
        version,
      },
    });
    it("warns in console, once for each version", () => {
      expect(messenger.isHandshake(withVersion("abc.def.ccc"))).toBeTruthy();
      expect(messenger.isHandshake(withVersion("999.999.999"))).toBeTruthy();
      expect(messenger.isHandshake(withVersion("abc.def.ccc"))).toBeTruthy();
      expect(messenger.isHandshake(withVersion("bad-version"))).toBeTruthy();
      expect(fakeConsole.warn).toHaveBeenCalledTimes(3);
      expect(fakeConsole.warn.mock.calls.map(([msg]) => msg))
        .toMatchInlineSnapshot(`
        [
          "SDK version mismatch. https://me is using v0.0.999, but received message from https://you using SDK vabc.def.ccc. Extensions may be broken or unresponsive.",
          "SDK version mismatch. https://me is using v0.0.999, but received message from https://you using SDK v999.999.999. Extensions may be broken or unresponsive.",
          "SDK version mismatch. https://me is using v0.0.999, but received message from https://you using SDK vbad-version. Extensions may be broken or unresponsive.",
        ]
      `);
    });
    it("does not warn for only patch version changes", () => {
      const [major, minor, patch] = VERSION.split(".");
      expect(
        messenger.isHandshake(
          withVersion(`${major}.${minor}.${Number(patch) + 1}`)
        )
      ).toBeTruthy();
      expect(fakeConsole.warn).not.toHaveBeenCalled();
      expect(
        messenger.isHandshake(
          withVersion(`${major}.${Number(minor) + 1}.${patch}`)
        )
      ).toBeTruthy();
      expect(fakeConsole.warn).toHaveBeenCalled();
    });
    it("resetWarnings() resets seen version warnings so they'll log again", () => {
      messenger.resetWarnings();
      expect(
        messenger.isHandshake(withVersion("same-bad-version"))
      ).toBeTruthy();
      expect(
        messenger.isHandshake(withVersion("same-bad-version"))
      ).toBeTruthy();
      expect(fakeConsole.warn).toHaveBeenCalledTimes(1);
      messenger.resetWarnings();
      expect(
        messenger.isHandshake(withVersion("same-bad-version"))
      ).toBeTruthy();
      expect(fakeConsole.warn).toHaveBeenCalledTimes(2);
    });
  });
});
