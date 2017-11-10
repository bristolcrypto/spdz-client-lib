#!/bin/sh
if test -e ./dist; then
    rm -fr ./dist
fi

babel src --out-dir dist --ignore *.test.js,test_support