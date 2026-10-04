# Cloudflare DNS setup for managed proxies

The **Configure with Cloudflare** button uses Cloudflare's synchronous Domain Connect flow. It is disabled by default. The API signs a URL for a saved proxy domain after checking project management access; users review and approve the CNAME on Cloudflare. The return to Swetrix triggers the existing DNS/TLS verifier and does not establish domain ownership by itself.

## Onboarding

1. Submit `swetrix.com.managed-proxy.json` to the [Domain Connect template repository](https://github.com/Domain-Connect/Templates). Run its template linter with `-cloudflare` before submission.
2. Generate a dedicated RSA private key of at least 2048 bits and keep it in the backend's secret configuration. Do not commit the private key. Export the public key as DER-encoded SPKI, then base64-encode it.
3. Publish that public key at `_dcpubkeyv1.domainconnect.swetrix.com` in TXT records using Domain Connect's `p=1,a=RS256,d=<chunk>`, `p=2,a=RS256,d=<chunk>`, etc. format. Split the base64 value into chunks small enough to keep each record under 255 characters. See the [signed-request specification](https://github.com/Domain-Connect/spec/blob/master/Domain%20Connect%20Spec%20Draft.adoc#digitally-sign-requests).
4. After the template is merged, email `domain-connect@cloudflare.com` with its GitHub link, the public-key TXT hostname, a Swetrix SVG logo, and a request for **DNS-only (`proxied: false`)** as the template's default proxy status. This setting is agreed with Cloudflare during onboarding, not encoded in the standard template. Optionally include a Cloudflare account ID to test privately before public activation.
5. Once Cloudflare confirms onboarding, configure the backend:

   ```dotenv
   MANAGED_PROXY_DOMAIN_CONNECT_ENABLED=true
   MANAGED_PROXY_DOMAIN_CONNECT_KEY_ID=_dcpubkeyv1
   MANAGED_PROXY_DOMAIN_CONNECT_PRIVATE_KEY="<PEM private key, with real or escaped newlines>"
   CLIENT_URL=https://swetrix.com
   ```

6. Restart the backend through the normal deployment process. Verify with a test domain that approval creates only the displayed CNAME, with DNS-only status, and returns to **Settings → Managed proxy**. Also test cancellation, an existing conflicting DNS record, and an account without access to the selected zone. Enable publicly only after these checks pass.

Cloudflare onboarding and DNS publication are external rollout steps; adding this code does not perform them. Follow [Cloudflare's onboarding documentation](https://developers.cloudflare.com/dns/reference/domain-connect/) for current requirements.

## Scope and verification

The button is offered as an explicit Cloudflare option; it does not automatically identify DNS providers. Root domains come from the public suffix list, preserving nested subdomains and domains such as `example.co.uk`. Separately delegated subdomain zones should use manual setup. The template is restricted to `<proxyTargetId>.proxy.swetrix.org`; a custom `MANAGED_PROXY_BASE_DOMAIN` disables this integration.

Missing or invalid signing configuration hides the button and leaves manual DNS setup available. No Cloudflare API tokens are collected or stored. The signature covers the encoded query before `key` and `sig`, as required by Domain Connect; `sig` is the final parameter.

Run the local signing/configuration tests from `backend`:

```sh
npx jest --config jest.proxy.config.js --runInBand
```

These tests do not establish that Cloudflare has onboarded the template or that the live consent flow works.
