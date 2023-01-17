---
title: Add tracking script to your website
slug: /install-script
---

import useBaseUrl from '@docusaurus/useBaseUrl';

To be able to use Swetrix on your website, you need to add a tracking script to your website and there are several ways on how to do it.

## Edit websites HTML code
The easiest way to add the tracking script to your website is to edit the HTML code of your website.
To do this, paste the following code snippet into the header section (`<head>` tag) of your website:

```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```

After you have added the code snippet, you also have to add the following code snippet into the end of the body section (`<body>` tag) of your website:

```html
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
It's very important not to forget to replace `YOUR_PROJECT_ID` with your actual project ID you can find in the Dashboard, otherwise tracking won't work!
:::

Done. Now you can start using Swetrix on your website.

## Install Swetrix via npm
If you are using a website that is based on a JavaScript framework, for example React or Vue, you can install Swetrix via npm and use it in your website.

To install Swetrix via npm, run the following command in your terminal:

```bash
npm install swetrix
```

Next you should import module into your project's root file (in React it's usually called `index.js` or `App.js`, and these files are located in the `src` folder):

```js
import * as Swetrix from 'swetrix'
```

After you can track anything you want. For example, the following code snippet will work just fine:

```js
Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()
```

## Integration with CMS or site builders
Sometimes it might be easier to install Swetrix without editing the HTML code of your website and this is the case for some CMS or site builders, for example WordPress or Wix.

We support a variety of different integrations and you can read more detailed information about it [here](integrations).