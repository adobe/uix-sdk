import type { GuestApis } from "@adobe/uix-core";
import type { SharedContext } from "./guest";
import { Guest } from "./guest";

/**
 * A Guest to be used in the "main" or primary frame of an extension, the frame
 * the Host loads first.
 *
 * @remarks This is the Guest object returned from {@link register}. It can
 * expose internal methods to the Host via the {@link GuestServer.register}
 * method.
 *
 *
 * @public
 */
export class GuestServer<Outgoing extends GuestApis> extends Guest<Outgoing> {
  private localMethods: Outgoing;
  protected getLocalMethods() {
    return {
      ...super.getLocalMethods(),
      apis: this.localMethods,
    };
  }
  /**
   * {@inheritDoc BaseGuest.sharedContext}
   */
  sharedContext: SharedContext;
  /**
   * {@inheritdoc BaseGuest.host}
   */
  host: Guest<Outgoing>["host"];
  /**
   * Pass an interface of methods which Host may call as callbacks.
   *
   * @remarks It is preferable to use {@link register} to obtain a guest object
   * and register local methods in one step. The returned guest object will be
   * pre-registered and connected.
   * @public
   */
  async register(implementedMethods: Outgoing) {
    this.localMethods = implementedMethods;
    return this._connect();
  }
}
