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

import React from "react";
import ReactDOM from "react-dom";
import { Extensible } from "@adobe/uix-host-react";
import App from "./App";
import "./index.css";

async function main() {
  const registryUrl = new URL(REGISTRY_URL, window.location);
  registryUrl.searchParams.append("keywords", "numbers");
  const extensionsProvider = () =>
    fetch(registryUrl)
      .then((extensionListResponse) => extensionListResponse.json())
      .then((extensionList) =>
        extensionList.reduce(
          (byId, extension) => ({
            ...byId,
            [extension.id]: extension.url,
          }),
          {}
        )
      );

  ReactDOM.render(
    <React.StrictMode>
      <Extensible
        appName="Number Discussion"
        debug={process.env.NODE_ENV !== "production"}
        extensionsProvider={extensionsProvider}
      >
        <App />
      </Extensible>
    </React.StrictMode>,
    document.getElementById("root")
  );
}

main().catch((e) => {
  console.error(e);
  document.body.innerHTML = `
  <div style="color: red; margin: 1em">
    <h1>Error</h1>
    <pre><code>${e.stack}</code></pre>
  </div>
  `;
});
