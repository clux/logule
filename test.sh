#!/usr/bin/env bash

cd test/
$(npm bin)/nodeunit *.js --reporter=$1
cd ..
