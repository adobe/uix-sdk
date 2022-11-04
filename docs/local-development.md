# Local Modification for Service

In case you would like to introduce changes to UIX SDK during integration with a service you will need:
1. Local source code copy of service you integrate with UIX
2. Local copy of [UIX SDK monorepo](https://github.com/adobe/uix-sdk)
3. [Yalc](https://www.npmjs.com/package/yalc)

To use a local copy of SDK packages:
1. Install all dependencies for the service project with `npm install` or `yarn install`
2. Make necessary changes in UIX SDK
3. Build SDK packages with `npm run build`
4. Publish packages to `yalc` and add them to your service project with `node scripts/publish-local-to.mjs <path to service project>`.
Script automatically recognizes all used SDK packages in the service project and add them as `yalc` dependencies. If service project does not use SDK yet all packages will be added.

> **Warning**
> Do not commit `package.json` with `yalc` dependencies. Before committing changes please specify correct SDK package version that you are going to release and remove all excessive SDK packages from your project.