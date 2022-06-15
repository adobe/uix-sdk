import { Connection } from "penpal";

export interface GuestApi {
  attach(connection: Connection): void;
  detach(): void;
}
