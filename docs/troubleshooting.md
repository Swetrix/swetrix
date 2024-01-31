---
title: Troubleshooting
slug: /troubleshooting
---

import useBaseUrl from '@docusaurus/useBaseUrl';

After you [installed](/install-script) the Swetrix tracking script on your website, you should check if the integration is working properly. Visit your Swetrix dashboard, if you see the charts and numbers, then everything is working as expected. Enjoy!

But if there is no data to display, or your visit is not counted, there might be something wrong with your integration. Read below to find out how to troubleshoot the most common issues.

## Check if the script is installed correctly

The first thing you should do is to check if the script is installed correctly. You can do this by opening the developer tools in your browser and checking the console for any errors.

You should also check the "Network" tab to see if the script is loaded correctly and if it sends any requests to the Swetrix servers.

1. Open the website you installed Swetrix script on.
2. Open the developer tools in your browser, you can do this by pressing `F12` for Chrome and Firefox, or `Ctrl + Shift + C` for Safari (alternatively, right-click anywhere on the page and press the "Inspect" button).
3. Click on the "Network" tab in the developer tools (it will be empty at first, so you need to reload the page).
4. Search for `swetrix` related requests in the list of requests. You should see a bunch of POST requests to `api.swetrix.com`, and the status of these requests should be `201`.

<img alt="Browser Network tab" src={useBaseUrl('img/swetrix-network-tab.png')} />

## Visits are not appearing in the Dashboard
Don't worry if you don't see any visits in the dashboard right away. There may be a small delay (up to 1 minute) before they appear. That's because we cache the data for a short period of time to reduce the load on our servers, instead of sending it to the database right away.

In case you don't see any visits even after a delay, make sure you don't have an ad-blocker or a similar extension active, as it may interfere with the script. Try visiting your website in a different browser or device to see if the issue persists.

## Common issues and how to fix them
 - **Make sure that you entered a correct Project ID in the script configuration**. Sometimes mistype their Project IDs in the integration or use the wrong ID (for example, an API key). You can find your Project ID on the Project Settings page in dashboard.
 - **Did you set up Content Security Policy (CSP) on your site?**. If you did, make sure to add Swetrix to the list of allowed domains. The simplest way to do this is `Content-Security-Policy: default-src 'self' *.swetrix.com *.swetrix.org`, but we recommend you to read more about CSP and set it up properly.
 - **Are you testing your integration on localhost?**. By default, Swetrix doesn't track any events on localhost to prevent developers from polluting their data with test events. If you want to test your integration on localhost, you can enable the `devMode` option in the [script configuration](/swetrix-js-reference#init).
 - **Do you use caching on your site?**. Make sure to purge the cache after you install Swetrix script, to ensure you're loading the latest version of your site.
 - **Did you set up allowed domains in the Project settings?**. If you did, you might have misspelled your domain name or added a `www.` prefix to it while your site does not use it (or vice versa).
 - **You might be using an SPA or a similar framework**. You might have set up the script inproperly. Generally, we recommend using [Swetrix via NPM](/install-script#install-swetrix-via-npm) for such application.
