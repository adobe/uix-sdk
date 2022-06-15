import { createContext } from "react";
import { Host } from "../host";

export const ExtensionContext = createContext<Host | undefined>(void 0);
