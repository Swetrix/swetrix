---
title: Getting started with the Extensions SDK
slug: /sdk-introduction
---

## What are the extensions?
Swetrix allows you to create your own extensions to extend the functionality of the platform.
These extensions work similarly to browser extensions and allow you to access and process analytics data, display customised pages and much more.

You can also publish your extensions in the Swetrix Marketplace for others to use.

:::caution
Swetrix Marketplace and the extensions SDK are still in development, the documentation may be updated frequently and some APIs may change.
:::

## How do they work?
Extensions can communicate with the Swetrix platform via the Swetrix SDK.
The Swetrix SDK is a module that gives you the ability to configure different event listeners and also to transfer data from the extension to the Swetrix dashboard.
All user-installed extensions run in parallel and are isolated from each other.

The extension itself is a JavaScript file which consists of a function that takes an sdk object as an argument.

This object consists of all the APIs you can use when writing your extension.

A simple example of an extension structure:
```javascript
(async (sdk) => {
  // Your extension code goes here..
})
```

You can find full and in-detail explained examples in our [GitHub repository](https://github.com/Swetrix/extension-examples).
