---
title: Tilda
slug: /tilda-integration
---

Integrate Swetrix with your Tilda website using the built-in custom code feature.

## Installation

### 1. Open site settings

1. Log in to your Tilda account and open the site you want to track.
2. Go to **Site Settings > More > HTML code**.

### 2. Add the Swetrix script

In the **Head section** field, paste the following to load the Swetrix library:

```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```

### 3. Add the initialisation snippet

In the **Before closing &lt;/body&gt; tag** field, paste the following to initialise tracking:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
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

### 4. Save and publish

Click **Save** and then **Publish** your site to apply the changes.

:::caution
Don't forget to replace `YOUR_PROJECT_ID` with your actual Project ID from the Swetrix dashboard, otherwise tracking won't work.
:::

## Check your installation

After publishing, open your Tilda site in a new tab (or an incognito window) and browse a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

:::tip
The tracking script only runs on your published site. You won't see analytics data while previewing pages inside the Tilda editor.
:::

## Optional: track custom events

You can use `swetrix.track()` to capture custom interactions — button clicks, form submissions, video plays, etc. Add any extra tracking calls in the same **Before closing &lt;/body&gt; tag** code block, after `swetrix.trackViews()`.

For example, to track form submissions:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.t-form')
    if (!form || typeof swetrix === 'undefined') return

    form.addEventListener('submit', function () {
      swetrix.track({ ev: 'form_submit' })
    })
  })
</script>
```

Refer to the [tracking script reference](/swetrix-js-reference) for the full list of options and functions available.

## Important considerations

- **Custom code location.** The site-wide HTML code fields apply the script to every page. If you only want to track specific pages, you can use Tilda's **HTML block** (T123) on individual pages instead.
- **Single-page navigation.** Some Tilda templates use AJAX-style page transitions. Swetrix's `trackViews()` handles this automatically via the History API, so no extra configuration is needed.
- **Testing.** Use your browser's developer console to confirm the script is loaded and check for JavaScript errors. Look for network requests to `api.swetrix.com` to verify data is being sent.
