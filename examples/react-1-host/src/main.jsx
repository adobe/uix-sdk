import React from "react";
import ReactDOM from "react-dom";
import { Extensible } from "@adobe/uix-sdk/react";
import App from "./App";
import "./index.css";

async function main() {
  const extensionListResponse = await fetch(REGISTRY_URL);
  const extensionList = await extensionListResponse.json();

  const extensionsById = extensionList.reduce(
    (byId, extension) => ({
      ...byId,
      [extension.id]: extension.url,
    }),
    {}
  );

  ReactDOM.render(
    <React.StrictMode>
      <Extensible extensions={extensionsById} rootName="react-1-extensible">
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
