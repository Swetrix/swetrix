---
title: Server-side validation
slug: /captcha/server-side-validation
---

## Introduction

You have to validate the user's response to the CAPTCHA on your server. The token should be considered valid only if you validated it on your backend, otherwise it can be easily spoofed (the presence of the token in the request is not enough to consider it valid as an attacker can easily send a request with any string as a token).

The validation endpoint accepts the CAPTHCA token and your project-specific secret key and returns a JSON response with the validation result.

:::info
Token validation can only be performed once, if you try to validate the same token twice, the second validation will fail. This is done to prevent token reuse attacks.
:::

## Validation via HTTP request

To validate the token, you have to send a POST request to the `https://api.swetrix.com/v1/captcha/validate` URL, with the following parameters:

| Parameter | Type | Description |
| --- | --- | --- |
| token | string | The token returned by the CAPTCHA widget. |
| secret | string | Your CAPTCHA project secret key. |

<br />

The successful response will have the `success` field set to `true` and the `data` field will contain the following fields:

| Field | Type | Description |
| --- | --- | --- |
| hash | string | The hash of CAPTCHA user passed. |
| timestamp | number | The timestamp of CAPTCHA user passed. |
| autoVerified | boolean | Whether the CAPTCHA was auto-verified (i.e. user was NOT presented a CAPTCHA challenge). |
| pid | string | The ID of the CAPTCHA project. |

```json
{
  success: true,
  data: {
    hash, timestamp, autoVerified, pid,
  }
}
```

<br />

The failed response will throw an error that will look like the following example. The HTTP status code will correspond to the `statusCode` in JSON.
```json
{
  "statusCode": 400,
  "message": "Could not decrypt token",
  "error": "Bad Request"
}
```

<br />

Here's an example of how to validate the token using `curl`:

```bash
curl -X POST\
  -H "Content-Type: application/json"\
  -d '{"token": "<token>", "secret": "<secret>"}'\
  https://api.swetrix.com/v1/captcha/validate
```

## Validation via Node.js library

You can use the [@swetrix/captcha-validator](https://www.npmjs.com/package/@swetrix/captcha-validator) package to validate the token in your Node.js project.

You can use this package in your Node.js (or NestJS, ExpressJS, etc.) project to validate the user's response to the CAPTCHA.
The package exports a single function `validateToken` which takes arguments listed below and returns a Promise.

| Argument | Type | Description | Required |
| --- | --- | --- | --- |
| token | string | The token returned by the CAPTCHA widget. | YES |
| secretKey | string | Your CAPTCHA project secret key. | YES |
| apiURL | string | The API URL to use (default: https://api.swetrix.com/captcha), this one may be used in case you're selfhosting the API. | NO |

<br />

Here's an example of how to use the package in your project:
```js
const { validateToken } = require('@swetrix/captcha-validator')
// or
import { validateToken } from '@swetrix/captcha-validator'

// somewhere inside the controller of your form where the CAPTCHA is used
validateToken(
  'CAPTCHA_TOKEN',
  'YOUR_SECRET_KEY',
).then((result) => {
  const [status, data] = result
  // status is a boolean, true if the token is valid, false otherwise
  // data is an error message if status is false
  console.log(status, data)
})
```
