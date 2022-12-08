import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import MetMuseum from "./MetMuseum";
import MetMuseumPreviewPage from "./MetMuseumPreviewPage";
import "./index.css";

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Switch>
        <Route
          path="/show/:painting/:lang"
          render={({ match }) => <MetMuseumPreviewPage {...match} />}
        />
        <Route path="/" component={MetMuseum} />
      </Switch>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root")
);
