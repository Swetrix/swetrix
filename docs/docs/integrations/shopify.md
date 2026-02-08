---
title: Shopify
slug: /shopify-integration
---

Integrate Swetrix with your Shopify store to track page views, monitor user behaviour, and capture key e-commerce events like product views, add-to-cart actions, and purchases.

## Installation

### 1. Add the Swetrix script to your theme

1. In your Shopify admin, go to **Online Store > Themes**.
2. Next to your active theme, click the **three-dot menu** (⋯) and select **Edit code**.
3. In the **Layout** folder, open `theme.liquid`.
4. Just before the closing `</head>` tag, paste the following:

```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```

5. Just before the closing `</body>` tag, paste the initialisation script:

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

6. Click **Save**.

:::caution
Don't forget to replace `YOUR_PROJECT_ID` with your actual Project ID from the Swetrix dashboard, otherwise tracking won't work.
:::

:::note
Theme updates may overwrite your changes. If you update your theme, check that the Swetrix snippet is still present in `theme.liquid`. Duplicating your theme before updating is a good precaution.
:::

## Check your installation

After adding the script, visit your store and browse a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Tracking e-commerce events

Beyond basic page views, you can track key e-commerce interactions as custom events. This involves adding small Liquid and JavaScript snippets to your theme files.

:::tip
Always **back up your theme** before editing code. If you're not comfortable with Liquid templates, consider working with a Shopify developer.
:::

The snippets below use Swetrix's `swetrix.track()` function with the `meta` parameter to attach event context. You can view these events and their metadata in the **Custom events** section of your Swetrix dashboard. Refer to the [tracking script reference](/swetrix-js-reference) for full API details.

### 1. Product viewed

Track when a visitor views a product page.

Open your product template (commonly `sections/main-product.liquid` or `templates/product.liquid`) and add the following near the end of the file:

```html
{% raw %}
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof swetrix !== 'undefined') {
      var product = {{ product | json }};
      var variant = {{ product.selected_or_first_available_variant | json }};
      var currency = {{ cart.currency.iso_code | json }};

      swetrix.track({
        ev: 'product_viewed',
        meta: {
          name: product.title,
          sku: variant.sku || String(variant.id),
          variant: variant.title === 'Default Title' ? '' : variant.title,
          price: String(parseFloat(variant.price) / 100),
          currency: currency
        }
      })
    }
  })
</script>
{% endraw %}
```

### 2. Added to cart

Tracking add-to-cart clicks. The exact selector may vary depending on your theme — adjust it if your "Add to Cart" button or form uses different markup.

Add this script to your product template, below the product viewed snippet:

```html
{% raw %}
<script>
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('form[action="/cart/add"]');
    if (!form || typeof swetrix === 'undefined') return;

    form.addEventListener('submit', function () {
      var product = {{ product | json }};
      var variant = {{ product.selected_or_first_available_variant | json }};
      var currency = {{ cart.currency.iso_code | json }};
      var qtyInput = form.querySelector('[name="quantity"]');
      var qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

      swetrix.track({
        ev: 'added_to_cart',
        meta: {
          name: product.title,
          sku: variant.sku || String(variant.id),
          variant: variant.title === 'Default Title' ? '' : variant.title,
          price: String(parseFloat(variant.price) / 100),
          currency: currency,
          quantity: String(qty)
        }
      })
    })
  })
</script>
{% endraw %}
```

:::note
Many Shopify themes add items to the cart via AJAX without a full page reload. If yours does, the `submit` listener above may not fire. In that case you'll need to hook into your theme's JavaScript cart events or use a [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to detect cart changes.
:::

### 3. Checkout started

Shopify redirects users to `checkout.shopify.com` for the checkout flow, so direct script injection into checkout pages is limited. A practical approach is to track clicks on your "Checkout" button.

Open your cart template (commonly `sections/main-cart-items.liquid` or `templates/cart.liquid`) and add:

```html
{% raw %}
<script>
  document.addEventListener('DOMContentLoaded', function () {
    var checkoutBtn = document.querySelector('[name="checkout"]')
      || document.querySelector('form[action$="/checkout"] [type="submit"]');
    if (!checkoutBtn || typeof swetrix === 'undefined') return;

    checkoutBtn.addEventListener('click', function () {
      var cart = {{ cart | json }};

      swetrix.track({
        ev: 'checkout_started',
        meta: {
          currency: cart.currency,
          total: String(parseFloat(cart.total_price) / 100),
          item_count: String(cart.item_count)
        }
      })
    })
  })
</script>
{% endraw %}
```

### 4. Purchase completed

Track confirmed purchases on the Shopify "Thank you" (order status) page.

1. In your Shopify admin, go to **Settings > Checkout**.
2. Scroll down to the **Order status page** section.
3. In the **Additional scripts** box, paste:

```html
{% raw %}
{% if first_time_accessed %}
<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')

    var checkout = {{ checkout | json }};

    swetrix.track({
      ev: 'purchase',
      meta: {
        order_id: String(checkout.order_number),
        total: String(parseFloat(checkout.total_price)),
        tax: String(parseFloat(checkout.tax_price)),
        shipping: String(parseFloat(checkout.shipping_price)),
        currency: checkout.currency,
        items: String(checkout.line_items.length)
      }
    })
  })
</script>
{% endif %}
{% endraw %}
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual project ID. The order status page is hosted on a different domain, so the Swetrix script needs to be loaded again here.
:::

The `{% raw %}{% if first_time_accessed %}{% endraw %}` wrapper ensures the purchase event only fires once, preventing duplicate tracking if the customer refreshes the page.

## Important considerations

- **Prices are in cents.** Most Shopify Liquid price values (like `variant.price` or `cart.total_price`) are in the store's smallest currency unit. Divide by 100 to get the decimal value. The exception is values on the `checkout` object on the order status page, which are already in decimal format.
- **Theme differences.** Liquid object paths and HTML structure vary between themes. You may need to adjust selectors (e.g. `form[action="/cart/add"]`) or Liquid references to match your theme.
- **AJAX carts.** Drawer-style or pop-up carts that update without a page reload require theme-specific JavaScript hooks rather than simple form submit listeners.
- **Shopify Customer Events.** For a more reliable approach that doesn't depend on DOM manipulation, consider [Shopify Customer Events](https://shopify.dev/docs/api/web-pixels-api). You can subscribe to standard events like `product_viewed` and `checkout_completed`, then forward data to Swetrix using `swetrix.track()` from within a custom pixel.
- **Testing.** After adding each snippet, use your browser's developer console to check for JavaScript errors, and verify that events appear in your Swetrix dashboard.
