#!/bin/bash

npx eslint \
  'search-pro/*.js' \
  'search-pro/js/**/*.js' \
  'search-pro/modules/**/*.js' \
  --config search-pro/extras/eslint.config.mjs \
  --ignore-pattern 'search-pro/fuse.js/**' \
  --ignore-pattern 'search-pro/extras/**' \
  --fix \
  --quiet
