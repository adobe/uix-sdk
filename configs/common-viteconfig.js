/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import { resolve } from "path";
import { getSdks } from "../scripts/script-runner.mjs";

export default async function commonExampleConfig() {
  const sdks = await getSdks();
  const sdkNames = sdks.map(({ pkg }) => pkg.name);
  /** @type {import('vite').UserConfig} */
  const commonConfig = {
    logLevel: "warn",
    clearScreen: false,
    optimizeDeps: {
      force: true,
      include: [...sdkNames, "react"],
      transformMixedEsModules: true,
    },
    build: {
      sourcemap: "inline",
      commonjsOptions: {
        exclude: [...sdkNames, "react"],
      },
      ssr: false,
    },
    ssr: false,
    server: {
      strictPort: true,
      port: process.env.MULTI_SERVER_PORT,
    },
    preview: {
      port: process.env.MULTI_SERVER_PORT,
      strictPort: true,
    },
    define: {
      REGISTRY_URL: JSON.stringify(
        process.env.REGISTRY_URL || "http://localhost:3000/"
      ),
    },
    resolve: {
      alias: sdks.reduce(
        (aliases, sdk) => ({
          ...aliases,
          [sdk.pkg.name]: resolve(sdk.cwd, "dist/esm"),
        }),
        {}
      ),
    },
  };
  return commonConfig;
}
