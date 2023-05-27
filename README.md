<img src="https://swetrix.com/assets/logo_blue.png" alt="" height="80" />

# Swetrix CAPTCHA validator
This is a wrapper for the Swetrix CAPTCHA server-side validation API.\
It is used to validate the user's response to the CAPTCHA.\
Read more about server-side validation at https://docs.swetrix.com/captcha/server-side-validation

# Installation
```bash
npm install @swetrix/captcha-validator
```

# Usage
You can use this package in your Node.js (or NestJS, ExpressJS, etc.) project to validate the user's response to the CAPTCHA.\
The package exports a single function `validateToken` which takes arguments listed below and returns a Promise.

| Argument | Type | Description | Required |
| --- | --- | --- | --- |
| token | string | The token returned by the CAPTCHA widget. | YES |
| secretKey | string | Your CAPTCHA project secret key. | YES |
| apiURL | string | The API URL to use (default: https://api.swetrix.com/captcha), this one may be used in case you're selfhosting the API. | NO |

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

# License
This library is licenced under the MIT License - see the [LICENSE](LICENSE) file for details.

# Donate
You can support the project by donating us at https://ko-fi.com/andriir \
We can only run our services by once again asking for your financial support!
