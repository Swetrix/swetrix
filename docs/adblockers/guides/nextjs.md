---
title: How to proxy Swetrix with Next.js
slug: /adblockers/guides/nextjs
---

You can use [Next.js](https://nextjs.org/) to proxy Swetrix analytics traffic via your domain.

## Setup Next.js rewrites rules
First, you need to add the following rules to the `next.config.js` file. If you don't already have it, you will need to [create it](https://nextjs.org/docs/pages/api-reference/next-config-js/rewrites) in your project's root directory first.
```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: "/sproxy",
        destination: "https://api.swetrix.com/log",
      },
    ];
  },
}
```

Instead of `/sproxy` route, you can use any other name. We recommend using a generic name or even just random letters to avoid being blocked by adblockers in the future.

:::note
Make sure you don't use `/log`, `/analytics`, `/analytics.js` or any similar name, because they're blocked by many adblockers by default.

If you are not using the [Swetrix NPM package](/install-script#install-swetrix-via-npm), you will need to add a similar rewrite rule for `https://swetrix.org/swetrix.js` script. Don't forget to also replace it with your proxy URL in the analytics `<script>` tag.
:::

## Update Swetrix tracking script configuration
After you set up Next.js redirect rules, you need to update swetrix.js tracking script to send analytics data through it. You can do it by setting the `apiURL` property inside the [init() function](/swetrix-js-reference#init).

```javascript
swetrix.init('YOUR_PROJECT_ID', {
  apiURL: 'https://<yourproxydomain>/sproxy',
})
```
