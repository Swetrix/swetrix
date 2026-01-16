<img src="/src/assets/logo_blue.png" alt="" height="80" />

## Description

Swetrix CAPTCHA is a privacy-oriented, simple and opensource CAPTCHA service.

See the full documentation at https://docs.swetrix.com/captcha/introduction

## Features

- **Privacy-focused**: No tracking, no cookies
- **Accessible**: Full keyboard navigation, ARIA support, screen reader announcements, respects `prefers-reduced-motion`
- **Progress indicator**: Visual progress bar during verification
- **Auto theme detection**: Automatically matches browser's light/dark mode preference
- **Lightweight**: Minimal footprint, fast loading

## Usage

```html
<div class="swecaptcha" 
     data-project-id="YOUR_PROJECT_ID" 
     data-theme="auto">
</div>
<script src="https://cdn.swetrixcaptcha.com/captcha-loader.js" defer></script>
```

### Options

| Attribute | Description | Values | Default |
|-----------|-------------|--------|---------|
| `data-project-id` | Your project ID | Valid project ID | Required |
| `data-theme` | Color theme | `auto`, `light`, `dark` | `auto` |
| `data-response-input-name` | Hidden input name | Any string | `swetrix-captcha-response` |
| `data-lang` | Force a specific language | `en`, `de`, `fr`, `pl`, `uk` | Auto-detected |

### Language Support

The widget supports **English**, **German**, **French**, **Polish**, and **Ukrainian**.

Language is detected automatically in this order:
1. `data-lang` attribute on the widget element
2. `lang` attribute on parent elements (e.g., `<html lang="de">`)
3. Browser's preferred language

### Theme Options

- `auto`: Automatically detects user's browser theme preference using `prefers-color-scheme`
- `light`: Forces light theme
- `dark`: Forces dark theme

## Development

To build the captcha run:
```bash
npm run build
```

After you build it, a new folder `dist` will appear. You can run `test.html` file via an extension like `Live server` to test it (don't forget to set up a valid project ID or one of our [dummy project IDs](https://docs.swetrix.com/captcha/testing)).

## License

Swetrix CAPTCHA client is released under the MIT licence, see [LICENSE](LICENSE).

## Bugs and security

Swetrix is open to pull-requests. Feel free to propose new features or submit bug requests via pull reuqests.\
For severe security issues, please contact us at security@swetrix.com

## Contact

You can contact us via email at contact@swetrix.com
