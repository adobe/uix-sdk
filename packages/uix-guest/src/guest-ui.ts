import { GuestMethods } from "@adobe/uix-core";
import { BaseGuest } from "./guest-base";

export class UIGuest<Incoming extends object> extends BaseGuest<
  Incoming,
  GuestMethods
> {}
