---
title: Angular
slug: /angular-integration
---

Integrate Swetrix with your [Angular](https://angular.dev/) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

## Installation

Install the Swetrix npm package:

```bash
npm install swetrix
```

### Basic setup (without routing)

If your app doesn't use the Angular Router, you can initialise Swetrix once in your root component.

Open `src/app/app.component.ts`:

```typescript
import { Component, OnInit } from '@angular/core'
import * as Swetrix from 'swetrix'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  ngOnInit() {
    Swetrix.init('YOUR_PROJECT_ID')
    Swetrix.trackViews()
  }
}
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

### With Angular Router

Most Angular apps use the built-in [Router](https://angular.dev/guide/routing) for client-side navigation. Since route changes don't trigger full page loads, you need to notify Swetrix about each navigation so page views are tracked correctly.

The recommended approach is to create a dedicated service.

**1. Create an analytics service**

Create `src/app/services/analytics.service.ts`:

```typescript
import { Injectable } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import { filter } from 'rxjs/operators'
import * as Swetrix from 'swetrix'

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private router: Router) {}

  init() {
    Swetrix.init('YOUR_PROJECT_ID')
    Swetrix.trackViews()

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        Swetrix.trackViews()
      })
  }
}
```

**2. Call it from your root component**

Open `src/app/app.component.ts`:

```typescript
import { Component, OnInit } from '@angular/core'
import { AnalyticsService } from './services/analytics.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(private analytics: AnalyticsService) {}

  ngOnInit() {
    this.analytics.init()
  }
}
```

:::tip
If you're using **standalone components** (Angular 14+), the same pattern works — just make sure `AnalyticsService` is provided at the application level via `providedIn: 'root'`.
:::

### Noscript fallback (optional)

To track visitors who have JavaScript disabled, add a noscript image pixel to your `src/index.html`:

```html
<body>
  <app-root></app-root>

  <noscript>
    <img
      src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
      alt=""
      referrerpolicy="no-referrer-when-downgrade"
    />
  </noscript>
</body>
```

## Disable tracking in development

By default, Swetrix ignores `localhost` traffic. You can also explicitly disable it using Angular's environment files.

**1. Define the flag in your environments**

`src/environments/environment.ts` (production):

```typescript
export const environment = {
  production: true,
  swetrixDisabled: false,
}
```

`src/environments/environment.development.ts`:

```typescript
export const environment = {
  production: false,
  swetrixDisabled: true,
}
```

**2. Use it during initialisation**

```typescript
import { environment } from '../environments/environment'
import * as Swetrix from 'swetrix'

Swetrix.init('YOUR_PROJECT_ID', {
  disabled: environment.swetrixDisabled,
})
```

:::tip
If you want to verify tracking locally during development, set `devMode: true` instead:

```typescript
Swetrix.init('YOUR_PROJECT_ID', {
  devMode: true,
})
```

Remember to remove this before deploying to production.
:::

## Check your installation

Build and deploy your application (or temporarily enable `devMode`) and visit a few pages. Within a minute you should see new pageviews appearing in your Swetrix dashboard.

## Error tracking

Enable automatic client-side error monitoring by adding `trackErrors()` to your analytics service. This captures unhandled JavaScript errors and reports them to Swetrix.

Update your `AnalyticsService`:

```typescript
init() {
  Swetrix.init('YOUR_PROJECT_ID')
  Swetrix.trackViews()
  Swetrix.trackErrors()

  this.router.events
    .pipe(filter((event) => event instanceof NavigationEnd))
    .subscribe(() => {
      Swetrix.trackViews()
    })
}
```

Errors will appear in the **Errors** tab of your project dashboard. See the [tracking script reference](/swetrix-js-reference#trackerrors) for options like `sampleRate` and `callback`.

## Tracking custom events

Custom events let you track specific user interactions — button clicks, form submissions, sign-ups, purchases, and more. Import `swetrix` in any component and call `track()`.

### Example: tracking button clicks

```typescript
import { Component } from '@angular/core'
import * as Swetrix from 'swetrix'

@Component({
  selector: 'app-signup-button',
  template: '<button (click)="onClick()">Sign up</button>',
})
export class SignUpButtonComponent {
  onClick() {
    Swetrix.track({
      ev: 'SIGNUP_CTA_CLICK',
      meta: {
        location: 'navbar',
      },
    })
  }
}
```

### Example: tracking form submissions

```typescript
import { Component } from '@angular/core'
import * as Swetrix from 'swetrix'

@Component({
  selector: 'app-contact-form',
  template: `
    <form (ngSubmit)="onSubmit()">
      <input type="email" placeholder="you@example.com" required />
      <textarea placeholder="How can we help?" required></textarea>
      <button type="submit">Send</button>
    </form>
  `,
})
export class ContactFormComponent {
  onSubmit() {
    Swetrix.track({
      ev: 'CONTACT_FORM_SUBMITTED',
      meta: {
        source: 'support_page',
      },
    })

    // ...submit logic
  }
}
```

### Example: tracking outbound links with a directive

Create a reusable directive for external links:

```typescript
import { Directive, HostListener, Input } from '@angular/core'
import * as Swetrix from 'swetrix'

@Directive({ selector: 'a[appTrackOutbound]' })
export class TrackOutboundDirective {
  @Input() appTrackOutbound = 'OUTBOUND_CLICK'

  @HostListener('click', ['$event.target'])
  onClick(target: HTMLAnchorElement) {
    Swetrix.track({
      ev: this.appTrackOutbound,
      meta: { url: target.href },
    })
  }
}
```

Usage in a template:

```html
<a href="https://example.com" target="_blank" appTrackOutbound>Visit Example</a>

<!-- With a custom event name -->
<a href="https://partner.com" target="_blank" appTrackOutbound="PARTNER_LINK_CLICK">
  Our partner
</a>
```

### Event naming rules

Event names must:

- Contain only English letters (a-Z), numbers (0-9), underscores (`_`), and dots (`.`)
- Be fewer than 64 characters
- Start with an English letter

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `SIGNUP_CTA_CLICK`, `CONTACT_FORM_SUBMITTED`).

## Using environment variables for your Project ID

Rather than hardcoding your Project ID, you can store it in Angular's environment files.

**1. Add to your environment files:**

`src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  swetrixPid: 'YOUR_PROJECT_ID',
}
```

**2. Use it in your analytics service:**

```typescript
import { environment } from '../../environments/environment'
import * as Swetrix from 'swetrix'

Swetrix.init(environment.swetrixPid)
```

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Swetrix npm package](https://www.npmjs.com/package/swetrix) — package details and changelog.
- [Angular documentation](https://angular.dev/) — official Angular docs for routing, services, directives, and more.
