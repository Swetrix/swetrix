---
title: SvelteKit
slug: /sveltekit-integration
---

After you sign up on Swetrix and create a new project, the only thing left is to add it to your website.

## Installation

1. Install the Swetrix package via `npm install swetrix`.
2. Go to your SvelteKit website codebase and either create a new `+layout.svelte` file or use an existing one.
3. Make your layout file look like this:

```html
<script>
  import { onMount } from 'svelte'
  import { dev } from '$app/environment'
  import * as Swetrix from 'swetrix'

  onMount(() => {
    Swetrix.init('YOUR_PROJECT_ID', { devMode: dev, disabled: dev })
    Swetrix.trackViews()
  })
</script>

<!-- Your site's content gets injected here -->
<slot />
```

`trackViews()` automatically detects client-side route changes, so you only need to call it once.

:::caution
It's very important not to forget to replace `YOUR_PROJECT_ID` with your actual Project ID you can find in the Dashboard, otherwise tracking won't work!
:::

## Check your installation

After installing Swetrix tracking script, go to your website and visit some pages.

Within a minute you should be able to see new pageviews being added to your project's dahsboard.
