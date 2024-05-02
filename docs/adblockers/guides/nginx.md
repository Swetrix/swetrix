---
title: How to proxy Swetrix with Nginx
slug: /adblockers/guides/nginx
---

If you are already using Nginx on your website, you can add Swetrix to your configuration to proxy it.

## Update your Nginx configuration
```
# The `proxy_cache` part is only needed if you cache swetrix.js script.
# If you use Swetrix from NPM, there's no need to proxy it.
#
# Note: to use the `proxy_cache` setup, you'll need to make sure the `/var/run/nginx-cache`
# directory exists (e.g. creating it in a build step with `mkdir -p /var/run/nginx-cache`)
# and is readable (including all its parent directories) by your nginx worker user.
#
# To make `/var/run/nginx-cache` persist during reboots of your server
# make sure to run `echo "D /var/run/nginx-cache 0755 root root -" > /usr/lib/tmpfiles.d/nginx-cache.conf`
proxy_cache_path /var/run/nginx-cache/jscache levels=1:2 keys_zone=jscache:100m inactive=30d  use_temp_path=off max_size=100m;

server {
  # Using the Cloudflare DNS resolver, you can remove this line if you already use a resolver in your config, or change it to a resolver of your choice.
  resolver 1.1.1.1;

  set $swetrix_script_url https://swetrix.org/swetrix.js;
  set $swetrix_log_url https://api.swetrix.com/log;

  location = /script.js {
    proxy_pass $swetrix_script_url;
    proxy_set_header Host $host;
    proxy_buffering on;

    # Cache the script for 6 hours, as long as swetrix.org returns a valid response
    proxy_cache jscache;
    proxy_cache_valid 200 301 302 6h;
    proxy_cache_use_stale updating error timeout invalid_header http_500;
  }

  # Setting the path to /log is optional, you can replace it with anything you want, like /proxy, /endpoint, etc.
  # Some aggressive adblockers may block requests to paths like /analytics, /collect, /log, etc.
  location = /log {
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering                    on;
    proxy_pass_request_headers         on;
    proxy_pass $swetrix_log_url;
  }
}
```

## Update Swetrix tracking script configuration
After you updated your Nginx configuration, you need to update swetrix.js tracking script to send analytics data through your server. You can do it by setting the `apiURL` property inside the [init() function](/swetrix-js-reference#init).

```javascript
swetrix.init('YOUR_PROJECT_ID', {
  apiURL: 'https://<yourproxydomain>/log',
})
```
