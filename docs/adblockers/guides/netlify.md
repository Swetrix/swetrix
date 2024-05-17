---
title: How to proxy Swetrix with Netlify
slug: /adblockers/guides/netlify
---

You can use [Netlify redirects](https://docs.netlify.com/routing/redirects/) to proxy Swetrix analytics traffic via your domain.

## Setup Netlify rewrites rules
First, you need to add the following rules to the `_redirects` file. If you don't already have it, you will need to [create it](https://docs.netlify.com/routing/redirects/rewrites-proxies/) first.
```
/script.js https://swetrix.org/swetrix.js 200
/sproxy https://api.swetrix.com/log 200
```

Instead of `/script.js` and `/sproxy` routes, you can use any other name. We recommend using a generic name or even just random letters to avoid being blocked by adblockers in the future.

:::note
Make sure you don't use `/log`, `/analytics`, `/analytics.js` or any similar name, because they're blocked by many adblockers by default.
:::

## Update Swetrix tracking script configuration
After you set up Netlify redirect rules, you need to update swetrix.js tracking script to send analytics data through it. You can do it by setting the `apiURL` property inside the [init() function](/swetrix-js-reference#init).

```javascript
swetrix.init('YOUR_PROJECT_ID', {
  apiURL: 'https://<yourproxydomain>/sproxy',
})
```

:::note
If you are not using the [Swetrix NPM package](/install-script#install-swetrix-via-npm), don't forget to also replace `https://swetrix.org/swetrix.js` with your proxy URL in the analytics `<script>` tag.
:::
