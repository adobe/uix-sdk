## UI Extensibility toolkit for Experience Cloud Apps

With these libraries you can:

- Make any app into a UI Extensibility **Host**
- Connect any app to a Host as a UI Extension, or **Guest**

Host applications define areas that can be extended, enhanced or modified by guest applications. They define these areas in the UI code itself, simply by expressing what interfaces an extension needs to have, and then calling them.

Guest applications expect to run in an "off-thread environment" in the user's browser. Most typically this is an iframe, though it may expand in the future to include other runtimes.

The host and guest cannot share live objects or closures; they communicate with messages. The UIX SDK abstracts this into an RPC interface, enabling the host and guest to call asynchronous methods on each other directly.

## Installation

### Requirements

The SDK runs in modern browsers of the last several versions. It is not extensively tested in Internet Explorer. The SDKs use relatively recent native browser features, including [EventTarget](https://caniuse.com/mdn-api_eventtarget), [fetch](https://caniuse.com/fetch), [for...of loops](https://caniuse.com/mdn-javascript_statements_for_of), [Proxy](https://caniuse.com/proxy), [Reflect](https://caniuse.com/mdn-javascript_builtins_reflect), [WeakMap](https://caniuse.com/mdn-javascript_builtins_weakmap), and others. Using the SDK in browsers that don't support these features requires transpiling it with tools like Webpack and Parcel; most projects do this by default.

As of v0.5.0, The SDK has no peer dependencies. It has only one direct dependency, on the [Penpal](https://www.npmjs.com/package/penpal) iframe management library. It shouldn't add much weight to your bundles.

When using the host-side React bindings at `@adobe/uix-host-react`, there is an implicit React peer dependency.

### Host Application

Host applications built in React should use the React bindings library: `npm install @adobe/uix-host-react` / `yarn add @adobe/uix-host-react`

Host apps not built in React can use the underlying host library objects: `npm install @adobe/uix-host` / `yarn add @adobe/uix-host` _(and consider contributing higher-level bindings for your app's framework!)_

### Guest Application

Guest applications built in any framework should use the guest objects library: `npm install @adobe/uix-guest` / `yarn add @adobe/uix-guest`

### Preview builds

#### Nightly
Nightly builds are released to NPM under the `nightly` tag. The version string will be different each day because it includes a datestamp, but you can always install the latest nightly using the tag: 
```sh
npm install @adobe/uix-host-react@nightly
npm install @adobe/uix-guest@nightly
```

## Usage

### Usage - React App Hosts

Make a React app extensible with UI Extensions by wrapping all or part of the app UI component tree in the `Extensible` provider.
`<Extensible>` provides a singleton UIX Host object for the part of the React app it contains.
Any descendent component may use the `useExtensions()` hook.

#### `App.jsx` with hardcoded extensions
```jsx
import { Extensible } from '@adobe/uix-host-react'

function ExtensibleApp() {
  return (
    <Extensible
      extensions={{
        "cc1": "https://creative-cloud-ext.adobeio-static.net",
        "exc1": "https://experience-cloud-ext.adobeio-static.net",
      }}>
      <App/>
    </Extensible>
  )
}
```

In a real app, hardcoded extensions are unlikely; instead, extensions can be
supplied in the form of a function which returns a Promise for the list. The
React bindings provide convenience methods for creating these functions.

#### `App.jsx` using ExtensionProvider and a preinitialized shared context
```jsx
import {
  Extensible,
  createExtensionRegistryProvider
} from '@adobe/uix-host-react'

function ExtensibleApp({ params, auth, shell, service, version, env }) {
  return (
    <Extensible
      extensions={createExtensionRegistryProvider({
        baseUrl: env === "prod" ? "appregistry.adobe.io" : params.registry,
        apiKey: shell.imsClientId,
        auth: {
          schema: auth.authScheme || "Bearer",
          imsToken: auth.imsToken,
        },
        service: "aem",
        extensionPoint: service,
        version: version || "1",
        imsOrg: auth.imsOrg
      })}
      sharedContext={{
        locale: shell.locale,
        theme: COLOR_SCHEME,
        auth,
      }}>
      <App/>
    </Extensible>
  )
}
```

Components inside the Extensible provider can use the `useExtensions` hook.

#### `Component.jsx`
```jsx
import React, { useEffect, useState } from 'react';
import { useExtensions } from '@adobe/uix-host-react'
function App() {

  const { extensions } = useExtensions(() => ({
    // Only re-render when all extensions have loaded
    updateOn: "all",
    // Get only the extensions that implement these methods
    requires: {
      someNamespace: ["getSomeData", "getOtherData"]
    },
    // Extensions can remotely call these methods
    provides: {
      annoy: {
        // First argument is always the extension description
        cheerily(source, greeting) {
          console.log(`Extension ${source.id} says ${greeting}`);
        },
      },
    }
  }));
  
  const [data, setData] = useState([]);
  useEffect(() => {
    Promise.all(
      // Call extensions; all remote methods return Promises
      extensions.map(({ apis }) => apis.someNamespace.getSomeData("query")))
    .then(setData);
  }, extensions);
  return (
    <ul>
      {data.map(item => <li>{item}</li>)}
    </ul>
  );
}
```

### Usage - Guests

An extension has its own runtime inside a Host app. It starts with one hidden
iframe, called the "bootstrap" frame or the "GuestServer", which runs first and
registers the extension's capabilities. This can be considered the "entry point"
of the guest, which can control other iframes (see below). It runs in the
background and should not have visible UI.

Create your GuestServer with `register()`.

#### `creative-cloud-ext/web-src/main.js`
```js
import { register } from "@adobe/uix-guest";
import { externalDataSource } from "./guest-functionality";

async function start() {

  const guestServer = await register({
    methods: {
      someNamespace: {
        getSomeData(query) {
          return externalDataSource.get(query);
        },
        async getOtherData() {
          const res = await fetch(externalDataSource.meta);
          return res.json();
        }
      },
    },
    id: "creative-cloud-ext"
  });

  // The returned guest object has access to any methods provided by the host in
  // the 'useExtensions({ provide })` parameter.
  setInterval(() => guestServer.host.annoy.cheerily('Hi!'), 5000);
}
```

Extensions can control host UI if the host exposes methods that let them do so,
entirely from within the GuestServer. But in many cases, the host may want to
display UI rendered by the extension. Because the GuestServer is a background
process, it can't display this UI itself; instead, the host app can spawn
additional iframes that point to other URLs on the extension host; extensions
can attach these "UI frames" to the host via `attach()`.

```js
import { attach } from "@adobe/uix-guest";

async function start() {

  const guestUI = await attach({
    id: 'creative-cloud-ext'
  });
  // when guest UI returns, we are already connected. it's time to render!
  document.body.innerHTML = "This is a bad way to render, though."
  //call methods host exposed
  await guestUI.host.renderDone();
  // subscribe to shared context changes
  guestUI.addEventListener("contextchange", (event) => {
    document.body.innerHTML += "A very bad way to render. Updated context:"
    document.body.innerHTML ++ JSON.stringify(event.detail.context);
  })
}
```

## Development

### Quick Start

#### Dev Mode

1. Clone this repo and run `npm install` from root.
2. Run `npm run build` for an initial dev build.
3. Run `npm run dev` to start the dev server.
4. Open the project in your IDE. Saving any changes in packages or examples should cause an incremental refresh on the dev server.

To link your in-development SDKs to another project, see [Publish Local Script][publish-local-script] below.

#### Production and Release

1. Run `npm run format && npm run build:production` to produce a clean build.
2. Run `npm run demo` to open the minified, production version of the dev server.
3. Navigate through the demo servers and test functionality.
4. Commit any changes and repeat from step 1.
5. Run:
    ```sh
    node scripts/release.mjs <major|minor|patch|prerelease>
    ```

To customize the behavior of the release script, see [Release Script](#release-script) below.

### Requirements

- Node >= LTS Gallium (16)
- NPM >= 7

### Repository Layout

:info: _This repository uses `npm` and not `yarn`, but `yarn` should work if necessary._

There are two sets of workspaces:

- `packages/`: Source code for the SDKs themselves
- `examples/`: Small example projects demonstrating use of the SDK in different contexts, use cases, and frontend frameworks

Additional repo contents:

- `configs/`: Common config files for various tools in use by packages
- `scripts/`: Build, development, release and CI scripts
- `tsconfig.json`: Root TypeScript configuration, inherited and shared by all SDK packages.
- `tsconfig-debug.json`: Verbose-logging version of tsconfig, used by npm scripts.
- `.*`: Configuration files for tooling, including IDEs, ESLint, NPM, Prettier, NVM, asdf

### Package Scripts

All scripts should be called from package root. If you need to run an individual script in a single workspace, use the `-w` flag.

The defined NPM scripts are:

- `build`: Alias to `build:development`
- `build:development`: Bundle all SDKs in development mode, with extra logging, no minification, and source maps
- `build:production`: Bundle all SDKs in production mode, with minification
- `clean`: Remove all artifacts and node_modules in the repo root, and run `clean` scripts in all packages
- `demo`: Run the [demo server][demo-server]
- `dev`: Run the [dev server][dev-server]
- `format`: Fix code formatting and usage errors. **Warning: Will edit files directly.**
- `lint`: Find formatting and usage problems.
- `report`: Run a production build, then print a report of how many bytes each SDK would add to a JS bundle. Good for performance budgeting.
- `test`: Run `test` scripts in all packages.
- `watch`: Alias to `dev`
- `any`: Alias to `--workspaces --if-present`

### Custom Scripts

The scripts in `/scripts` can be run directly with `node scripts/<script>.mjs`. Some of them, such as `bundler` and `multi-server`, are called from NPM scripts and don't need to be run manually.

#### Bundler Script

```sh
node scripts/bundler.mjs <development|production|report>
```

_Called by `npm run build`. No need to call directly._

Builds all SDK packages in `packages/` in dependency order, by executing the `build` script defined in each package. If `report` is specified instead of `development` or `production`, the script will build, print a bundle size report, and then delete the built artifacts.

#### Multi Server Script

```sh
node scripts/multi-server-mjs <development|production>
```

_Called by `npm run dev` and `npm run demo`. No need to call directly._

When mode is `development`, will start live development environment for the SDKs, including:

- Incremental compilation of SDK packages
- Live, hot-reloading example servers
- A mock registry that example servers use to connect to each other

When mode is `production`, will compile the SDKs in production mode and then run the example servers and mock registry in production mode.

#### Publish Local Script

```sh
node scripts/publish-local-to.mjs <../path/to/other-project-root>
```

Export your local dev versions of SDK packages to another local project. Uses `yalc` to package and copy build artifacts to other projects, instead of the more bug-prone `npm link`.

You'll need to re-run this script every time you make a new build; it doesn't refresh the exported packages on change like the dev server does, due to Node limitations with symlinks.

Use the `--dry-run` option to see what commands would be run first; the script will show the commands but not execute them.

### Release Script

```sh
node scripts/release.mjs <major|minor|patch|prerelease> [--no-version] [--no-git] [--no-publish] [--registry=https://example.com]
```

Prepare and release all SDKs. By default, this is what it does:

1. Validates that the branch is `main` and there are no changes in the Git index.
1. Validates that the root repo and all SDKs have the same version string. It may sometimes be necessary for the SDKs to have individual releases that don't match each other. This release script won't function under those circumstances.
1. Increments the root package version, and all the SDK package versions, to the new version string.
1. Modifies all interdependencies between SDK packages to use the new common version string.
1. Reinstalls dependencies, so `package.lock` picks up the new version strings.
1. Commits these version string changes.
1. Tags the git commit like NPM does, with a version string.
1. Pushes the main branch and new tag to the origin repo.
1. Publishes each SDK to the default NPM repositories, Adobe `npm-adobe-release` and `npm-platform-adobe-release` artifactories.

Adjust this functionality with command line arguments:

- `--no-version` to skip updating version strings
- `--no-git` to skip Git commit, tag, and push
- `--no-publish` to skip NPM publish
- `--registry=<registry url>` to override the default NPM repositories. Multiple `--registry=` arguments will publish to multiple repositories.
- `--dry-run` to see what commands would be run first; the script will show the commands but not execute them.

:information: **Warning: Must be working in an office or on the VPN for the Git push and NPM publish to work.**

## SDKs

### Structure

The UIX SDK is split into several small packages:

- `@adobe/uix-core` is for internal functionality and common types
- `@adobe/uix-guest` is the library that extension developers use to connect to the host
- `@adobe/uix-host` is the library that app developers use to make a UI extensible and integrate extensions
- `@adobe/uix-host-react` is a suite of React bindings for `@adobe/uix-host`, enabling easy access to extension functionality within the React component lifecycle.

### Architecture

TBD (TODO: diagrams)

## Examples

The repo contains several example projects in `examples/`. They also serve as user-acceptance-testing tools. Each one exposes a web server for dev and demo mode. Running `npm run dev` will launch all examples simultaneously.
