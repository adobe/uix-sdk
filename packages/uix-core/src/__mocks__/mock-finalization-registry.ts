/* global jest */
type CleanupHandler = (heldValue: any) => void;
const register = jest.fn();
const unregister = jest.fn();

export class FakeFinalizationRegistry {
  // eslint-disable-next-line sonarjs/public-static-readonly -- mock assigned in constructor
  static mock: FakeFinalizationRegistry;
  register = register;
  unregister = unregister;
  cleanupHandler: jest.MockedFunction<CleanupHandler>;
  constructor(handler: CleanupHandler) {
    this.cleanupHandler = jest.fn(handler);
    FakeFinalizationRegistry.mock = this;
  }
}
