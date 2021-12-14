#!/bin/sh
export EXISTING_VARS=$(printenv | awk -F= '{print $1}' | sed 's/^/\$/g' | paste -sd,);
for file in /usr/share/nginx/html/static/js/*.js
do
    cat $file | envsubst $EXISTING_VARS | tee $file > /dev/null 2>&1
done
nginx -g 'daemon off;'