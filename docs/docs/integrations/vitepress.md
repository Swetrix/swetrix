---
title: VitePress
slug: /vitepress-integration
---

Integrate Swetrix with your [VitePress](https://vitepress.dev/) documentation site to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

## Installation

There are two ways to add Swetrix to a VitePress site: via the **config file** (quickest) or via the **npm package** (more flexible, enables custom events from Vue components).

### Option A: Script tag via config (quickest)

Add the Swetrix tracking script to your `.vitepress/config.ts` (or `.js` / `.mts`):

```ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  // ...your existing config
  head: [
    [
      'script',
      { src: 'https://swetrix.org/swetrix.js', defer: '' },
    ],
    [
      'script',
      {},
      `document.addEventListener('DOMContentLoaded', function () {
  swetrix.init('YOUR_PROJECT_ID')
  swetrix.trackViews()
})`,
    ],
  ],
})
```

The empty string for `defer` is intentional — VitePress renders it as a boolean attribute (`<script defer>`).

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### Option B: npm package (recommended for custom events)

If you want to track custom events from Vue components or need finer control, install the npm package:

```bash
npm install swetrix
```

Then extend your VitePress theme to initialise Swetrix. Create or edit `.vitepress/theme/index.ts`:

```ts
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { watch } from 'vue'
import * as Swetrix from 'swetrix'

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return

    Swetrix.init('YOUR_PROJECT_ID')
    Swetrix.trackViews()

    watch(() => router.route.path, () => {
      Swetrix.trackViews()
    })
  },
} satisfies Theme
```

This initialises Swetrix once and re-tracks page views whenever VitePress navigates to a new route.

### Noscript fallback (optional)

To track visitors who have JavaScript disabled, add a noscript image pixel via the `head` config:

```ts
export default defineConfig({
  head: [
    // ...your script tags
    [
      'noscript',
      {},
      `<img src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID" alt="" referrerpolicy="no-referrer-when-downgrade" />`,
    ],
  ],
})
```

## SPA navigation

VitePress uses client-side routing — clicking a link doesn't trigger a full page reload. The Swetrix tracking script detects these navigations automatically via the History API, so **no extra configuration is needed** if you're using Option A (script tag).

If you're using Option B (npm package), the `watch` on `router.route.path` in the theme setup handles this for you.

## Disable tracking in development

By default, Swetrix ignores `localhost` traffic. If you want to be explicit about it, you can conditionally exclude the script in development.

**Option A — conditional `head` config:**

```ts
import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  head: isProd
    ? [
        [
          'script',
          { src: 'https://swetrix.org/swetrix.js', defer: '' },
        ],
        [
          'script',
          {},
          `document.addEventListener('DOMContentLoaded', function () {
  swetrix.init('YOUR_PROJECT_ID')
  swetrix.trackViews()
})`,
        ],
      ]
    : [],
})
```

**Option B — `disabled` flag with the npm package:**

```ts
Swetrix.init('YOUR_PROJECT_ID', {
  disabled: import.meta.env.DEV,
})
```

:::tip
If you want to verify tracking locally during development, set `devMode: true` instead:

```ts
Swetrix.init('YOUR_PROJECT_ID', {
  devMode: true,
})
```

Remember to remove this before deploying to production.
:::

## Check your installation

Build your site with `vitepress build` and deploy it. Visit a few pages on your live site — within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Error tracking

Enable automatic client-side error monitoring to capture unhandled JavaScript errors.

**Option A — update the inline script in your config:**

```js
document.addEventListener('DOMContentLoaded', function () {
  swetrix.init('YOUR_PROJECT_ID')
  swetrix.trackViews()
  swetrix.trackErrors()
})
```

**Option B — update your theme setup:**

```ts
Swetrix.init('YOUR_PROJECT_ID')
Swetrix.trackViews()
Swetrix.trackErrors()
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you track specific user interactions — button clicks, feedback responses, outbound links, and more. This requires **Option B** (npm package).

### Example: docs feedback widget

Track whether visitors find a page helpful:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vitepress'
import * as Swetrix from 'swetrix'

const route = useRoute()
const submitted = ref(false)

function sendFeedback(answer: string) {
  Swetrix.track({
    ev: 'DOCS_FEEDBACK',
    meta: {
      answer,
      path: route.path,
    },
  })

  submitted.value = true
}
</script>

<template>
  <div v-if="!submitted">
    <p>Was this page helpful?</p>
    <button @click="sendFeedback('Yes')">Yes</button>
    <button @click="sendFeedback('No')">No</button>
  </div>
  <p v-else>Thank you for your feedback!</p>
</template>
```

Place this component in `.vitepress/theme/components/DocsFeedback.vue` and use it in your Markdown pages or theme layout.

### Example: tracking outbound links

Create a reusable component for external links. Save as `.vitepress/theme/components/TrackedLink.vue`:

```vue
<script setup lang="ts">
import * as Swetrix from 'swetrix'

const props = withDefaults(
  defineProps<{
    href: string
    eventName?: string
  }>(),
  {
    eventName: 'OUTBOUND_CLICK',
  },
)

function handleClick() {
  Swetrix.track({
    ev: props.eventName,
    meta: { url: props.href },
  })
}
</script>

<template>
  <a :href="href" target="_blank" rel="noopener noreferrer" @click="handleClick">
    <slot />
  </a>
</template>
```

Usage in Markdown:

```md
<script setup>
import TrackedLink from '../.vitepress/theme/components/TrackedLink.vue'
</script>

Check out the <TrackedLink href="https://github.com/example/repo">source code</TrackedLink>.
```

### Event naming rules

Event names must:

- Contain only English letters (a-Z), numbers (0-9), underscores (`_`), and dots (`.`)
- Be fewer than 64 characters
- Start with an English letter

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `DOCS_FEEDBACK`, `OUTBOUND_CLICK`).

## Further reading

- [Vue integration](/vue-integration) — general Vue setup guide.
- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
