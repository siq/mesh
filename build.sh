#!/bin/bash
export REVISION=$(git rev-list --all|wc -l)
if [[ ! $PKGUSER || ! $PKGEMAIL || ! $PKGTAG ]]; then
  python setup.py bdist_rpm --release $REVISION
else
  CHANGELOG=$(echo -e "* $(date +"%a %b %d %Y") ${PKGUSER} ${PKGEMAIL}\n- ${PKGTAG}")
  python setup.py bdist_rpm --release $REVISION --changelog="$CHANGELOG"
fi
