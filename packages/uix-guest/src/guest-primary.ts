import type { LocalApis } from "@adobe/uix-core";
import { BaseGuest } from "./guest-base";

export class PrimaryGuest<
  Outgoing extends object,
  Incoming extends object
> extends BaseGuest<Outgoing, Incoming> {
  private localMethods: LocalApis<Outgoing>;
  protected getLocalMethods() {
    return {
      ...super.getLocalMethods(),
      apis: this.localMethods,
    };
  }
  async register(apis: LocalApis<Outgoing>) {
    this.localMethods = apis;
    return this.connect();
  }
}
