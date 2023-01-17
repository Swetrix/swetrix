---
title: Python Django
slug: /django-integration
---

After you sign up on Swetrix and create a new project, the only thing left is to add it to your website.

## Installation
1. Go to your Django website codebase and open up the .html templates folder. You need to add the Swetrix tracking script to the base template which is imported by all other templates via `{% extends 'base.html' %}`.
2. In the HTML `<head>` section you need to add the following:
```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```
3. In the `<body>` section you need to add the following:
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
