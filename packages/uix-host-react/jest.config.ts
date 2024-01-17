/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const ignores = ["/node_modules/", "__mocks__", "dist", "/__navigation__/"];

process.env.TZ = "UTC";

module.exports = {
  testEnvironment: "jsdom",
  "collectCoverage": true,
  clearMocks: true,
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  moduleNameMapper: {
    "\\.(s?css)$": "<rootDir>/../../node_modules/jest-css-modules",
  },
  coverageReporters: ["cobertura", "lcov", "text"],
//   reporters: ["default", "jest-junit"],
  cacheDirectory: "jest-cache",
  collectCoverageFrom: ["src/**/*.+(js|jsx|ts|tsx)", "!**/node_modules/**", "!**/*.d.ts"],
  testPathIgnorePatterns: [...ignores],
  coveragePathIgnorePatterns: ["src/.*/__tests__/", ".scss$", "mocks", "index.ts(x)?$", "src/test"],
  transformIgnorePatterns: ["/node_modules/(?!@babel/runtime)"],
  moduleDirectories: ["node_modules", "tests", "src/test", "src", "src/hooks"],
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts']
};
