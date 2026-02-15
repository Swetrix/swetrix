---
title: Bubble.io
slug: /bubble-integration
---

Integrate Swetrix with your [Bubble.io](https://bubble.io/) application to track page views, monitor errors, and capture custom events — all without writing backend code.

Bubble lets you add custom scripts globally through its settings panel, making Swetrix integration straightforward even on the free plan.

## Installation

### 1. Open your app settings

1. Open your Bubble application in the editor.
2. Click **Settings** in the left-hand sidebar.
3. Select the **SEO / metatags** tab.

### 2. Add the Swetrix tracking script

Scroll down to **Script/meta tags in header** and paste the following snippet. This injects the script into the `<head>` of every page in your app:

```html
<script src="https://swetrix.org/swetrix.js" defer></script>
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

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### 3. Deploy to live

The script you added in the editor only takes effect on your live app after you deploy. Click **Deploy to live** (or use the **Deployment** menu) to publish the changes.

## Check your installation

Open your live Bubble app in a browser and navigate through a few pages. Within a minute you should see pageviews appearing in your Swetrix dashboard.

You can also open your browser's developer tools, switch to the **Network** tab, and confirm that `swetrix.js` loads successfully.

## Page view tracking in Bubble apps

Bubble applications behave like single-page applications (SPAs) — navigating between "pages" often swaps content without a full browser reload. Swetrix's `trackViews()` listens for History API changes, so page transitions that update the URL are tracked automatically.

There are a few scenarios to be aware of:

- **URL-based navigation** (the default for multi-page Bubble apps) — tracked automatically. No extra work needed.
- **Group-based navigation without URL changes** — if you show and hide groups on the same page without changing the URL, Swetrix only records the initial page load. To capture these "virtual" page views, trigger a manual pageview call (see [Manual page views](#manual-page-views) below).
- **Hash-based routing** — if your app uses URL hashes for navigation (e.g. `/#/dashboard`), enable hash tracking in the init options:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews({ hash: true })
  })
</script>
```

### Manual page views

If your Bubble app navigates between views without changing the URL, you can fire a pageview manually when a group becomes visible. Use a **Run JavaScript** workflow action:

```javascript
if (typeof swetrix !== 'undefined') {
  swetrix.pageview({
    payload: {
      pg: '/your-virtual-page',
    },
  })
}
```

Replace `'/your-virtual-page'` with a descriptive path for the view (e.g. `'/pricing'`, `'/signup'`).

## Error tracking

Enable automatic client-side error monitoring by adding `trackErrors()` to the initialisation snippet in **Settings > SEO / metatags**:

```html
<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
    swetrix.trackErrors()
  })
</script>
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you measure specific user interactions — button clicks, form submissions, signup completions, and more. In Bubble, you track these by running JavaScript from a workflow.

### Setting up the "Run JavaScript" action

Bubble doesn't include a built-in JavaScript action by default. You need the free **Toolbox** plugin:

1. In the Bubble editor, go to **Plugins > Add plugins**.
2. Search for **Toolbox** and install it.
3. You'll now have access to the **Run JavaScript** workflow action.

### Creating an event workflow

1. Open the **Workflow** tab.
2. Create a new workflow triggered by the interaction you want to track (e.g. **When Button "Sign Up" is clicked**).
3. Add a **Run JavaScript** action and paste your tracking code:

```javascript
if (typeof swetrix !== 'undefined') {
  swetrix.track({
    ev: 'SIGNUP_CLICKED',
  })
}
```

### Passing dynamic data

Bubble lets you insert dynamic expressions into the JavaScript action. You can use this to attach contextual metadata:

```javascript
if (typeof swetrix !== 'undefined') {
  swetrix.track({
    ev: 'ITEM_ADDED_TO_CART',
    meta: {
      item_name: 'DYNAMIC_ITEM_NAME',
      category: 'DYNAMIC_CATEGORY',
    },
  })
}
```

Replace the placeholder strings with Bubble's **Insert dynamic data** feature inside the Run JavaScript editor — Bubble will substitute them with actual values at runtime.

:::tip
You can pass up to 20 metadata keys per event. Values are converted to strings and the combined length of all values must be under 1,000 characters. See the [tracking script reference](/swetrix-js-reference#track) for full details.
:::

### Event naming rules

Event names must:

- Contain any characters (including spaces, unicode, etc.)
- Be no longer than 256 characters

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `SIGNUP_CLICKED`, `ITEM_ADDED_TO_CART`).

### Example: tracking a form submission

```javascript
if (typeof swetrix !== 'undefined') {
  swetrix.track({
    ev: 'CONTACT_FORM_SUBMITTED',
    meta: {
      page: window.location.pathname,
    },
  })
}
```

### Example: tracking a purchase

```javascript
if (typeof swetrix !== 'undefined') {
  swetrix.track({
    ev: 'PURCHASE_COMPLETED',
    meta: {
      plan: 'DYNAMIC_PLAN_NAME',
      price: 'DYNAMIC_PRICE',
    },
  })
}
```

## Troubleshooting

### Script not loading

- Make sure you pasted the snippet into **Settings > SEO / metatags > Script/meta tags in header**, not into a page element.
- Verify that you deployed the latest version to live — editor preview may not always include header scripts.
- Check the browser developer console for Content Security Policy (CSP) errors. If your Bubble app uses a custom domain with strict CSP headers, you may need to allow `swetrix.org` and `api.swetrix.com`.

### Page views not appearing

- Confirm you replaced `YOUR_PROJECT_ID` with your real project ID.
- Disable browser extensions (like ad blockers) that may block analytics scripts, then reload.
- If your app navigates without URL changes, Swetrix won't detect new pages automatically — use the [manual page view](#manual-page-views) approach.

### Custom events not tracking

- Ensure the **Toolbox** plugin is installed and the **Run JavaScript** action is available in your workflows.
- Wrap your tracking calls in `if (typeof swetrix !== 'undefined')` to avoid errors if the script hasn't loaded yet.
- Check the **Custom events** section in your Swetrix dashboard — events may take a moment to appear.

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
- [Bubble.io documentation](https://manual.bubble.io/) — official Bubble docs.
