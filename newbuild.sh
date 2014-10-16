#!/bin/bash -ex

export CFLAGS=-m32
[[ ! -d $BUILDPATH/usr/lib/python2.6/site-packages ]] && mkdir -p $BUILDPATH/usr/lib/python2.6/site-packages
#%build
/usr/bin/python32 setup.py build #--release $REVISION --changelog="$CHANGELOG"
#%install
/usr/bin/python32 setup.py install --skip-build --root $BUILDPATH --install-lib='/usr/lib/python2.6/site-packages'
unset CFLAGS
#fi
