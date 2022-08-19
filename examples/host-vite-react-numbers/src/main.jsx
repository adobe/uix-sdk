import React from "react";
import ReactDOM from "react-dom";
import { Extensible } from "@adobe/uix-host-react";
import App from "./App";
import "./index.css";
import {getExtensionRegistryExtensions} from "@adobe/uix-host";

async function main() {
  const extensionLoader = () =>
    getExtensionRegistryExtensions("aem/cf-console-admin/1", {
      imsToken: 'eyJ...I2vg',
      imsOrgId: '52962F2C5F2D746C0A49402B@AdobeOrg',
      apiKey: 'exchangeweb2',
      exchangeUrl: 'https://appregistry-stage.adobe.io',
    })

  ReactDOM.render(
    <React.StrictMode>
      <Extensible
        debug={process.env.NODE_ENV !== "production"}
        extensionLoader={extensionLoader}
        rootName="Number Discussion"
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
