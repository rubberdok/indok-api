#!/bin/sh
set -e

npm run db:migrate
node ./dist/index.js
exec "$@"
