## Prototyping

### Useful commands
 * `yarn build-unpacked` - Build everything, and bundle up with electron. Set to output in dir mode, under electron-output.
 * `yarn buil` - Build everything for headless mode
 * `yarn clean` - Clean any compiled files
 * `yarn dev` - Start development version in headless mode
 * `yarn dev-electron` - Start development version in electron mode

### Structure
 * /assets - static assets served over http
 * /src/shared - code shared between client and server. eg database types
 * /src/client - react based client code
 * /src/server - server/backend code
