import React from "react";
import ReactDOM from "react-dom";
import { Extensible } from "@adobe/uix-host-react";
import App from "./App";
import "./index.css";

async function main() {
  const extensionsProvider = () => fetch(REGISTRY_URL)
      .then(extensionListResponse => extensionListResponse.json())
      .then(extensionList => extensionList.reduce(
        (byId, extension) => ({
          ...byId,
          [extension.id]: extension.url,
        }),
        {}
      ));

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
