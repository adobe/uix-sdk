# UIX SDK end-to-end tests

To run the end-to-end tests locally, you need to do the following:

- cd to host-app folder
```bash
npm install
npm start
```

- cd to guest-app folder
```bash
npm install
npm start
```

- cd to e2e-tests folder
```bash
npm install
npm test
```

The end-to-end tests will run, and you will see the results in the console.

## Registration iframe connection regression

`tests/tests/register-and-attach.js` reproduces the Semrush incident from
SITES-53586 (related to SITES-53493). It establishes a real `register()` connection,
verifies RPC in both directions, then calls `attach()` in that same hidden iframe.
No handshake messages are mocked or replayed.

The regression asserts the intended safeguard: reject the invalid `attach()` with
a clear connection-contract error, without an `onIframeResize` TypeError or
damage to the registration connection. It is intentionally failing until that
safeguard is implemented. A register-only control must pass.

The test is included in the normal `npm run test:e2e` suite. To run only this file
against running host and guest apps configured with the local SDK build:

```bash
cd e2e/tests
npm test -- --src tests/register-and-attach.js
```

The host-app and guest-app have the last version of the sdk installed.

To test any new version of the sdk, you need to update the matrix in the `root/.github/workflows/e2e-tests.yml` file adding the new version.

```yaml
    strategy:
      matrix:
        host-app-version: [ "0.8.0", "0.8.1", "0.8.2", "0.8.3", "0.8.4", "0.8.5", "0.9.0", "0.9.1", "0.9.2", "0.10.0","0.10.1", "0.10.2","0.10.3","0.10.4", "latest" ]
        guest-app-version: [ "0.8.0", "0.8.1", "0.8.2", "0.8.3", "0.8.4", "0.8.5", "0.9.0", "0.9.1", "0.9.2", "0.10.0","0.10.1", "0.10.2","0.10.3","0.10.4", "latest" ]

```
