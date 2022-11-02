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

const allSdks = [
  "@adobe/uix-core",
  "@adobe/uix-guest",
  "@adobe/uix-host",
  "@adobe/uix-host-react",
];
export default function commonExampleConfig() {
  /** @type {import('vite').UserConfig} */
  const commonConfig = {
    logLevel: "warn",
    clearScreen: false,
    optimizeDeps: {
      include: [...allSdks, "react"],
    },
    build: {
      commonjsOptions: {
        exclude: ["react"],
      },
    },
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
  };
  return commonConfig;
}
