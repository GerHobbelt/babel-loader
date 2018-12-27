#! /bin/bash

cd $( dirname $0 )
cd ..

node_modules/.bin/prettier --write --trailing-comma all src/**/*.js test/**/*.test.js test/helpers/*.js 
prettier --write --trailing-comma es5 scripts/*.js
