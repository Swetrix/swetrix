---
title: Introduction
slug: /captcha/introduction
---

Swetrix CAPTCHA is a semi-automated, fully open-source and privacy-friendly CAPTCHA service. It is designed to be used on websites and web applications to prevent bots from performing automated actions.

Swetrix CAPTCHA is based on cookies which are used to give users an ability to solve CAPTCHA without an actual challenge. This cookie does not contain any personal information and none of the users identifiable information is stored on our servers.

These cookies are encrypted and only store 2 variables: `automaticallyVerified` and `manuallyVerified` - these are the total number of times the user has automatically or manually solved a CAPTCHA challenge. When user wants to solve a new challenge, this cookie is sent to the server and the server decides whether to show the user a CAPTCHA challenge or not based on the weighted average of these two variables.

The CAPTCHA challenge is presented to the user in the form of sequence of letters and numbers. The user has to type the letters and numbers in the correct order to solve the challenge.

You can find the demonstration of the CAPTCHA widget [here](https://captcha.swetrix.com/demo).
