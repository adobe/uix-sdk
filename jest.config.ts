import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  projects: [
    {
      displayName: "uix-core",
      testMatch: ["<rootDir>/packages/uix-core/src/**/*.test.ts"],
      modulePathIgnorePatterns: ["<rootDir>/dist"],
      setupFiles: [
        "<rootDir>/packages/uix-core/src/__helpers__/jest.messagechannel.cjs",
      ],
      testEnvironment: "jsdom",
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            useESM: true,
          },
        ],
      },
      globals: {
        UIX_SDK_VERSION: "0.0.1-test",
        UIX_SDK_BUILDMODE: "test",
      },
    },
  ],
};

export default jestConfig;
