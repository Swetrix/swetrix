---
title: Introduction
slug: /captcha/introduction
---

Swetrix CAPTCHA is a fully open source, cookieless, and privacy-friendly CAPTCHA service. It is designed to be used on websites and web applications to prevent bots from performing automated actions.

## How it works

Unlike traditional CAPTCHAs that require users to identify objects in images or solve puzzles, Swetrix CAPTCHA uses a **Proof of Work (PoW)** mechanism.

1.  **Challenge Request**: When a user interacts with a protected form, the client requests a challenge from the Swetrix server.
2.  **PoW Calculation**: The client-side script performs a cryptographic calculation (Proof of Work) in the background. This requires a small amount of computational power from the user's device, which is trivial for a legitimate user but computationally expensive for bots trying to spam at scale.
3.  **Verification**: The solution to the PoW challenge is sent back to the server for verification.

This approach provides a seamless user experience (no more "select all traffic lights") while effectively deterring automated bots.

You can find the demonstration of the CAPTCHA widget [here](https://captcha.swetrix.com/demo).
