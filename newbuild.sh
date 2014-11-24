#!/bin/bash -ex

[[ ! -d $BUILDPATH/usr/lib/python2.6/site-packages ]] && mkdir -p $BUILDPATH/usr/lib/python2.6/site-packages
python setup.py build
python setup.py install --skip-build --root $BUILDPATH --install-lib='/usr/lib/python2.6/site-packages'
