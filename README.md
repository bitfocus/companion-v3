## Prototyping

Warning: An early prototype that doesn't do much. Only tested on linux so far.

Notes: UI based on https://github.com/bitfocus/companion/commit/32c742977882bd2afb2317b1cf4e792aa94b7612

### Manual Steps

MongoDB is required and for now must be downloaded manually to the correct folder.
It is expected for there to be a folder `tools/mongodb/${process.platform}-${process.arch` (eg `tools/mongodb/linux-x64` or `tools/mongodb/win32-x64`) containing the contents of the mongodb 4.4 download from https://www.mongodb.com/try/download/community

### Useful commands

-   `yarn dev` - Start development version in headless mode
-   `yarn dev-electron` - Start development version in electron mode
-   `yarn build-unpacked` - Build everything, and bundle up with electron. Set to output in dir mode, under electron-output.
-   `yarn build` - Build everything for headless mode
-   `yarn clean` - Clean any compiled files

### Structure

-   /packages - Various projects (companion + system modules)
-   /packages/companion - Companion server/backend source code
    -   bundled-modules - any modules to be distributed with companion should be built into an asar file in here. the expectation is that not everything will be bundled, many will be distributed via a 'module store'
    -   userdata - database docs etc generated at runtime. Located here in development, gets placed elsewhere when running a full electron build
-   /packages/webui - Companion webui source code
    -   assets - static assets served over http
-   /packages/shared - Companion shared code between webui and backend
-   /packages/mock-module - Example module
-   /packages/module-framework - shared code (api typings etc) to be used by modules
-   /scripts - Scripts for various tasks
-   /tools - third party tools
