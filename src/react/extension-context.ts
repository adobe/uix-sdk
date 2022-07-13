import { createContext } from "react";
import { Host } from "../host";

export const ExtensionContext = createContext<Host>({} as unknown as Host);
