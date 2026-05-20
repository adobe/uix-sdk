/**
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Fancy looking console decorator.
 * @hidden
 * @internal
 */

/** @internal */
const isDarkMode = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

/** @internal */
type Layout = {
  padX: number;
  padY: number;
  rounded: number;
  fontSize: number;
  emphasis: Style;
};
/** @internal */
type HexColor = `#${string}` | "transparent";
/** @internal */
type Color = {
  text: HexColor;
  bg: HexColor;
  hilight: HexColor;
  shadow: HexColor;
};
/** @internal */
type ThemeSpec = Color & Layout;

/** @internal */
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

/** @internal */
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

/** @internal */
type ThemeTag = `${keyof typeof Colors} ${keyof typeof Layouts}`;

/**
 * @internal
 */
export type Theme = ThemeSpec | ThemeTag;

/** @internal */
type LogDecorator = (...args: unknown[]) => unknown[];

/** @internal */
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

/** @internal */
const stateTypes = {
  event: "️⚡️",
} as const;

const stateDelim = " ⤻ ";

/** @internal */
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

/**
 * A console, plus some methods to track event lifecycles.
 * @internal
 */
export interface DebugLogger extends Console {
  /**
   * Stop all logging; methods do nothing
   * @internal
   */
  detach(): void;
  /**
   * Add an event bubble to the log during handler.
   */
  pushState(state: DebugState): void;
  /**
   * Remove the bubble when event is done dispatching
   */
  popState(): void;
}

/**
 * Returns a console whose methods autoformat with bubbles.
 * @internal
 */
export function _customConsole(
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

/**
 * @internal
 */
export const quietConsole = new Proxy(console, {
  get() {
    return noop;
  },
});
