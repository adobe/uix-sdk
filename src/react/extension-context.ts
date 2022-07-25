import { createContext } from "react";
import { Host } from "../host/index.js";

export const ExtensionContext = createContext<Host>({} as unknown as Host);
