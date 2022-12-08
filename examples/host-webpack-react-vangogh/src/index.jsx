import React from "react";
import ReactDOM from "react-dom";
import { Extensible } from "@adobe/uix-host-react";
import { Gallery } from "./Gallery";
import "bootstrap/dist/css/bootstrap.min.css";

const registryUrl = new URL(REGISTRY_URL, window.location);
registryUrl.searchParams.append("keywords", "van gogh");

const paintings = JSON.parse(
  document.getElementById("paintings-list-json").textContent
);

const main = () =>
  fetch(registryUrl)
    .then((response) => response.json())
    .then((extensionList) =>
      extensionList.reduce(
        (byId, extension) => ({
          ...byId,
          [extension.id]: extension.url,
        }),
        {}
      )
    )
    .then((extensions) => {
      console.log({ extensions, paintings });
      ReactDOM.render(
        <React.StrictMode>
          <Extensible
            debug={true}
            extensionsProvider={async () => extensions}
            rootName={HOST_ID}
          >
            <Gallery items={paintings} />
          </Extensible>
        </React.StrictMode>,
        document.getElementById("root")
      );
    });

main().catch((e) => {
  console.error(e);
  document.body.innerHTML = `
  <div style="color: red; margin: 1em">
    <h1>Error</h1>
    <pre><code>${e.stack}</code></pre>
  </div>
  `;
});
