import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {Extensible} from "@adobe/uix-host-react";
import {defaultTheme, Provider} from "@adobe/react-spectrum";

const root = ReactDOM.createRoot(document.getElementById('root'));

const registryUrl = new URL('http://localhost:3001', window.location);
registryUrl.searchParams.append("id", "cf-admin-all-points");
const extension = {
    "id": "cf-admin-all-points",
    "url": "http://localhost:3002/index.html",
    "extensionPoints": ["extensionNamespace"]
};
const extensionsProvider = async () => ({
    [extension.id]: extension,
});


root.render(
  <React.StrictMode>
      <Extensible
          debug={true}
          extensionsProvider={extensionsProvider}>
      <Provider theme={defaultTheme} colorScheme="light" width="100%" spa="auto" marginX="auto">
    <App />
        </Provider>
      </Extensible>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
