---
title: Wix
slug: /wix-integration
---

After you sign up on Swetrix and create a new project, the only thing left is to add it to your website.

## Installation
1. Log in to your Wix account.
2. Go to the Settings page on your Wix site dashboard.
3. Click on the `Custom Code` tab under `Advanced Settings`.
4. Click on Add `Custom Code` at the top right.
5. Paste the following Swetrix snippet:
```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```
6. Give it a name so that you can easily recognize this snippet later.
7. Select `All pages` under "Add Code to Pages" to track all pages on your website. Leave the default option Load once if asked.
8. Select `Head` when asked where to place the code snippet.
9. Click `Apply`.
10. Repeat all the steps above, but this time paste the following script:
```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
  })
</script>

<noscript>
  <img src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID" alt="" referrerpolicy="no-referrer-when-downgrade" />
</noscript>
```
10. Select `Body - end` when asked where to place the code snippet.
10. Click `Apply` again, and done!

:::caution
It's very important not to forget to replace `YOUR_PROJECT_ID` with your actual Project ID you can find in the Dashboard, otherwise tracking won't work!
:::

## Check your installation
After installing Swetrix tracking script, go to your website and visit some pages.

Within a minute you should be able to see new pageviews being added to your project's dahsboard.