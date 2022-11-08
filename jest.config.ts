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
      setupFiles: ["<rootDir>/packages/uix-core/src/phantogram/__helpers__/jest.messagechannel.cjs"],
      testEnvironment: "jsdom",
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            useESM: true,
          },
        ],
      },
    },
  ],
};

export default jestConfig;
