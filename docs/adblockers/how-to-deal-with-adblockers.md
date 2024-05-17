---
title: How to deal with adblockers
slug: /adblockers/how-to
---

import useBaseUrl from '@docusaurus/useBaseUrl';

Swetrix is a privacy-first analytics tool, but some adblockers may still block it. In most cases, adblock maintainers don't want to take responsibility for deciding which services to block and which not to block, and we don't blame them. It's a big responsibility to maintain such ad block lists.

Nevertheless, Swetrix is an open source, privacy-focused, cookie-less web analytics service. We never sell, share or do anything nasty with your data, and we want to give you the choice to bypass ad blockers.

On average, [32% of users](https://backlinko.com/ad-blockers-users?ref=swetrix) use adblockers, but it depends on your site's audience (tech audiences tend to use adblockers much more). If you're not concerned about missing data, we recommend using one of our standard [integration guides](/integrations).

## How to proxy Swetrix
The most effective way to bypass ad blockers is to proxy the Swetrix script and calls to the Swetrix servers through this script.

A proxy is basically the mapping of our servers' URLs through your domain. So analytics requests will not be sent to `https://api.swetrix.com/log`, but instead to `https://<your domain>/path`.

The advantage of this approach is that your site will only make first-party requests, preventing them from being blocked by adblockers.

### How to proxy tracking script?
If you've installed [Swetrix using npm](/install-script#install-swetrix-via-npm), you don't need to proxy it as it's already bundled into your web application's code (but you still need to proxy our API, see one of the proxy guides below).

If you have installed Swetrix using our CDN (`swetrix.org/swetrix.js`), you will need to proxy it to bypass adblockers. Please refer to one of the guides below on how to do this.

### Managed proxy guides
 - [Netlify](/adblockers/guides/netlify)
 - [Nginx](/adblockers/guides/nginx)
