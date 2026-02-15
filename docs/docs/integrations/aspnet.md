---
title: ASP.NET
slug: /aspnet-integration
---

Integrate Swetrix with your [ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/) or [ASP.NET Framework](https://dotnet.microsoft.com/en-us/apps/aspnet) application to track page views, monitor errors, and capture custom events — all while staying privacy-friendly and GDPR-compliant.

This guide covers Razor Pages, MVC, and Blazor setups, as well as server-side tracking via the Events API for API-only applications.

## Client-side tracking

The recommended approach for apps that serve HTML (Razor Pages, MVC, Blazor Server with SSR) is to add the Swetrix tracking script to your shared layout.

### ASP.NET Core (Razor Pages / MVC)

#### 1. Add the tracking script to your layout

Open your shared layout file — typically `Views/Shared/_Layout.cshtml` (MVC) or `Pages/Shared/_Layout.cshtml` (Razor Pages) — and add the Swetrix script inside the `<head>` tag and the initialisation snippet before the closing `</body>` tag:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>@ViewData["Title"] - My App</title>

    <!-- Swetrix Analytics -->
    <script src="https://swetrix.org/swetrix.js" defer></script>
</head>
<body>
    @RenderBody()

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

    @await RenderSectionAsync("Scripts", required: false)
</body>
</html>
```

:::caution
Replace `YOUR_PROJECT_ID` with your actual Project ID from the [Swetrix dashboard](https://swetrix.com/projects), otherwise tracking won't work.
:::

#### 2. Disable tracking in development (recommended)

Wrap the snippets in an environment check so they only load in production:

```html
<environment include="Production">
    <script src="https://swetrix.org/swetrix.js" defer></script>
</environment>
```

And for the body initialisation:

```html
<environment include="Production">
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
</environment>
```

The `<environment>` tag helper is built into ASP.NET Core and reads from the `ASPNETCORE_ENVIRONMENT` variable.

:::tip
During development, Swetrix ignores `localhost` traffic by default. If you want to verify tracking locally without changing your environment, you can temporarily set `devMode: true`:

```js
swetrix.init('YOUR_PROJECT_ID', { devMode: true })
```

Remember to remove this before deploying.
:::

### ASP.NET Framework (MVC)

#### 1. Add the tracking script to your layout

Open `Views/Shared/_Layout.cshtml` and add the Swetrix script:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>@ViewBag.Title - My App</title>
    @Styles.Render("~/Content/css")

    <!-- Swetrix Analytics -->
    <script src="https://swetrix.org/swetrix.js" defer></script>
</head>
<body>
    @RenderBody()

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

    @Scripts.Render("~/bundles/jquery")
    @RenderSection("scripts", required: false)
</body>
</html>
```

#### 2. Disable tracking in development

ASP.NET Framework doesn't have a built-in `<environment>` tag helper. Use a conditional check in Razor instead:

```html
@if (!HttpContext.Current.IsDebuggingEnabled)
{
    <script src="https://swetrix.org/swetrix.js" defer></script>
}
```

And for the body initialisation:

```html
@if (!HttpContext.Current.IsDebuggingEnabled)
{
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
}
```

This uses the `debug` attribute from your `web.config` `<compilation>` element.

## Store your Project ID in configuration (optional)

Rather than hardcoding the Project ID in your layout, you can manage it through configuration so it stays in one place.

### ASP.NET Core

**1. Add to `appsettings.json`:**

```json
{
  "Swetrix": {
    "ProjectId": "YOUR_PROJECT_ID"
  }
}
```

**2. Inject configuration into your layout using `@inject`:**

```html
@inject Microsoft.Extensions.Configuration.IConfiguration Configuration

<environment include="Production">
    <script src="https://swetrix.org/swetrix.js" defer></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        swetrix.init('@Configuration["Swetrix:ProjectId"]')
        swetrix.trackViews()
      })
    </script>

    <noscript>
      <img
        src="https://api.swetrix.com/log/noscript?pid=@Configuration["Swetrix:ProjectId"]"
        alt=""
        referrerpolicy="no-referrer-when-downgrade"
      />
    </noscript>
</environment>
```

You can also use an environment variable instead. ASP.NET Core's configuration system supports this out of the box:

```bash
export Swetrix__ProjectId=YOUR_PROJECT_ID
```

### ASP.NET Framework

**1. Add to `web.config`:**

```xml
<appSettings>
  <add key="Swetrix:ProjectId" value="YOUR_PROJECT_ID" />
</appSettings>
```

**2. Reference it in your layout:**

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    swetrix.init('@System.Configuration.ConfigurationManager.AppSettings["Swetrix:ProjectId"]')
    swetrix.trackViews()
  })
