#!/bin/bash

PKG_NAME=$(node -p "require('./companion/manifest.json').id")

yarn build

rm -Rf staging
mkdir staging
cp -R package.json staging/
cp -R dist staging/
cp -R companion staging/


sed -i "s#\"@companion/module-framework\": \"\*\"#\"@companion/module-framework\": \"file:../../module-framework/bundle.tar.gz\"#g" staging/package.json

cd staging
yarn --prod

yarn cache clean @companion/module-framework
rm -Rf ~/.cache/yarn/v6/

yarn add ../../module-framework/bundle.tar.gz

cd ..
# yarn asar pack staging $PKG_NAME.asar 

# hack file into place
rm -R ../companion/bundled-modules/$PKG_NAME
cp -R staging ../companion/bundled-modules/$PKG_NAME
