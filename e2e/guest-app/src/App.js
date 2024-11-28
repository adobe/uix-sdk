import {ErrorBoundary} from "react-error-boundary";
import {HashRouter, Route, Routes} from "react-router-dom";
import ExtensionRegistration from "./ExtensionRegistration";
import CustomHeaderButtonModal from "./CustomHeaderButtonModal";
import React from 'react'

function App() {
  return (
      <HashRouter>
        <ErrorBoundary onError={onError} FallbackComponent={fallbackComponent}>
          <Routes>
            <Route index element={<ExtensionRegistration />} />
            <Route
                exact path="index.html"
                element={<ExtensionRegistration />}
            />
            <Route
                exact path="custom-header-button-modal"
                element={<CustomHeaderButtonModal />}
            />
            // YOUR CUSTOM ROUTES SHOULD BE HERE
          </Routes>
        </ErrorBoundary>
      </HashRouter>
  )

  // Methods

  // error handler on UI rendering failure
  function onError(e, componentStack) {}

  // component to show if UI fails rendering
  function fallbackComponent({ componentStack, error }) {
    return (
        <React.Fragment>
          <h1 style={{ textAlign: "center", marginTop: "20px" }}>
            Phly, phly... Something went wrong :(
          </h1>
          <pre>{componentStack + "\n" + error.message}</pre>
        </React.Fragment>
    )
  }
}

export default App

