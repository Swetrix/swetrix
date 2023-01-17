---
title: Extensions SDK FAQ
slug: /sdk-faq
---

## How to test an extension?
So, you have written your custom extension and want to test it. Cool!

At the moment, the marketplace and extensions are in beta, so for now we provide 1 way to test your extensions: to do so, you need to download and locally run the [Swetrix frontend repository](https://github.com/Swetrix/swetrix-fe).

Once you've got it up and running, you can drop your extension into the public/assets directory, then manually add a link to your extension in the `src/pages/Project/View/ViewProject.jsx` file.

The result should be something like this:
```javascript
// this useEffect hook is located around line 300 in ViewProject.jsx
useEffect(() => {
  let sdk = null
  if (true) {
    sdk = new SwetrixSDK([{
      id: 'some-test-ext-id',
      cdnURL: 'http://localhost:3000/assets/test_extension.js'
    }], {
      debug: isDevelopment,
    }, {
    // ....leave the following code unmodified
```

We are currently working on draft extensions so you can upload your beta extensions to the marketplace and test them on the production version of Swetrix.
As soon as this functionality is implemented, we will update this section of the documentation.

## How to publish an extension?
The publishing process is still in development, but we are working on it and will update this section of the documentation as soon as it is ready.
