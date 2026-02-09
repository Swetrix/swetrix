---
title: BigCommerce
slug: /bigcommerce-integration
---

Integrate Swetrix with your BigCommerce store to track page views, monitor user behaviour, and capture key e-commerce events like purchases.

## Installation

BigCommerce's built-in **Script Manager** is the simplest way to add external scripts without editing theme files.

### 1. Open Script Manager

1. Log in to your BigCommerce admin panel.
2. Navigate to **Storefront > Script Manager**.
3. Click **Create a Script**.

### 2. Add the Swetrix tracking script

Fill in the script settings as follows:

| Setting           | Value                   |
| ----------------- | ----------------------- |
| Name              | Swetrix Analytics       |
| Description       | Swetrix tracking script |
| Placement         | **Head**                |
| Location          | **All pages**           |
| Script category   | **Analytics**           |
| Script type       | **Script**              |

In the **Script contents** box, paste:

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

### 3. Save

Click **Save** to activate the script across your store.

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the Swetrix dashboard, otherwise tracking won't work.
:::

## Check your installation

Visit your storefront and browse a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

If nothing shows up, open your browser's developer console and confirm the Swetrix script is loading without errors.

## Tracking e-commerce events

Beyond basic page views, you can track key e-commerce interactions as custom events by creating additional scripts in Script Manager. These use Swetrix's `swetrix.track()` function with the `meta` parameter to attach event context.

You can view these events and their metadata in the **Custom events** section of your Swetrix dashboard. Refer to the [tracking script reference](/swetrix-js-reference) for full API details.

:::note
BigCommerce uses [Handlebars templating](https://developer.bigcommerce.com/docs/storefront/stencil/themes/context/handlebars-reference). The `{{double curly brace}}` syntax in the snippets below is processed server-side by BigCommerce to inject dynamic store data — it is not JavaScript template literal syntax.
:::

### Purchase completed

Track confirmed purchases on the order confirmation page by creating a second script in Script Manager.

1. In **Storefront > Script Manager**, click **Create a Script**.
2. Configure it with these settings:

| Setting           | Value                      |
| ----------------- | -------------------------- |
| Name              | Swetrix Purchase Tracking  |
| Description       | Tracks completed purchases |
| Placement         | **Footer**                 |
| Location          | **Order Confirmation**     |
| Script category   | **Analytics**              |
| Script type       | **Script**                 |

3. In the **Script contents** box, paste:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof swetrix === 'undefined') return

    {{#if checkout.order}}
    swetrix.track({
      ev: 'purchase',
      meta: {
        order_id: '{{checkout.order.id}}',
        total: '{{checkout.subtotal.value}}',
        currency: '{{checkout.currency.code}}'
      }
    })
    {{/if}}
  })
</script>
```

4. Click **Save**.

The `{{#if checkout.order}}` Handlebars block ensures the event only fires when valid order data is present.

:::tip
Test by placing a small test order and checking the **Custom events** section in your Swetrix dashboard. You should see a `purchase` event with the order metadata.
:::

## Troubleshooting

### Script not loading

- Open **Script Manager** and make sure the script's status is enabled.
- Clear your store's cache: go to **Server Settings > Store-level caching** and click **Purge cache**.
- Check the browser developer console for errors. A Content Security Policy (CSP) may be blocking the external script — contact BigCommerce support if you see CSP-related errors.

### Page views not appearing

- Confirm you replaced `YOUR_PROJECT_ID` with your real project ID.
- Check that **Location** is set to **All pages**, not a specific page type.
- Disable any browser extensions (like ad blockers) that may be blocking analytics scripts, then reload.

### Purchase events not tracking

- Verify the purchase script's **Location** is set to **Order Confirmation** — other locations won't have access to the `checkout` Handlebars object.
- Complete a real test order. BigCommerce does not render the order confirmation page in preview mode.
- Make sure the Handlebars variable names (`checkout.order.id`, `checkout.subtotal.value`, `checkout.currency.code`) match your BigCommerce version and storefront setup. Check BigCommerce's [Stencil documentation](https://developer.bigcommerce.com/docs/storefront/stencil/themes/context/object-reference/schemas) for the available objects on the order confirmation page.

## Important considerations

- **Script Manager vs. theme files.** Script Manager is the recommended approach because scripts persist across theme changes. If you edit Stencil theme templates directly instead, your changes will be overwritten when you update or switch themes.
- **Handlebars context.** Not all Handlebars objects are available on every page. The `checkout` object is only accessible on the order confirmation page. If you attempt to reference it elsewhere, the template will silently output nothing.
- **Testing.** After adding each script, use your browser's developer console to verify there are no JavaScript errors, and check that events appear in your Swetrix dashboard.
