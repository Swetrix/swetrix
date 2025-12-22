---
title: Feature Flags
slug: /features/feature-flags
---

import useBaseUrl from '@docusaurus/useBaseUrl';

Feature flags allow you to toggle features on and off for your users without deploying new code. This is useful for rolling out new features gradually, testing in production, or quickly disabling a feature if something goes wrong.

## Overview

With Swetrix Feature Flags, you can:

- Create flags in your dashboard.
- Assign rules to target specific user segments (e.g., by country, browser, or custom attributes).
- Roll out features to a percentage of your users.

## Client-Side Implementation

To use feature flags in your application, you can use the Swetrix tracking script.

### Fetching all flags

```javascript
import { getFeatureFlags } from 'swetrix'

const flags = await getFeatureFlags()

if (flags['new-checkout']) {
  // Show new checkout flow
}
```

### Getting a single flag

```javascript
import { getFeatureFlag } from 'swetrix'

const isEnabled = await getFeatureFlag('dark-mode', {
  // Optional: provide a specific profileId if known,
  // otherwise it uses the one from init() or generates an anonymous one.
  profileId: 'user-123',
})

if (isEnabled) {
  // Enable dark mode
}
```

### Caching

Feature flags are cached for 5 minutes by default to minimize network requests. You can force a refresh or clear the cache if needed:

```javascript
import { clearFeatureFlagsCache } from 'swetrix'

// Clear cache to force a fresh fetch on next call
clearFeatureFlagsCache()
```

## Managing Flags

You can create and manage your feature flags in the **Feature Flags** tab of your project dashboard.

<img alt="Feature flags list" src={useBaseUrl('img/features/feature-flags-list.png')} />
