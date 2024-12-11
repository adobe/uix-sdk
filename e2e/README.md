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

The host-app and guest-app have the last version of the sdk installed.

To test any new version of the sdk, you need to update the matrix in the `root/.github/workflows/e2e-tests.yml` file adding the new version.

```yaml
    strategy:
      matrix:
        host-app-version: [ "0.8.0", "0.8.1", "0.8.2", "0.8.3", "0.8.4", "0.8.5", "0.9.0", "0.9.1", "0.9.2", "0.10.0","0.10.1", "0.10.2","0.10.3","0.10.4", "latest" ]
        guest-app-version: [ "0.8.0", "0.8.1", "0.8.2", "0.8.3", "0.8.4", "0.8.5", "0.9.0", "0.9.1", "0.9.2", "0.10.0","0.10.1", "0.10.2","0.10.3","0.10.4", "latest" ]

```
