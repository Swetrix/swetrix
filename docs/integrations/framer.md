---
title: Framer
slug: /framer-integration
---

import useBaseUrl from '@docusaurus/useBaseUrl';

After you sign up on Swetrix and create a new project, the only thing left is to add it to your website.

## Installation
1. Log in to your [Framer](https://www.framer.com) account.
   
2. In the dashboard, click on the website you want to add Swetrix to:
<img alt="Framer Dashboard" src={useBaseUrl('img/framer-1.png')} />

3. Open the website settings:
<img alt="Framer Website page" src={useBaseUrl('img/framer-2.png')} />

4. Scroll down to the `Custom Code` section:
<img alt="Framer Website page" src={useBaseUrl('img/framer-2.png')} />

5. Add the following code to the `End of <body> tag` section:
```html
<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
  })
</script>

<noscript>
  <img
    src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
    alt=""
    referrerpolicy="no-referrer-when-downgrade"
  />
</noscript>
```

:::caution
It's important to remember to replace `YOUR_PROJECT_ID` with your actual Project ID, which you can find in the Swetrix Dashboard, otherwise tracking will not work!
:::

## Check your installation
After installing Swetrix tracking script, go to your website and visit some pages.

Within a minute you should be able to see new pageviews being added to your project's dahsboard.
