---
title: Add tracking script to your website
slug: /install-script
---

import useBaseUrl from '@docusaurus/useBaseUrl';

To use Swetrix on your website, you need to add a tracking script to your website and there are several ways to do this.

## Edit the website's HTML code
The easiest way to add the tracking script to your website is to edit the HTML code of your website.
To do this, paste the following code snippet into the Body section (`<body>` tag). You have to place the script within the `<body>...</body>` tags.

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
It's important to remember to replace `YOUR_PROJECT_ID` with your actual Project ID, which you can find in the Dashboard, otherwise tracking will not work!
:::

Done. Now you can start using Swetrix on your website.

## Install Swetrix via npm
If you are using a website based on a JavaScript framework such as React or Vue, you can install Swetrix via npm and use it on your website.

To install Swetrix using npm, run the following command in your terminal:

```bash
npm install swetrix
```

Next, you should import the module into your project's root file (in React this is usually called `index.js` or `App.js`, and these files are located in the `src` folder):

```js
import * as Swetrix from 'swetrix'
```

After that you can track anything you want. For example, the following code snippet will work just fine:

```js
Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()
```

## Integration with CMS or site builders
Sometimes it may be easier to install Swetrix without editing the HTML code of your website and this is the case with some CMS or site builders, for example WordPress or Wix.

We support a number of different integrations and you can read more about them [here](integrations).
