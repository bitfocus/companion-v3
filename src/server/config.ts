import readPkgUp from 'read-pkg-up';
import electron from 'electron';

const IS_PACKAGED = electron.app ? electron.app.isPackaged : false;
const IS_DEV = electron.app ? !IS_PACKAGED : process.env.NODE_ENV !== 'production';

const PackageJson = readPkgUp.sync();
if (!PackageJson) {
	throw new Error('Failed to open package.json');
}
const { version: VERSION } = PackageJson.packageJson;

// server
const SERVER_PORT = process.env.PORT || 3000;
const WEBPACK_PORT = 8085; // For dev environment only

export { IS_DEV, IS_PACKAGED, VERSION, SERVER_PORT, WEBPACK_PORT };
