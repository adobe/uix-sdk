import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Extensible } from "@adobe/uix-host-react";

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
            extensionsProvider={extensionsProvider}
        >
            <App />
        </Extensible>
    </React.StrictMode>
);
