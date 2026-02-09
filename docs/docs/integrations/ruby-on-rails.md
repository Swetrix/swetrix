---
title: Ruby on Rails
slug: /ruby-on-rails-integration
---

Integrate Swetrix with your [Ruby on Rails](https://rubyonrails.org/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

This guide covers both traditional multi-page Rails apps and modern setups using **Turbo** (the default in Rails 7+).

## Installation

The recommended approach is to add the Swetrix tracking script to your application layout so it loads on every page.

### 1. Add the tracking script to your layout

Open `app/views/layouts/application.html.erb` and add the Swetrix script inside the `<head>` tag, and the initialisation snippet before the closing `</body>` tag:

```html
<!DOCTYPE html>
<html>
<head>
  <title><%= content_for(:title) || "My App" %></title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <%= csrf_meta_tags %>
  <%= csp_meta_tag %>
  <%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>
  <%= javascript_importmap_tags %>

  <!-- Swetrix Analytics -->
  <script src="https://swetrix.org/swetrix.js" defer></script>
</head>
<body>
  <%= yield %>

  <!-- Swetrix Analytics -->
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
</body>
</html>
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### 2. Disable tracking in development (recommended)

To avoid polluting your analytics with local page views, wrap the snippet in an environment check so it only loads in production:

```erb
<% if Rails.env.production? %>
  <script src="https://swetrix.org/swetrix.js" defer></script>
<% end %>
```

And for the body initialisation:

```erb
<% if Rails.env.production? %>
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
<% end %>
```

:::tip
During development, Swetrix ignores `localhost` traffic by default. If you want to verify tracking locally without changing your environment, you can temporarily set `devMode: true`:

```js
swetrix.init('YOUR_PROJECT_ID', { devMode: true })
```

Remember to remove this before deploying.
:::

## Turbo support (Rails 7+)

Rails 7 and later ship with [Turbo](https://turbo.hotwired.dev/) by default. Turbo intercepts link clicks and form submissions, performing navigations without full page reloads. This means the `DOMContentLoaded` event only fires once, on the initial page load.

Swetrix's `trackViews()` listens for History API changes, so most Turbo Drive navigations are tracked automatically. If you notice any gaps, you can explicitly listen for Turbo's navigation event:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
  })

  document.addEventListener('turbo:load', function () {
    swetrix.trackViews()
  })
</script>
```

:::tip
If your app does **not** use Turbo (e.g. you removed it or are on Rails 6 or earlier), you don't need the `turbo:load` listener — standard full-page navigation handles page view tracking automatically.
:::

## Store your Project ID in credentials (optional)

Rather than hardcoding the Project ID in your layout, you can manage it through Rails credentials. This keeps configuration in one place and out of your templates.

**1. Add to your credentials:**

```bash
bin/rails credentials:edit
```

Add the following:

```yaml
swetrix:
  project_id: YOUR_PROJECT_ID
```

**2. Reference it in your layout:**

```erb
<% if Rails.env.production? %>
  <script src="https://swetrix.org/swetrix.js" defer></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      swetrix.init('<%= Rails.application.credentials.dig(:swetrix, :project_id) %>')
      swetrix.trackViews()
    })
  </script>

  <noscript>
    <img
      src="https://api.swetrix.com/log/noscript?pid=<%= Rails.application.credentials.dig(:swetrix, :project_id) %>"
      alt=""
      referrerpolicy="no-referrer-when-downgrade"
    />
  </noscript>
<% end %>
```

Alternatively, you can use an environment variable. Add `SWETRIX_PROJECT_ID` to your environment and reference it with `ENV['SWETRIX_PROJECT_ID']`.

## Check your installation

Deploy your application (or temporarily enable `devMode`) and visit a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Error tracking

Enable automatic client-side error monitoring by adding `trackErrors()` to the initialisation snippet. This captures unhandled JavaScript errors and reports them to Swetrix.

```html
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

Custom events let you track specific user interactions — form submissions, button clicks, feature usage, and more. Since the Swetrix script is loaded globally, you can call `swetrix.track()` from any inline script or JavaScript file.

### Example: tracking form submissions

Track when users submit a sign-up form:

```html
<%= form_with url: "/signup", id: "signup-form" do |f| %>
  <%= f.email_field :email, placeholder: "you@example.com" %>
  <%= f.submit "Sign up" %>
<% end %>

<script>
  document.getElementById('signup-form')?.addEventListener('submit', function () {
    if (typeof swetrix !== 'undefined') {
      swetrix.track({
        ev: 'SIGNUP_FORM_SUBMITTED',
        meta: {
          page: window.location.pathname,
        },
      })
    }
  })
</script>
```

### Example: tracking outbound links

Track clicks on external links across your site. Add this to your layout file:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href^="http"]').forEach(function (link) {
      if (link.hostname !== window.location.hostname) {
        link.addEventListener('click', function () {
          if (typeof swetrix !== 'undefined') {
            swetrix.track({
              ev: 'OUTBOUND_CLICK',
              meta: { url: link.href },
            })
          }
        })
      }
    })
  })
</script>
```

### Event naming rules

Event names must:

- Contain only English letters (a-Z), numbers (0-9), underscores (`_`), and dots (`.`)
- Be fewer than 64 characters
- Start with an English letter

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `SIGNUP_FORM_SUBMITTED`, `OUTBOUND_CLICK`).

## Using Swetrix with the Asset Pipeline or import maps

The examples above use the CDN script, which works with any Rails asset setup. If you prefer to manage Swetrix as a JavaScript dependency:

### With import maps (Rails 7+ default)

Pin the Swetrix package:

```bash
bin/importmap pin swetrix
```

Then use it in your JavaScript entry point (e.g. `app/javascript/application.js`):

```javascript
import * as Swetrix from 'swetrix'

Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()
```

### With jsbundling (esbuild, webpack, rollup)

Install the package:

```bash
yarn add swetrix
```

Then import it in your JavaScript entry point:

```javascript
import * as Swetrix from 'swetrix'

Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()
```

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
- [Ruby on Rails documentation](https://guides.rubyonrails.org/) — official Rails guides.
