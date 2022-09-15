/**
 * Fancy looking console decorator.
 * TODO: Outsource to @adobe/browser-console-chips
 * @hidden
 */

const isDarkMode = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

type Layout = {
  padX: number;
  padY: number;
  rounded: number;
  fontSize: number;
  emphasis: Style;
};
type HexColor = `#${string}` | "transparent";
type Color = {
  text: HexColor;
  bg: HexColor;
  hilight: HexColor;
  shadow: HexColor;
};
type ThemeSpec = Color & Layout;

const Layouts: Record<string, Layout> = {
  medium: {
    padX: 5,
    padY: 3,
    rounded: 4,
    fontSize: 100,
    emphasis: "font-weight: bold;",
  },
  small: {
    padX: 3,
    padY: 1,
    rounded: 2,
    fontSize: 95,
    emphasis: "font-style: italic;",
  },
};

const Colors: Record<string, Color> = {
  yellow: {
    text: "#333333",
    bg: "#EBD932",
    hilight: "#F7E434",
    shadow: "#D1C12C",
  },
  green: {
    text: "#333333",
    bg: "#96EB5E",
    hilight: "#9EF763",
    shadow: "#85D154",
  },
  blue: {
    text: "#333333",
    bg: "#8DD0EB",
    hilight: "#88F0F7",
    shadow: "#74AED4",
  },
  gray: isDarkMode()
    ? {
        text: "#eeeeee",
        bg: "transparent",
        hilight: "#cecece",
        shadow: "#cecece",
      }
    : {
        text: "#333333",
        bg: "#eeeeee",
        hilight: "#f6f6f6",
        shadow: "#cecece",
      },
};

type ThemeTag = `${keyof typeof Colors} ${keyof typeof Layouts}`;

export type Theme = ThemeSpec | ThemeTag;

type LogDecorator = (...args: unknown[]) => unknown[];

type Style = `${string};`;

function memoizeUnary<T, U>(fn: (arg: T) => U): typeof fn {
  const cache: Map<T, U> = new Map();
  return (arg) => {
    if (!cache.has(arg)) {
      const result = fn(arg);
      cache.set(arg, result);
      if (cache.size > 100) {
        cache.delete(cache.keys().next().value as T);
      }
      return result;
    }
    return cache.get(arg);
  };
}

const toTheme = memoizeUnary((theme: Theme): ThemeSpec => {
  if (typeof theme === "string") {
    const [color, size] = theme.split(" ");
    return {
      ...Colors[color],
      ...Layouts[size],
    };
  }
  return theme;
});

const block: Style = `display: inline-block; border: 1px solid;`;

const flatten = (side: "left" | "right"): Style =>
  `padding-${side}: 0px; border-${side}-width: 0px; border-top-${side}-radius: 0px; border-bottom-${side}-radius: 0px;`;

const toColor = ({ bg, hilight, shadow, text }: Color): Style =>
  `color: ${text}; background: ${bg}; border-color: ${hilight} ${shadow} ${shadow} ${hilight};`;

const toLayout = ({ fontSize, padY, padX, rounded }: Layout) =>
  `font-size: ${fontSize}%; padding: ${padY}px ${padX}px; border-radius: ${rounded}px;`;

const toBubbleStyle = memoizeUnary((theme: ThemeSpec): string[] => {
  const base = `${block}${toColor(theme)}${toLayout(theme)}`;
  return [
    `${base}${flatten("right")}`,
    `${base}${flatten("left")}${theme.emphasis}`,
  ] as Style[];
});

function toBubblePrepender(
  bubbleLeft: string,
  bubbleRight: string,
  theme: ThemeSpec
): LogDecorator {
  const prefix = `%c${bubbleLeft}%c ${bubbleRight}`;
  const [left, right] = toBubbleStyle(theme);
  return (args: unknown[]) => {
    const bubbleArgs = [prefix, left, right];
    if (typeof args[0] === "string") {
      bubbleArgs[0] = `${prefix}%c ${args.shift() as string}`;
      bubbleArgs.push(""); // reset style
    }
    return [...bubbleArgs, ...args];
  };
}

const stateTypes = {
  event: "️⚡️",
} as const;

const stateDelim = " ⤻ ";

type DebugState = { type: keyof typeof stateTypes; name: string };

// Serialize to memoize.
const getStateFormatter = memoizeUnary((stateJson: string) => {
  const stateStack = JSON.parse(stateJson) as unknown as DebugState[];
  const firstState = stateStack.shift();
  const left = stateTypes[firstState.type];
  const right = [
    firstState.name,
    ...stateStack.map((state) => `${stateTypes[state.type]} ${state.name}`),
  ].join(stateDelim);
  return toBubblePrepender(left, right, toTheme("gray small"));
});
const getStatePrepender = (stateStack: DebugState[]) =>
  getStateFormatter(JSON.stringify(stateStack));

const overrideMethods = ["log", "error", "warn", "info", "debug"] as const;

const identity = <T>(x: T) => x;

const noop = (): (() => undefined) => undefined;

export interface DebugLogger extends Console {
  detach(): void;
  pushState(state: DebugState): void;
  popState(): void;
}

export function customConsole(
  theme: Theme,
  type: string,
  name: string
): DebugLogger {
  const prepender = toBubblePrepender(`X${type}`, name, toTheme(theme));
  let statePrepender: LogDecorator = identity as LogDecorator;
  const stateStack: DebugState[] = [];
  const loggerProto: PropertyDescriptorMap = {
    detach: {
      writable: true,
      configurable: true,
      value(this: DebugLogger) {
        overrideMethods.forEach((method) => {
          this[method] = noop;
        });
      },
    },
    pushState: {
      value(state: DebugState) {
        stateStack.push(state);
        statePrepender = getStatePrepender(stateStack);
      },
    },
    popState: {
      value() {
        stateStack.pop();
        statePrepender =
          stateStack.length === 0
            ? (identity as LogDecorator)
            : getStatePrepender(stateStack);
      },
    },
  };
  const customConsole = Object.create(
    console,
    overrideMethods.reduce((out, level) => {
      out[level] = {
        writable: true,
        configurable: true,
        value(...args: unknown[]) {
          console[level](...prepender(statePrepender(args)));
        },
      };
      return out;
    }, loggerProto)
  ) as DebugLogger;
  return customConsole;
}
