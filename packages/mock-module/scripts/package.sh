#!/bin/bash

PKG_NAME=$(node -p "require('./package.json').name")

yarn rimraf staging
mkdir staging
cp -R package.json staging/
cp -R dist staging

sed -i "s#file:../module-framework/#file:../../module-framework/bundle.tar.gz#g" staging/package.json

cd staging
yarn --prod

cd ..
yarn asar pack staging $PKG_NAME.asar 

# hack file into place
cp $PKG_NAME.asar ../companion/userdata/modules/mock.asar
