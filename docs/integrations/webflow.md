---
title: Webflow
slug: /webflow-integration
---

import useBaseUrl from '@docusaurus/useBaseUrl';

After you sign up on Swetrix and create a new project, the only thing left is to add it to your website.

## Installation
1. Log in to your Webflow account.
   
2. Open up your project, go to the `Project Settings > Custom Code` section:
<img alt="Webflow screenshot" src={useBaseUrl('img/webflow-int.png')} />

3. In the `Head code` section you need to add the following:
```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```

4. In the `Footer code` section you need to add the following:
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

:::caution
It's very important not to forget to replace `YOUR_PROJECT_ID` with your actual Project ID you can find in the Dashboard, otherwise tracking won't work!
:::

## Check your installation
After installing Swetrix tracking script, go to your website and visit some pages.

Within a minute you should be able to see new pageviews being added to your project's dahsboard.

:::info
Custom scripts will only appear on the published Webflow site.
:::