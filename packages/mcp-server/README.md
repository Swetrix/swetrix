# Swetrix MCP server

Connect an MCP client to the Swetrix Statistics API v2 and Admin API. Ask for traffic reports, custom events, funnels and errors, or discover projects and their configuration.

## Run from this directory

Use Node.js 22 or newer and run `npm ci`.

- **Local (stdio)**. Configure your client to launch `node` with the absolute path to `src/cli.js`. Pass a scoped Swetrix API key in the server's `SWETRIX_API_KEY` environment variable.
- **Streamable HTTP**. Run `node src/cli.js --http` to listen at `http://127.0.0.1:3100/mcp`. Each client sends its own scoped `swx_` key in the `Authorization: Bearer <Swetrix API key>` header. For remote connections, terminate TLS at a reverse proxy, preserve the public host header and set `SWETRIX_MCP_ALLOWED_HOSTS` to your public hostname.

By default the server queries `https://api.swetrix.com`. Set `SWETRIX_API_URL` to query your own Swetrix instance. Set `SWETRIX_MCP_HOST` and `SWETRIX_MCP_PORT` to change the HTTP listening address and port.

Start with **Analytics → Read only** on a selected project and ask for its top pages by project ID. Add **Project settings → Read only** and **Funnels → Read only** to discover projects by name. To expose write tools, set `SWETRIX_MCP_ENABLE_WRITES=true` on the server and give the key the corresponding write permission.

For client configuration examples, permissions and troubleshooting, see the [MCP setup guide](https://swetrix.com/docs/mcp).
