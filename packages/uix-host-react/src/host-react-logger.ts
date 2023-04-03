import { Theme, quietConsole } from "@adobe/uix-core";
import { _customConsole } from "@adobe/uix-core";
export const reactLoggerTheme: Theme = {
  padX: 5,
  padY: 3,
  rounded: 4,
  fontSize: 100,
  emphasis: "font-weight: bold;",
  text: "#212121",
  bg: "#FFFFFF",
  hilight: "#0080A1",
  shadow: "#0080A1",
};

export function createReactLogger(debug: boolean, name: string) {
  return debug
    ? quietConsole
    : _customConsole(reactLoggerTheme, `HostReact ⚛`, name);
}
