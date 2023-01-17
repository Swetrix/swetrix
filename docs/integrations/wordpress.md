---
title: Wordpress
slug: /wordpress-integration
---

After you sign up on Swetrix and create a new project, the only thing left is to add it to your website.

## Installation
1. Log in to your Wordpress account.
2. Install a plugin for adding the code to your HTML, for instance the [Insert Headers and Footers plugin](https://wordpress.org/plugins/insert-headers-and-footers).
3. Open up your project, go to the `Project Settings > Custom Code` section.

4. To the `Scripts in Header` section you need to add the following:
```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```

1. In the `Scripts in Footer` section you need to add the following:
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
