---
title: htmx
slug: /htmx-integration
---

Integrate Swetrix with your [htmx](https://htmx.org/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

htmx enhances server-rendered HTML with AJAX-powered page transitions. Even though htmx swaps content without full page reloads, Swetrix's `trackViews()` automatically detects URL changes (including those made by `hx-boost` and `hx-push-url`), so no extra wiring is needed for page view tracking.

## Installation

Add the Swetrix tracking script to your base HTML layout — the template that wraps every page.

Place the following just before the closing `</body>` tag in your base template:

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

That's it. `trackViews()` polls for path changes automatically, so htmx navigations that update the URL are tracked without any additional code.

### Full example

Here's a complete base layout with htmx and Swetrix:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
    <script src="https://unpkg.com/htmx.org"></script>
  </head>
  <body hx-boost="true">
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>

    <main><!-- page content --></main>

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
  </body>
</html>
```

## Server framework examples

htmx is backend-agnostic. Below are snippets showing where to place the tracking code in popular server frameworks.

### Django

Add the scripts to your base template (e.g. `templates/base.html`):

```html
{% if not debug %}
<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
  })
</script>
{% endif %}
```

### Flask / Jinja2

```html
{% if not config.DEBUG %}
<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
  })
</script>
{% endif %}
```

### Go (html/template)

```html
{{ if eq .Env "production" }}
<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
  })
</script>
{{ end }}
```

## Error tracking

Enable automatic client-side error monitoring by adding `trackErrors()` alongside your existing initialisation:

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

Custom events let you track specific user interactions — button clicks, form submissions, downloads, and more.

### Inline event tracking

```html
<button onclick="swetrix.track({ ev: 'SIGNUP_CLICK' })">
  Sign up
</button>
```

### Tracking htmx-triggered actions

You can hook into htmx events to track actions like form submissions that happen over AJAX:

```html
<form hx-post="/subscribe" hx-target="#result">
  <input type="email" name="email" placeholder="you@example.com" required />
  <button type="submit">Subscribe</button>
</form>
<div id="result"></div>

<script>
  document.querySelector('form[hx-post="/subscribe"]')
    .addEventListener('htmx:afterRequest', function (event) {
      if (event.detail.successful && typeof swetrix !== 'undefined') {
        swetrix.track({
          ev: 'NEWSLETTER_SIGNUP',
          meta: { source: 'footer' },
        })
      }
    })
</script>
```

### Event naming rules

Event names must:

- Contain any characters (including spaces, unicode, etc.)
- Be no longer than 256 characters

## Check your installation

Deploy your application and visit a few pages. If you're using `hx-boost`, click some links to trigger htmx navigations. Within a minute you should see both the initial page view and the htmx-driven page views appearing in your Swetrix dashboard.

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [htmx documentation](https://htmx.org/docs/) — official htmx docs covering attributes, events, and extensions.
- [htmx events reference](https://htmx.org/events/) — complete list of htmx events you can hook into.
