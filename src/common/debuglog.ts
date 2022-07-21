type Side = 'center | left | right';
type Size = {
  padX: number;
  padY: number;
  rounded: number;
  fontSize: number;
}
type HexColor = `#${string}`;
type Color = {
  bg: HexColor;
  hilight: HexColor;
  shadow: HexColor;
}
type Theme = Color & Size;

const Sizes: Record<string, Size> = {
  medium: {
    padX: 7,
    padY: 3,
    rounded: 15,
    fontSize: 100
  },
  small: {
    padX: 5,
    padY: 2,
    rounded: 8,
    fontSize: 85
  }
}

const Colors: Record<string, Color> = {
  yellow: {
    bg: "#EBD932",
    hilight: "#F7E434",
    shadow: "#D1C12C",
  },
  green: {
    bg: "#96EB5E",
    hilight: "#9EF763",
    shadow: "#85D154",
  },
  gray: {
    bg: "#eeeeee",
    hilight: "#f6f6f6",
    shadow: "#cecece",
  },
};

const reset = "";
const toSide = (side: Side) =>
const toSize = (size: Size) => `display: inline-block; padding: ${size.padX}px ${size.padY}px; border: 1px solid; border-radius: ${size.rounded}px;`
const theme = (colors: keyof typeof Colors, size: keyof typeof Size) => toStyle(Color)

const overrideMethods = ["log", "error", "warn", "info", "debug"] as const;

export function customConsole(
  colorName: keyof typeof Colors,
  type: "Host" | "Guest",
  name: string,
  base: Console = console
) {
  const { bg, hilight, shadow } = Colors[colorName];
  const prefix = `%cUIX ${type}%c ${name}%c`;
  const prefixBaseStyle = `display: inline-block; background: ${bg}; padding: ${Styles.padTop} ${Styles.padSide}; border: 1px solid; border-color: ${hilight} ${shadow} ${shadow} ${hilight};`;
  const prefixStyles = {
    left: `${prefixBaseStyle} padding-right: 0px; border-right-width: 0; border-radius: 15px 0 0 15px`,
    right: `${prefixBaseStyle} font-weight: bold; padding-left: 0px; border-left-width: 0; border-radius: 0 15px 15px 0`,
  };

  const customConsole = Object.create(
    base,
    overrideMethods.reduce((out, level) => {
      function logMethod(...args: unknown[]) {
        let finalArgs = args;
        const [firstArg, ...restArgs] = args;
        if (firstArg instanceof CustomEvent) {
          logMethod.event(firstArg, ...restArgs);
        } else {
          let logTag = prefix;
          if (typeof firstArg === "string") {
            logTag += ` ${firstArg}`;
            finalArgs = restArgs;
          }
          base[level](
            logTag,
            prefixStyles.left,
            prefixStyles.right,
            resetStyle,
            ...finalArgs
          );
        }
      }

      logMethod.event = (event: CustomEvent, ...args: unknown[]) => {
        let eventTag = `${prefix} ⚡️️ %c${event.type}%c`;
        let finalArgs = args;
        const [firstArg, ...restArgs] = args;
        if (typeof firstArg === "string") {
          eventTag += ` ${firstArg}`;
          finalArgs = restArgs;
        }
        base[level](
          eventTag,
          prefixStyles.left,
          prefixStyles.right,
          "font-size: 1rem;font-weight:bold;", // for lightning bolt
          "font-style: italic;color:#336;", // for event name)
          resetStyle,
          ...finalArgs,
          event.detail
        );
      };

      out[level] = {
        value: logMethod,
      };
      return out;
    }, {} as PropertyDescriptorMap)
  ) as Console;
  return customConsole;
}
