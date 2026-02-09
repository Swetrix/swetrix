---
title: PrestaShop
slug: /prestashop-integration
---

Integrate Swetrix with your PrestaShop store to get privacy-friendly, GDPR-compliant analytics and track e-commerce events like purchases.

## Installation

There are two ways to add Swetrix to PrestaShop: through the **Back Office** using a free module, or by editing your **theme template** directly.

### Method 1: Custom HTML module

This approach doesn't require editing theme files and works across PrestaShop versions.

#### 1. Install a custom code module

PrestaShop doesn't have a built-in "paste HTML into head" feature like some other platforms. Install a free module that lets you inject custom code:

1. Log in to your **PrestaShop Back Office**.
2. Go to **Modules > Module Manager**.
3. Search for a module like **Custom code** or **Custom JS & CSS** in the marketplace, or install one manually.
4. Enable the module and open its configuration.

#### 2. Add the tracking snippet

In the module's configuration, add the following code to the **header** (`<head>`) section:

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

3. Save the module configuration.

:::caution
Don't forget to replace `YOUR_PROJECT_ID` with your actual Project ID from the Swetrix dashboard, otherwise tracking won't work.
:::

### Method 2: Edit the theme template

If you prefer to add the script directly to your theme files, you can edit the main layout template.

#### 1. Open the layout file

1. Connect to your server via FTP or your hosting file manager.
2. Navigate to your active theme's template directory:
   - **PrestaShop 1.7+:** `themes/<your-theme>/templates/_partials/head.tpl`
   - **PrestaShop 8.x:** Same path — `themes/<your-theme>/templates/_partials/head.tpl`

#### 2. Add the tracking snippet

Paste the following just before the closing `</head>` section (or at the end of `head.tpl`):

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

3. Save the file.

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the Swetrix dashboard.
:::

:::note
Always use a **child theme** when editing template files. Changes to the parent theme will be lost when you update PrestaShop or the theme. To create a child theme, copy your theme folder, rename it, and update the `theme.yml` file with the new name and parent reference.
:::

## Check your installation

After adding the script, visit your store and browse a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

If you don't see data, open your browser's developer tools (F12), check the **Console** tab for errors, and look in the **Network** tab for requests to `api.swetrix.com`.

## Tracking e-commerce events

Beyond basic page views, you can track purchases and other e-commerce interactions as custom events using `swetrix.track()`. You can view these events and their metadata in the **Custom events** section of your Swetrix dashboard. Refer to the [tracking script reference](/swetrix-js-reference) for full API details.

:::tip
Always **back up your theme** before editing template files.
:::

### Track purchases

To track completed orders, add a script to PrestaShop's order confirmation page. Edit the file `themes/<your-theme>/templates/checkout/order-confirmation.tpl` and add the following near the end:

```html
{literal}
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof swetrix === 'undefined') return
{/literal}

{if isset($order)}
    swetrix.track({
      ev: 'purchase',
      meta: {
        order_id: '{$order.details.reference}',
        total: '{$order.totals.total.amount}',
        currency: '{$order.totals.total.value|regex_replace:"/[^A-Z]/":""}',
        items: '{$order.products|count}'
      }
    })
{/if}

{literal}
  })
</script>
{/literal}
```

PrestaShop uses the **Smarty** templating engine. The `{$variable}` syntax is processed server-side to inject order data, while `{literal}` blocks prevent Smarty from trying to parse the JavaScript code.

:::note
The exact Smarty variables may differ depending on your PrestaShop version and theme. Check your theme's existing `order-confirmation.tpl` to see which variables are available.
:::

### Track add-to-cart actions

To track when a visitor adds a product to their cart, add a script to your product page template (`themes/<your-theme>/templates/catalog/product.tpl`):

```html
{literal}
<script>
  document.addEventListener('DOMContentLoaded', function () {
    var addToCartBtn = document.querySelector('.add-to-cart')
    if (!addToCartBtn || typeof swetrix === 'undefined') return

    addToCartBtn.addEventListener('click', function () {
      var nameEl = document.querySelector('h1[itemprop="name"]')
      var priceEl = document.querySelector('[itemprop="price"]')
      var qtyInput = document.querySelector('#quantity_wanted')

      swetrix.track({
        ev: 'added_to_cart',
        meta: {
          name: nameEl ? nameEl.textContent.trim() : '',
          price: priceEl ? priceEl.getAttribute('content') || priceEl.textContent.trim() : '',
          quantity: qtyInput ? qtyInput.value : '1'
        }
      })
    })
  })
</script>
{/literal}
```

:::note
The `.add-to-cart` selector is standard in PrestaShop's default themes (Classic and similar). If your theme uses a different class or structure, adjust the selector to match your "Add to Cart" button.
:::

## Troubleshooting

### Script not loading

- **Clear PrestaShop cache:** Go to **Advanced Parameters > Performance** and click **Clear cache**.
- **Disable JavaScript optimisation:** If you're using CCC (Combine, Compress, Cache) for JavaScript, temporarily disable it under **Advanced Parameters > Performance** to rule out conflicts.
- **Check the page source:** Right-click on your store, select "View Page Source", and search for `swetrix` to confirm the script is present.

### Theme updates overwriting changes

Always use a child theme when editing template files. Changes to the parent theme are lost when you update. If you're using a module to inject the code, your snippet will persist through theme updates.

### E-commerce events not tracking

- **Smarty variables:** Verify that the Smarty variables (like `{$order.details.reference}`) match your PrestaShop version. Place a test order and check if the values are populated correctly by inspecting the rendered HTML source on the confirmation page.
- **Console errors:** Open the browser console (F12) and look for JavaScript errors on the order confirmation page.
- **Test with a real order:** PrestaShop's order confirmation page only renders properly after an actual checkout. Use a test payment method to complete a full purchase flow.

### Module conflicts

Some PrestaShop modules that optimise or defer JavaScript can interfere with the tracking script. If Swetrix isn't loading:

1. Temporarily disable JavaScript optimisation modules.
2. Check if the issue resolves.
3. If so, configure the module to exclude `swetrix.org/swetrix.js` from its processing.
