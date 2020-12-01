## Prototyping

Warning: An early prototype that doesn't do much. Only tested on linux so far.

### Useful commands

-   `yarn dev` - Start development version in headless mode
-   `yarn dev-electron` - Start development version in electron mode
-   `yarn build-unpacked` - Build everything, and bundle up with electron. Set to output in dir mode, under electron-output.
-   `yarn build` - Build everything for headless mode
-   `yarn clean` - Clean any compiled files

### Structure

-   /packages - Various projects (companion + system modules)
-   /packages/companion - Companion source code
    -   assets - static assets served over http
    -   src/shared - code shared between client and server. eg database types
    -   src/client - react based client code
    -   src/server - server/backend code
    -   bundled-modules - any modules to be distributed with companion should be built into an asar file in here. the expectation is that not everything will be bundled, many will be distributed via a 'module store'
    -   userdata - database docs etc generated at runtime. Located here in development, gets placed elsewhere when running a full electron build
-   /packages/mock-module - Example module
-   /packages/module-framework - shared code (api typings etc) to be used by modules
-   /scripts - Scripts for various tasks
-   /tools - third party tools
