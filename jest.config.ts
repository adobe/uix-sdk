import type { JestConfigWithTsJest } from "ts-jest";

const sdkProject = (sdkName: string, overrides: JestConfigWithTsJest) => ({
  displayName: `uix-${sdkName}`,
  testMatch: [`<rootDir>/packages/uix-${sdkName}/src/**/*.test.ts?(x)`],
  modulePathIgnorePatterns: ["<rootDir>/dist", "<rootDir>/e2e/"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  globals: {
    UIX_SDK_VERSION: "0.0.999",
    UIX_SDK_BUILDMODE: "test",
  },
  ...overrides,
});

const jestConfig = {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  projects: [
    sdkProject("core", {
      setupFiles: [
        "<rootDir>/packages/uix-core/src/__helpers__/jest.messagechannel.cjs",
      ],
    }),
    sdkProject("host", {}),
    sdkProject("host-react", {
      testMatch: [
        "<rootDir>/packages/uix-host-react/src/**/*.test.ts",
        "<rootDir>/packages/uix-host-react/src/**/*.test.tsx",
      ],
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
    }),
  ],
};

export default jestConfig;
