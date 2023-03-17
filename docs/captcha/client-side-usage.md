---
title: Client-side usage
slug: /captcha/client-side-usage
---

## Introduction

You can use the CAPTCHA widget on any page of your website by using our CAPTCHA loader widget. Swetrix CAPTCHA relies on JavaScript to work, so you have to include the widget on your page.

## Installation

### Using CDN
The easiest way to add the CAPTCHA script to your website is to edit the HTML code of your website. To do this, paste the following code snippet into the header section (`<head>` tag) of your website:

```html
<script src="https://swetrix.org/captcha.js" defer></script>
```

### Using NPM
__Not yet supported__

## Usage
Once the CAPTCHA script is installed (or embedded) on your website, you can use the CAPTCHA widget by adding the following HTML code to your page:

```html
<div class="swecaptcha" data-project-id="YOUR_PROJECT_ID"></div>
```

Inside the `.swecaptcha` element, the widget will automatically render a frame with the CAPTCHA challenge and an input field where the token will be stored. The CAPTCHA is designed to be embedded to HTML forms, but you can use it anywhere on your website.

### Customisation
You can customise the appearance of the CAPTCHA widget by adding the following attributes to the `.swecaptcha` element:

| Attribute | Type | Description |
| --- | --- | --- |
| `data-project-id` | string | The ID of your CAPTCHA project (REQUIRED). |
| `data-theme` | string | The theme of the CAPTCHA widget. Possible values: `light` (default), `dark`. |
| `data-response-input-name` | string | Name of the token input element. Default: `swetrix-captcha-response`. |

### Widget sizes
The CAPTCHA widget has several sizes based on the state of the CAPTCHA challenge and the widget will automatically adjust its size.

Here's a table with the possible sizes of the widget that can help you when designing your website:

| State | Width | Height |
| --- | --- | --- |
| Default | 300px | 66px |
| Manual challenge | 300px | 200px |
