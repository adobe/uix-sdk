## UI Extensibility toolkit for Experience Cloud Apps

With these libraries you can:

- Make any app into a UI Extensibility **Host**
- Connect any app to a Host as a UI Extension, or **Guest**

Host applications define areas that can be extended, enhanced or modified by guest applications. They define these areas in the UI code itself, simply by expressing what interfaces an extension needs to have, and then calling them.

Guest applications expect to run in an "off-thread environment" in the user's browser. Most typically this is an iframe, though it may expand in the future to include other runtimes.

The host and guest cannot share live objects or closures; they communicate with messages. The UIX SDK abstracts this into an RPC interface, enabling the host and guest to call asynchronous methods on each other directly.

### Installation

The SDK has one explicit peer dependency, on the [Penpal](https://www.npmjs.com/package/penpal) iframe management library.

When using the React bindings at `@adobe/uix-sdk/react`, there is an implicit React peer dependency.

At minimum: 

```sh
npm install penpal @adobe/uix-sdk
# or
yarn add penpal @adobe/uix-sdk
```

### Usage - Hosts

For host apps, the React bindings are currently the most mature. The underlying Host and Guest objects are not React-dependent,

#### `App.jsx`
```jsx
import { Extensible } from '@adobe/uix-sdk/react'

// "<Extensible>" provides a singleton UIX Host object for the part of the React app it contains.
// Any descendent component may use the `useExtensions()` hook.
function ExtensibleApp() {
  return (
    <Extensible
      extensions={{
        "cc1": "https://creative-cloud-ext.adobeio-static.net",
        "exc1": "https://experience-cloud-ext.adobeio-static.net",
      }}
      rootName="my-app-root">
      <App/>
    </Extensible>
  )
}
```

#### `Component.jsx`
```jsx
import React, { useEffect, useState } from 'react';
import { useExtensions } from '@adobe/uix-sdk/react'
function App() {

  const { extensions } = useExtensions(() => ({
    updateOn: "each",
    requires: {
      someNamespace: ["getSomeData", "getOtherData"]
    },
    provides: {
      annoy: {
        cheerily(source, greeting) {
          console.log(`Extension ${source.id} says ${greeting}`);
        },
      },
    }
  }));
  
  const [data, setData] = useState([]);
  useEffect(() => {
    Promise.all(extensions.map(({ apis }) => apis.someNamespace.getSomeData("query")))
    .then(setData);
  }, [extensions]);
  return (
    <ul>
      {data.map(item => <li>{item}</li>)}
    </ul>
  );
}
```

_Note that the way the SDK acquires the list of extensions available to the current org/app is not currently in scope for the SDK. Something else needs to query the registry and return the map of extensions._

### Usage - Guests

#### `creative-cloud-ext/web-src/main.js`
```js
import uixGuest from "@adobe/uix-sdk/guest";
import { externalDataSource } from "./guest-functionality";

const uix = uixGuest({ id: "cc1" });

uix.register({
  someNamespace: {
    getSomeData(query) {
      return externalDataSource.get(query);
    },
    async getOtherData() {
      const res = await fetch(externalDataSource.meta);
      return res.json();
    }
  },
});

setInterval(() => uix.host.annoy.cheerily('Hi!'), 5000);

```

### Development

#### Requirements

- Node >= LTS Gallium (16)
- NPM >= 7
- **For publishing**: Access key for `https://artifactory.corp.adobe.com/artifactory/api/npm/npm-adobe-platform-release/`

:info: _This repository uses `npm` and not `yarn`, but `yarn` should work if necessary._

#### Layout

| 
