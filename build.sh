#!/bin/bash
if [[ ! $PKGUSER || ! $PKGEMAIL || ! $PKGTAG ]]; then
  REVISION=$(git rev-list --all|wc -l) python setup.py bdist_rpm
else
  CHANGELOG=$(echo -e "* $(date +"%a %b %d %Y") ${PKGUSER} ${PKGEMAIL}\n- ${PKGTAG}")
  REVISION=$(git rev-list --all|wc -l) python setup.py bdist_rpm --changelog="$CHANGELOG"
fi
