---
title: Drupal
slug: /drupal-integration
---

Integrate Swetrix with your Drupal site to get privacy-friendly, GDPR-compliant analytics. Works with Drupal 9, 10, and 11.

## Installation

There are two ways to add Swetrix to Drupal: by editing your **theme's Twig template** (recommended if you maintain a custom theme) or by using the **Asset Injector** module (no code editing required).

### Method 1: Theme template (recommended)

This approach adds the tracking script directly to the HTML output through your theme's layout template.

#### 1. Locate the template file

In your active custom theme, find the file responsible for the page's HTML shell:

```
themes/custom/your_theme/templates/layout/html.html.twig
```

If your theme doesn't override this template yet, copy it from Drupal core as a starting point:

```
core/themes/stable9/templates/layout/html.html.twig
```

:::tip
Always use a **custom or sub-theme** for template overrides. Editing a contributed theme directly means your changes will be lost on the next theme update.
:::

#### 2. Add the tracking snippet

Open `html.html.twig` and paste the following just before the closing `</body>` tag:

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

The template usually ends with something like this:

```twig
    <js-bottom-placeholder token="{{ placeholder_token }}">
  </body>
</html>
```

Place the Swetrix snippet between the `<js-bottom-placeholder>` line and the `</body>` tag.

:::caution
Don't forget to replace `YOUR_PROJECT_ID` with your actual Project ID from the Swetrix dashboard, otherwise tracking won't work.
:::

#### 3. Clear Drupal's cache

Drupal caches rendered templates aggressively, so you need to rebuild the cache before your changes take effect.

**From the admin UI:**
Go to **Administration > Configuration > Development > Performance** (`/admin/config/development/performance`) and click **Clear all caches**.

**From the command line (Drush):**

```bash
drush cr
```

### Method 2: Asset Injector module

If you'd rather not touch theme files, the [Asset Injector](https://www.drupal.org/project/asset_injector) module lets you add JavaScript through the admin UI.

#### 1. Install and enable the module

```bash
composer require drupal/asset_injector
drush en asset_injector -y
drush cr
```

Or download it from [drupal.org/project/asset_injector](https://www.drupal.org/project/asset_injector) and enable it under **Administration > Extend** (`/admin/modules`).

#### 2. Create a JS injector

1. Go to **Administration > Configuration > Development > Asset Injector** (`/admin/config/development/asset-injector`).
2. Click **JS Injector**, then **+ Add JS Injector**.
3. Fill in the following:
   - **Label:** Swetrix Analytics
   - **Code:**

```javascript
(function () {
  var s = document.createElement('script')
  s.src = 'https://swetrix.org/swetrix.js'
  s.defer = true
  s.onload = function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
  }
  document.head.appendChild(s)
})()
```

4. Under **Conditions**, leave the pages field empty so the script runs on every page (or restrict it to specific paths if needed).
5. Click **Save**.

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the Swetrix dashboard.
:::

#### 3. Clear caches

Clear Drupal's cache as described above so the injected script is served to visitors.

#### Adding the noscript fallback

Asset Injector handles JavaScript only. To include the `<noscript>` image fallback for visitors without JavaScript, add a small `html.html.twig` override or use a module like [Add to Head](https://www.drupal.org/project/add_to_head) to insert the following into your pages:

```html
<noscript>
  <img
    src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
    alt=""
    referrerpolicy="no-referrer-when-downgrade"
  />
</noscript>
```

This step is optional — the vast majority of visitors will have JavaScript enabled.

## Tracking custom events

Once basic page tracking is running, you can use `swetrix.track()` to record interactions like form submissions, button clicks, or downloads. Refer to the [tracking script reference](/swetrix-js-reference) for the full API.

Example — tracking a Webform submission:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.webform-submission-form')
    if (!form || typeof swetrix === 'undefined') return

    form.addEventListener('submit', function () {
      swetrix.track({ ev: 'webform_submitted' })
    })
  })
</script>
```

## Troubleshooting

### Script not appearing on the site

- If you used the theme template method, make sure you edited the correct theme — check which theme is active under **Administration > Appearance**.
- Clear all Drupal caches after every change.
- View the page source in your browser and search for `swetrix` to confirm the snippet is present.

### Twig template not picked up

Drupal uses a strict template naming and directory convention. If your template override isn't loading:

- Verify the file is in `templates/layout/` within your custom theme directory.
- Ensure Twig debugging is enabled during development so you can see which templates are being used. In `sites/default/services.yml`, set `twig.config.debug: true`, then clear caches.

### Caching and CDN

If your site uses Drupal's Internal Page Cache, Varnish, or a CDN:

- Clear those caches as well after adding the snippet.
- The Swetrix script loads client-side, so page caching works fine once the HTML contains the tracking snippet.

### Content Security Policy (CSP)

If your site sends a strict Content Security Policy header, you'll need to allow the Swetrix domains:

- **script-src:** `https://swetrix.org`
- **connect-src:** `https://api.swetrix.com`
- **img-src:** `https://api.swetrix.com` (for the noscript fallback)

## Check your installation

Visit your live Drupal site and navigate through a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.
