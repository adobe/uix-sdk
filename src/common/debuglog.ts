const Colors = {
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
};

const styles = {
  fontSize: "85%",
  padTop: "3px",
  padSide: "7px",
};

const overrideMethods = ["log", "error", "warn", "info", "debug"] as const;

export function customConsole(
  colorName: keyof typeof Colors,
  type: "Host" | "Guest",
  name: string,
  base: Console = console
) {
  const { bg, hilight, shadow } = Colors[colorName];
  const prefix = `%cUIX ${type}%c ${name}%c`;
  const prefixBaseStyle = `display: inline-block; background: ${bg}; padding: ${styles.padTop} ${styles.padSide}; border: 1px solid; border-color: ${hilight} ${shadow} ${shadow} ${hilight};`;
  const prefixStyles = [
    `${prefixBaseStyle} padding-right: 0px; border-right-width: 0; border-radius: 15px 0 0 15px`,
    `${prefixBaseStyle} font-weight: bold; padding-left: 0px; border-left-width: 0; border-radius: 0 15px 15px 0`,
    "",
  ];
  const customConsole = Object.create(
    base,
    overrideMethods.reduce((out, level) => {
      out[level] = {
        value(firstArg: string | unknown, ...args: unknown[]) {
          const message =
            typeof firstArg === "string" ? `${prefix} ${firstArg}` : prefix;
          const loggerArgs = [message, ...prefixStyles, ...args];
          base[level](...loggerArgs);
        },
      };
      return out;
    }, {} as PropertyDescriptorMap)
  ) as Console;
  return customConsole;
}
