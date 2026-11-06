# Swetrix MCP server

Connect an MCP client to the Swetrix Statistics API v2 and Admin API. Ask for traffic reports, custom events, funnels and errors, or discover projects and their configuration.

## Run from this directory

Use Node.js 22 or newer and run `npm ci`.

- **Local (stdio)**. Configure your client to launch `node` with the absolute path to `src/cli.js`. Pass a scoped Swetrix API key in the server's `SWETRIX_API_KEY` environment variable.
- **Streamable HTTP**. Run `node src/cli.js --http` to listen at `http://127.0.0.1:3100/mcp`. Each client sends its own scoped `swx_` key in the `Authorization: Bearer <Swetrix API key>` header. For remote connections, terminate TLS at a reverse proxy, preserve the public host header and set `SWETRIX_MCP_ALLOWED_HOSTS` to your public hostname.

By default the server queries `https://api.swetrix.com`. Set `SWETRIX_API_URL` to query your own Swetrix instance. Set `SWETRIX_MCP_HOST` and `SWETRIX_MCP_PORT` to change the HTTP listening address and port.

Start with **Analytics → Read only** on a selected project and ask for its top pages by project ID. Add **Project settings → Read only** to discover projects by name. To expose write tools, set `SWETRIX_MCP_ENABLE_WRITES=true` on the server and give the key the corresponding write permission.

Write tools require an API version that supports `Idempotency-Key`. Pass a unique `idempotencyKey` for each intended creation, such as a random UUID. Retry with the same arguments and key within 24 hours if the result is uncertain.

For client configuration examples, permissions and troubleshooting, see the [MCP setup guide](https://swetrix.com/docs/mcp).

## Publishing to npm

**First publication.** From the commit you want to release, run these commands in `packages/mcp-server`. Sign in with an npm account that can publish under `@swetrix` and complete the two-factor prompt. [npm scoped package publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)

```sh
npm ci
npm test
npm pack --dry-run
npm login
npm publish --access public
```

Once that commit is on GitHub, you can record the first release from the same checkout. For version `0.1.0`, run the following command. The workflow checks the published tarball's integrity against the tagged source and skips the upload when they match.

```sh
gh release create mcp-server@0.1.0 --target "$(git rev-parse HEAD)" --title "MCP server 0.1.0" --generate-notes --latest=false
```

**One-time GitHub setup.** When the next version is ready, open the npm package settings and add a GitHub Actions trusted publisher for owner `Swetrix`, repository `swetrix`, and workflow `tracker-release.yml`. Leave the environment field empty and enable **Allow npm publish**. npm requires the first automated publish within two days of configuring trust. The workflow uses Node 24 LTS on a GitHub-hosted runner to satisfy npm's minimums of Node 22.14.0 and npm CLI 11.5.1. [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

**Release a new version.**

1. Run `npm version patch --no-git-tag-version` in `packages/mcp-server` for a patch release. Commit the updated `package.json` and `package-lock.json` and merge them into `main`.
2. Publish a GitHub Release with tag `mcp-server@<version>` matching the manifest. For example, after bumping from `0.1.0` to `0.1.1`, run the following command.

```sh
gh release create mcp-server@0.1.1 --target main --title "MCP server 0.1.1" --generate-notes --latest=false
```

Publishing the GitHub Release triggers the tests and npm publication. The workflow uses the npm tag `latest` for regular releases and `next` for GitHub prereleases. Community Edition Docker releases use the separate `v` prefix.
