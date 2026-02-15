---
title: Flask
slug: /flask-integration
---

Integrate Swetrix with your [Flask](https://flask.palletsprojects.com/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

This guide covers both traditional multi-page Flask apps (using Jinja2 templates) and single-page setups with client-side routing.

## Installation

The recommended approach is to add the Swetrix tracking script to your base Jinja2 template so it loads on every page.

### 1. Add the tracking script to your base template

Flask uses Jinja2 templates, and most projects define a shared base template that other templates extend. Open (or create) your `templates/base.html` and add the Swetrix script inside the `<head>` tag, and the initialisation snippet before the closing `</body>` tag:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{% block title %}My App{% endblock %}</title>

    {% block styles %}{% endblock %}

    <!-- Swetrix Analytics -->
    <script src="https://swetrix.org/swetrix.js" defer></script>
</head>
<body>
    {% block content %}{% endblock %}

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

    {% block scripts %}{% endblock %}
</body>
</html>
```

All page templates that extend this base will automatically include the tracking script:

```html
{% extends "base.html" %}

{% block title %}Home{% endblock %}

{% block content %}
  <h1>Welcome to my Flask app</h1>
{% endblock %}
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### 2. Disable tracking in development (recommended)

To avoid polluting your analytics with local page views, wrap the snippet in an environment check so it only loads in production. You can use Flask's configuration or an environment variable:

```html
{% if config.ENV == 'production' or not config.DEBUG %}
    <script src="https://swetrix.org/swetrix.js" defer></script>
{% endif %}
```

And for the body initialisation:

```html
{% if config.ENV == 'production' or not config.DEBUG %}
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
{% endif %}
```

:::tip
During development, Swetrix ignores `localhost` traffic by default. If you want to verify tracking locally without changing your environment, you can temporarily set `devMode: true`:

```js
swetrix.init('YOUR_PROJECT_ID', { devMode: true })
```

Remember to remove this before deploying.
:::

## Store your Project ID in config (optional)

Rather than hardcoding the Project ID in your template, you can manage it through Flask's configuration system. This keeps your templates clean and makes it easy to use different IDs per environment.

**1. Set an environment variable or add it to your config:**

```bash
export SWETRIX_PROJECT_ID=YOUR_PROJECT_ID
```

**2. Load it in your Flask app:**

```python
import os

app = Flask(__name__)
app.config['SWETRIX_PROJECT_ID'] = os.environ.get('SWETRIX_PROJECT_ID', '')
```

**3. Reference it in your template:**

```html
{% if config.SWETRIX_PROJECT_ID %}
    <script src="https://swetrix.org/swetrix.js" defer></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        swetrix.init('{{ config.SWETRIX_PROJECT_ID }}')
        swetrix.trackViews()
      })
    </script>

    <noscript>
      <img
        src="https://api.swetrix.com/log/noscript?pid={{ config.SWETRIX_PROJECT_ID }}"
        alt=""
        referrerpolicy="no-referrer-when-downgrade"
      />
    </noscript>
{% endif %}
```

If you use a `.env` file with [python-dotenv](https://pypi.org/project/python-dotenv/), add the variable there:

```
SWETRIX_PROJECT_ID=YOUR_PROJECT_ID
```

And load it in your app:

```python
from dotenv import load_dotenv

load_dotenv()
```

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

Track when users submit a registration form:

```html
<form id="register-form" method="POST" action="/register">
    <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
    <input type="email" name="email" placeholder="you@example.com">
    <button type="submit">Register</button>
</form>

<script>
  document.getElementById('register-form')?.addEventListener('submit', function () {
    if (typeof swetrix !== 'undefined') {
      swetrix.track({
        ev: 'REGISTER_FORM_SUBMITTED',
        meta: {
          page: window.location.pathname,
        },
      })
    }
  })
</script>
```

### Example: tracking outbound links

Track clicks on external links across your site. Add this to your base template:

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

- Contain any characters (including spaces, unicode, etc.)
- Be no longer than 256 characters

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `REGISTER_FORM_SUBMITTED`, `OUTBOUND_CLICK`).

## Using Swetrix with Flask blueprints

If your application is structured with [blueprints](https://flask.palletsprojects.com/en/stable/blueprints/), the Swetrix script in your base template will work across all blueprints automatically — as long as each blueprint's templates extend the same `base.html`.

If a blueprint uses its own base template, add the Swetrix snippet there as well, or create a shared partial:

```html
{# templates/partials/swetrix.html #}

{% if config.SWETRIX_PROJECT_ID %}
    <script src="https://swetrix.org/swetrix.js" defer></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        swetrix.init('{{ config.SWETRIX_PROJECT_ID }}')
        swetrix.trackViews()
        swetrix.trackErrors()
      })
    </script>

    <noscript>
      <img
        src="https://api.swetrix.com/log/noscript?pid={{ config.SWETRIX_PROJECT_ID }}"
        alt=""
        referrerpolicy="no-referrer-when-downgrade"
      />
    </noscript>
{% endif %}
```

Then include it in any base template:

```html
{% include "partials/swetrix.html" %}
```

## Using Swetrix with Flask and a JavaScript frontend

If you use Flask as an API backend with a JavaScript frontend (e.g. React, Vue, or HTMX), you have two options:

1. **CDN script** — Add the Swetrix script to your frontend's HTML as shown above. This works well with HTMX or any server-rendered approach.
2. **npm package** — Install the Swetrix npm package in your frontend project for full programmatic control:

```bash
npm install swetrix
```

```javascript
import * as Swetrix from 'swetrix'

Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()
```

See the relevant frontend framework integration guide ([React](/react-integration), [Vue](/vue-integration), etc.) for framework-specific details.

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
- [Flask documentation](https://flask.palletsprojects.com/) — official Flask docs.
