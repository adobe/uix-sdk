import { EventEmitter } from "eventemitter3";
import { FakeFinalizationRegistry } from "./__mocks__/mock-finalization-registry";
import { NS_ROOT } from "./constants";
import { ObjectSimulator } from "./object-simulator";
import type { DefMessage } from "./object-walker";
import { wait } from "./promises/wait";

// eslint-disable-next-line max-lines-per-function
describe("function simulator exchanges functions and tickets", () => {
  let objectSimulator: ObjectSimulator;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const emitter = new EventEmitter();

    objectSimulator = ObjectSimulator.create(emitter, FakeFinalizationRegistry);
  });
  it("turns an object with functions into an object with tickets", async () => {
    const invokeIt = (blorp: CallableFunction) => blorp();
    const gnorf = {
      slorf: {
        blorf: (x: number) => x + 1,
      },
    };
    const toBeTicketed = {
      gnorf,
      harbl: 3,
      list: [
        {
          doa: invokeIt,
          what: 8,
        },
      ],
    };
    const ticketed = objectSimulator.simulate(toBeTicketed);

    expect(ticketed).toMatchInlineSnapshot(`
      {
        "gnorf": {
          "slorf": {
            "blorf": {
              "_$pg": {
                "fnId": "blorf_1",
              },
            },
          },
        },
        "harbl": 3,
        "list": [
          {
            "doa": {
              "_$pg": {
                "fnId": "invokeIt_2",
              },
            },
            "what": 8,
          },
        ],
      }
    `);
    const unticketed = objectSimulator.materialize(ticketed);

    expect(unticketed).toMatchInlineSnapshot(`
      {
        "gnorf": {
          "slorf": {
            "blorf": [Function],
          },
        },
        "harbl": 3,
        "list": [
          {
            "doa": [Function],
            "what": 8,
          },
        ],
      }
    `);
    const remoteInvokeIt = unticketed.list[0].doa;

    await expect(remoteInvokeIt(() => "oh noes")).resolves.toBe("oh noes");
    await expect(unticketed.gnorf.slorf.blorf(9)).resolves.toBe(10);
  });
  it("dies when an object has an unrecognizable value", () => {
    expect(
      () =>
        objectSimulator.simulate({
          lol: Symbol("lol"),
        }),
      // eslint-disable-next-line sonarjs/deprecation
    ).toThrowError("Bad value");
  });
  it("passes through tickets when unexpected", () => {
    const hasTicket = {
      [NS_ROOT]: {
        some: "ticket",
      },
    };
    const doTicket = () => objectSimulator.simulate({ hasTicket });

    expect(doTicket)
      // eslint-disable-next-line sonarjs/deprecation
      .not.toThrowError();
    expect(doTicket()).toMatchObject({ hasTicket });
  });
  it("strips unserializable props, but throws on unserializable values", () => {
    expect(
      () =>
        objectSimulator.simulate({
          lol: Symbol("lol"),
        }),
      // eslint-disable-next-line sonarjs/deprecation
    ).toThrowError("Bad value");
    expect(
      () =>
        objectSimulator.simulate({
          [Symbol("lol")]: "lol",
        }),
      // eslint-disable-next-line sonarjs/deprecation
    ).not.toThrowError();
  });
  it("can handle root functions", async () => {
    let called = false;
    const ticketedLoneFn = objectSimulator.simulate(() => {
      called = true;
    });

    expect(ticketedLoneFn).toMatchInlineSnapshot(`
      {
        "_$pg": {
          "fnId": "<anonymous>_1",
        },
      }
    `);
    const loneFn = objectSimulator.materialize(ticketedLoneFn);

    await expect(loneFn())
      .resolves // eslint-disable-next-line sonarjs/deprecation
      .not.toThrowError();
    expect(called).toBe(true);
  });
  it("Unwraps prototypes and exchange all functions to tickets", async () => {
    class ClassA {
      pa: number;
      constructor() {
        this.pa = 4;
      }
      getPa() {
        return this.pa;
      }
    }
    class ClassB {
      pb: number;
      ca: ClassA;
      constructor(aa: number) {
        this.pb = aa;
        this.ca = new ClassA();
      }
      getNumber() {
        return this.pb;
      }
      giftOne() {
        this.pb--;
      }
    }
    class ClassD extends ClassB {
      giftOne() {
        this.pb++;
      }
      robOne() {
        this.pb--;
      }
    }

    const toBeTicketed = new ClassD(5);
    const ticketed = objectSimulator.simulate(toBeTicketed);

    expect(ticketed).toMatchInlineSnapshot(`
      {
        "ca": {
          "getPa": {
            "_$pg": {
              "fnId": "getPa_1",
            },
          },
          "pa": 4,
        },
        "getNumber": {
          "_$pg": {
            "fnId": "getNumber_4",
          },
        },
        "giftOne": {
          "_$pg": {
            "fnId": "giftOne_2",
          },
        },
        "pb": 5,
        "robOne": {
          "_$pg": {
            "fnId": "robOne_3",
          },
        },
      }
    `);
    const unticketed = objectSimulator.materialize(ticketed);

    expect(unticketed).toMatchInlineSnapshot(`
      {
        "ca": {
          "getPa": [Function],
          "pa": 4,
        },
        "getNumber": [Function],
        "giftOne": [Function],
        "pb": 5,
        "robOne": [Function],
      }
    `);

    await expect(unticketed.getNumber()).resolves.toBe(5);
    await unticketed.giftOne();
    await expect(unticketed.getNumber()).resolves.toBe(6);
    await unticketed.robOne();
    await expect(unticketed.getNumber()).resolves.toBe(5);
    await expect(unticketed.ca.getPa()).resolves.toBe(4);
  });

  it("Ignores circular dependencies in properties, but relove them through the methods", async () => {
    class ClassA {
      pa: ClassA;
      constructor() {
        this.pa = this;
      }
      getPa() {
        return this.pa;
      }
    }

    const toBeTicketed = new ClassA();
    const ticketed = objectSimulator.simulate(toBeTicketed);

    expect(ticketed).toMatchInlineSnapshot(`
      {
        "getPa": {
          "_$pg": {
            "fnId": "getPa_1",
          },
        },
        "pa": "[[Circular]]",
      }
    `);
    const unticketed = objectSimulator.materialize(ticketed);

    expect(unticketed).toMatchInlineSnapshot(`
      {
        "getPa": [Function],
        "pa": "[[Circular]]",
      }
    `);
    expect(
      Reflect.has(
        await (await (await unticketed.getPa()).getPa()).getPa(),
        "getPa",
      ),
    ).toBeTruthy();
  });
  it("Supports classes wrapped in other classes", async () => {
    class ClassA {
      pa: number;
      constructor() {
        this.pa = 5;
      }
      getPa() {
        return this.pa;
      }
    }
    class ClassB {
      pb: ClassA;
      constructor() {
        this.pb = new ClassA();
      }
      getCaValue() {
        return this.pb.getPa();
      }
    }
    const toBeTicketed = new ClassB();
    const ticketed = objectSimulator.simulate(toBeTicketed);

    expect(ticketed).toMatchInlineSnapshot(`
      {
        "getCaValue": {
          "_$pg": {
            "fnId": "getCaValue_2",
          },
        },
        "pb": {
          "getPa": {
            "_$pg": {
              "fnId": "getPa_1",
            },
          },
          "pa": 5,
        },
      }
    `);
    const unticketed = objectSimulator.materialize(ticketed);

    expect(unticketed).toMatchInlineSnapshot(`
      {
        "getCaValue": [Function],
        "pb": {
          "getPa": [Function],
          "pa": 5,
        },
      }
    `);
    await expect(unticketed.pb.getPa()).resolves.toBe(5);
  });

  it("Supports objects with null prototypes", async () => {
    const toBeTicketed = Object.create(null);

    toBeTicketed["key1"] = "val1";
    toBeTicketed["key2"] = "val2";
    const ticketed = objectSimulator.simulate(toBeTicketed);

    expect(ticketed).toMatchInlineSnapshot(`
      {
        "key1": "val1",
        "key2": "val2",
      }
    `);
    const unticketed = objectSimulator.materialize(ticketed);

    expect(unticketed).toMatchInlineSnapshot(`
      {
        "key1": "val1",
        "key2": "val2",
      }
    `);
  });

  it("notifies remote when FinalizationRegistry calls cleanup handler", async () => {
    const willBeGCed = objectSimulator.simulate(() => {}) as DefMessage;

    objectSimulator.materialize(willBeGCed);
    const { subject } = objectSimulator;
    const fakeTicket = willBeGCed[NS_ROOT];
    const gcHandler = jest.fn();

    subject.onOutOfScope(fakeTicket, gcHandler);
    const lastCleanupHandler = FakeFinalizationRegistry.mock.cleanupHandler;

    lastCleanupHandler(fakeTicket.fnId);
    await wait(100);
    expect(gcHandler).toHaveBeenCalled();
  });
});
