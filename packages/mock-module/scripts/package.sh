#!/bin/bash

yarn rimraf staging
mkdir staging
cp -R package.json staging/
cp -R dist staging

cd staging
yarn --prod

cd ..
yarn asar pack staging mod.asar 

# hack file into place
cp mod.asar ../companion3-prototype/userdata/modules/mock.asar
