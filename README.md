## Prototyping

### Useful commands

-   `yarn dev` - Start development version in headless mode
-   `yarn dev-electron` - Start development version in electron mode
-   `yarn build-unpacked` - Build everything, and bundle up with electron. Set to output in dir mode, under electron-output.
-   `yarn build` - Build everything for headless mode
-   `yarn clean` - Clean any compiled files

### Structure

-   /deps - Custom forks of dependencies
-   /packages - Various projects (companion + system modules)
-   /packages/companion - Companion source code
    -   assets - static assets served over http
    -   src/shared - code shared between client and server. eg database types
    -   src/client - react based client code
    -   src/server - server/backend code
