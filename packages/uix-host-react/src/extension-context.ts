/**
 * @hidden
 */
import { createContext } from "react";
import { Host } from "@adobe/uix-host";

export const ExtensionContext = createContext<Host>({} as unknown as Host);