</script>
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

Track when users submit a contact form:

```html
<form id="contact-form" method="post" asp-action="Contact">
    <!-- form fields -->
    <button type="submit">Send message</button>
</form>

<script>
  document.getElementById('contact-form')?.addEventListener('submit', function () {
    if (typeof swetrix !== 'undefined') {
      swetrix.track({
        ev: 'CONTACT_FORM_SUBMITTED',
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

We recommend `UPPER_SNAKE_CASE` for consistency (e.g. `CONTACT_FORM_SUBMITTED`, `OUTBOUND_CLICK`).

## Blazor

### Blazor Server / Blazor Web App (interactive server)

For Blazor apps that render on the server, add the Swetrix script to your host page. In .NET 8+ with Blazor Web App, this is `Components/App.razor`. In earlier versions, use `Pages/_Host.cshtml` or `Pages/_Layout.cshtml`:

```html
<head>
    <!-- other head content -->
    <script src="https://swetrix.org/swetrix.js" defer></script>
</head>
<body>
    <!-- Blazor root component -->

    <script>
      document.addEventListener('DOMContentLoaded', function () {
        swetrix.init('YOUR_PROJECT_ID')
        swetrix.trackViews()
      })
    </script>
</body>
```

Blazor Server uses SignalR for updates and doesn't trigger full page navigations. Swetrix's `trackViews()` listens for History API changes, so navigations that use `NavigationManager` will be tracked automatically.

### Blazor WebAssembly

For standalone Blazor WASM apps, add the script to `wwwroot/index.html`:

```html
<head>
    <script src="https://swetrix.org/swetrix.js" defer></script>
</head>
<body>
    <div id="app">Loading...</div>

    <script src="_framework/blazor.webassembly.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        swetrix.init('YOUR_PROJECT_ID')
        swetrix.trackViews()
      })
    </script>
