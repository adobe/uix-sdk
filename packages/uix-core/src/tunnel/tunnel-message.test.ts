import { NS_ROOT, VERSION } from "../constants";
import * as TM from "./tunnel-message";

jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});
const mockConsole = console as jest.Mocked<Console>;
const fakeConsole = {
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as jest.Mocked<Console>;

describe("tunnel negotiation message factory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  it("makeAccepted", () => {
    expect(TM.makeAccepted("test1")).toMatchObject({
      [NS_ROOT]: {
        accepts: "test1",
        version: VERSION,
      },
    });
  });
  it("makeOffered", () => {
    expect(TM.makeOffered("test1")).toMatchObject({
      [NS_ROOT]: {
        offers: "test1",
        version: VERSION,
      },
    });
  });
  it("isHandshakeOffer", () => {
    expect(
      TM.isHandshakeOffer({
        [NS_ROOT]: {
          offers: "test2",
          version: VERSION,
        },
      })
    ).toBeTruthy();
    expect(
      TM.isHandshakeOffer({
        [NS_ROOT]: {
          accepts: "test2",
          version: VERSION,
        },
      })
    ).toBeFalsy();
    expect(TM.isHandshakeOffer({})).toBeFalsy();
  });
  it("isHandshakeAccepting(message, id) matches on id", () => {
    expect(
      TM.isHandshakeAccepting(
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
      TM.isHandshakeAccepting(
        {
          accepts: "test3",
          version: VERSION,
        },
        "mismatch"
      )
    ).toBeFalsy();
    expect(TM.isHandshakeAccepting({}, "test3")).toBeFalsy();
  });
  describe("isHandshake rejects malformed messages", () => {
    it("non-plain-objects", () => {
      expect(TM.isHandshake([])).toBeFalsy();
      expect(TM.isHandshake("")).toBeFalsy();
      expect(TM.isHandshake(true)).toBeFalsy();
      expect(mockConsole.error).toHaveBeenCalledTimes(3);
      expect(mockConsole.error.mock.calls.map(([msg]) => msg))
        .toMatchInlineSnapshot(`
        [
          "malformed tunnel message, must be an object with a "_$pg" property",
          "malformed tunnel message, must be an object with a "_$pg" property",
          "malformed tunnel message, must be an object with a "_$pg" property",
        ]
      `);
    });
    it("without a sub-object at the expected root property", () => {
      expect(
        TM.isHandshakeOffer({
          someOtherRoot: false,
        })
      ).toBeFalsy();
      expect(
        TM.isHandshake({
          [NS_ROOT]: 5,
        })
      ).toBeFalsy();
      expect(mockConsole.error.mock.calls.map(([msg]) => msg))
        .toMatchInlineSnapshot(`
        [
          "malformed tunnel message, must be an object with a "_$pg" property",
          "malformed tunnel message, message["_$pg"] must be an object with a "version" string and an either an "accepts" or "offers" property containing an ID string.",
        ]
      `);
    });
    it("without accept or offers properties", () => {
      expect(
        TM.isHandshake({
          [NS_ROOT]: {
            version: VERSION,
          },
        })
      ).toBeFalsy();
    });
    it("with no version string", () => {
      expect(
        TM.isHandshake({
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
      expect(TM.isHandshake(withVersion("bad-version"))).toBeTruthy();
      expect(TM.isHandshake(withVersion("worse-version"))).toBeTruthy();
      expect(TM.isHandshake(withVersion("bad-version"))).toBeTruthy();
      expect(mockConsole.warn).toHaveBeenCalledTimes(2);
      expect(mockConsole.warn.mock.calls.map(([msg]) => msg))
        .toMatchInlineSnapshot(`
        [
          "Version mismatch: current Tunnel is 0.0.1-test and remote Tunnel is bad-version. May cause problems.",
          "Version mismatch: current Tunnel is 0.0.1-test and remote Tunnel is worse-version. May cause problems.",
        ]
      `);
    });
    it("resetWarnings() resets seen version warnings so they'll log again", () => {
      TM.resetWarnings();
      expect(TM.isHandshake(withVersion("same-bad-version"))).toBeTruthy();
      expect(TM.isHandshake(withVersion("same-bad-version"))).toBeTruthy();
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      TM.resetWarnings();
      expect(TM.isHandshake(withVersion("same-bad-version"))).toBeTruthy();
      expect(mockConsole.warn).toHaveBeenCalledTimes(2);
    });
  });
});
