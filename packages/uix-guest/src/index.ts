import type { GuestConfig } from "./guest-base.js";
import { SecondaryGuest } from "./guest-secondary.js";
import { PrimaryGuest } from "./guest-primary.js";
import { LocalApis } from "@adobe/uix-core";

type GuestConfigWithMethods<Outgoing> = GuestConfig<Outgoing> & {
  methods: LocalApis<Outgoing>;
};

export function createGuest<Outgoing extends object>(
  config: GuestConfig<Outgoing>
) {
  const guest = new PrimaryGuest(config);
  return guest;
}

export async function attach(config: GuestConfig<never>) {
  const guest = new SecondaryGuest(config);
  await guest.connect();
  return guest;
}

export async function register<Outgoing>(
  config: GuestConfigWithMethods<Outgoing>
) {
  const guest = createGuest(config);
  console.log(config);
  await guest.register(config.methods);
  return guest;
}

export { SecondaryGuest, PrimaryGuest };
