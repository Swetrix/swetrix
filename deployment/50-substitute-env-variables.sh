#!/bin/sh
# WARNING: THIS FILE MUST BE SAVED WITH LF LINE ENDINGS, OTHERWISE IT WONT WORK
set -o errexit
set -o nounset
set -o pipefail

: "${API_URL}"

cat <<EOF > /usr/share/nginx/html/env.js
window.env = {};
window.env.API_URL = "$API_URL";
EOF