</body>
```

## Server-side tracking (API-only apps)

If your ASP.NET application is a pure API (no HTML views), you can track events server-side using the [Events API](/events-api) directly with `HttpClient`.

### Setup

Register a typed `HttpClient` for Swetrix in `Program.cs`:

```csharp
builder.Services.AddHttpClient("Swetrix", client =>
{
    client.BaseAddress = new Uri("https://api.swetrix.com");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
```

### Create a tracking service

```csharp
public class SwetrixService
{
    private readonly HttpClient _httpClient;
    private readonly string _projectId;

    public SwetrixService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient("Swetrix");
        _projectId = configuration["Swetrix:ProjectId"]
            ?? throw new InvalidOperationException("Swetrix:ProjectId is not configured.");
    }

    public async Task TrackPageViewAsync(string ip, string userAgent, string page, string? locale = null, string? referrer = null)
    {
        var payload = new Dictionary<string, object?>
        {
            ["pid"] = _projectId,
            ["pg"] = page,
            ["lc"] = locale,
            ["ref"] = referrer,
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/log")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Add("User-Agent", userAgent);
        request.Headers.Add("X-Client-IP-Address", ip);

        await _httpClient.SendAsync(request);
    }

    public async Task TrackEventAsync(string ip, string userAgent, string eventName, string? page = null, Dictionary<string, object?>? meta = null)
    {
        var payload = new Dictionary<string, object?>
        {
            ["pid"] = _projectId,
            ["ev"] = eventName,
            ["pg"] = page,
            ["meta"] = meta,
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/log/custom")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Add("User-Agent", userAgent);
        request.Headers.Add("X-Client-IP-Address", ip);

        await _httpClient.SendAsync(request);
    }

    public async Task TrackErrorAsync(string ip, string userAgent, string name, string? message = null, string? stackTrace = null, string? page = null)
    {
        var payload = new Dictionary<string, object?>
        {
            ["pid"] = _projectId,
            ["name"] = name,
            ["message"] = message,
            ["stackTrace"] = stackTrace,
            ["pg"] = page,
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/log/error")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Add("User-Agent", userAgent);
        request.Headers.Add("X-Client-IP-Address", ip);

        await _httpClient.SendAsync(request);
    }
}
```

### Register the service

```csharp
builder.Services.AddSingleton<SwetrixService>();
```

### Middleware approach (recommended)

Track pageviews automatically on every request:

```csharp
public class SwetrixMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SwetrixService _swetrix;

    public SwetrixMiddleware(RequestDelegate next, SwetrixService swetrix)
    {
        _next = next;
        _swetrix = swetrix;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "";
        var userAgent = context.Request.Headers.UserAgent.ToString();
        var page = context.Request.Path.ToString();
        var locale = context.Request.Headers.AcceptLanguage.ToString().Split(',').FirstOrDefault();
        var referrer = context.Request.Headers.Referer.ToString();

        // Fire-and-forget — don't block the response
        _ = _swetrix.TrackPageViewAsync(ip, userAgent, page, locale, referrer);

        await _next(context);
    }
}
```

Register the middleware in `Program.cs`:

```csharp
app.UseMiddleware<SwetrixMiddleware>();
```

:::tip
By using fire-and-forget (`_ = ...`), the analytics call runs in the background without adding latency to your responses. This is the recommended pattern for production.
:::

If your application runs behind a reverse proxy (e.g. Nginx, Cloudflare, or a load balancer), configure [forwarded headers](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer) so `RemoteIpAddress` returns the real client IP:

```csharp
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

// Add before other middleware
app.UseForwardedHeaders();
```

### Per-route tracking

Inject the service directly into controllers or minimal API handlers:

```csharp
app.MapPost("/api/subscribe", async (SwetrixService swetrix, HttpContext context) =>
{
    var ip = context.Connection.RemoteIpAddress?.ToString() ?? "";
    var userAgent = context.Request.Headers.UserAgent.ToString();

    _ = swetrix.TrackEventAsync(ip, userAgent, "NEWSLETTER_SUBSCRIBE", "/subscribe");

    return Results.Ok(new { success = true });
});
```

### Error tracking

Use exception-handling middleware to report errors:

```csharp
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        if (exception is not null)
        {
            var swetrix = context.RequestServices.GetRequiredService<SwetrixService>();
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "";
            var userAgent = context.Request.Headers.UserAgent.ToString();

            _ = swetrix.TrackErrorAsync(
                ip,
                userAgent,
                exception.GetType().Name,
                exception.Message,
                exception.StackTrace,
                context.Request.Path
            );
        }

        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new { error = "Internal Server Error" });
    });
});
```

## Self-hosted Swetrix

If you're self-hosting the [Swetrix API](https://github.com/Swetrix/swetrix-api), point the script or API base URL to your instance.

**Client-side:**

```js
swetrix.init('YOUR_PROJECT_ID', {
  apiURL: 'https://your-swetrix-instance.com/log',
})
```

**Server-side:**

```csharp
builder.Services.AddHttpClient("Swetrix", client =>
{
    client.BaseAddress = new Uri("https://your-swetrix-instance.com");
});
```

## Further reading

- [Tracking script reference](/swetrix-js-reference) — full API documentation for `init()`, `track()`, `trackViews()`, `trackErrors()`, and more.
- [Events API](/events-api) — API documentation for direct event submission.
- [ASP.NET Core documentation](https://learn.microsoft.com/en-us/aspnet/core/) — official ASP.NET Core docs.
