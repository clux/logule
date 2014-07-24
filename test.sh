#!/usr/bin/env bash

cd test/
rm -f testdump.txt
$(npm bin)/nodeunit *.js --reporter=$1
cd ..
