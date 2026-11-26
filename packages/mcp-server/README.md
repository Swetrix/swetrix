<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://swetrix.com/assets/logo_white.png?v=2">
  <img alt="" src="https://swetrix.com/assets/logo_blue.png?v=2" height="80">
</picture>

# `@swetrix/mcp-server` - Swetrix MCP server

Ask your AI assistant questions about your Swetrix analytics. The server connects a Model Context Protocol (MCP) client to Swetrix Cloud or Community Edition so you can explore traffic, custom events, funnels and errors in a chat.

## Quick start

You'll need Node.js 22 or newer and a Swetrix API key.

1. In Swetrix, open **Account Settings → Account → API keys** and create a key for the projects you want to explore.
2. Grant **Analytics → Read only** for traffic reports and **Project settings → Read only** to find projects by name.
3. In VS Code, run **MCP: Open User Configuration** from the Command Palette and add the configuration below. Start the Swetrix server and enter your API key when prompted. VS Code uses `npx` to install and launch the package.

```json
{
  "inputs": [
    {
      "id": "swetrix-key",
      "type": "promptString",
      "description": "Swetrix API key",
      "password": true
    }
  ],
  "servers": {
    "swetrix": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@swetrix/mcp-server"],
      "env": { "SWETRIX_API_KEY": "${input:swetrix-key}" }
    }
  }
}
```

For another MCP client that supports local servers, use `npx -y @swetrix/mcp-server` as the launch command and pass your key through the `SWETRIX_API_KEY` environment variable.

## Usage

Start with “List my Swetrix projects.” Then pick a project and ask:

- “Which five pages had the most pageviews last week?”
- “How many visitors did we have each day this month?”
- “Which countries sent the most visitors to our pricing page?”

For questions about custom events, saved funnels or JavaScript errors, grant read access to **Events**, **Funnels** or **Errors** respectively. [API key permissions](https://swetrix.com/docs/settings/api-keys)

## Configuration

**Self-hosted Swetrix.** The server uses Swetrix Cloud by default. For Community Edition, add `SWETRIX_API_URL` to the server environment and set it to your API base URL, for example `https://analytics.example.com/api` if your reverse proxy serves the API under `/api`. The server adds the API version to each request.

**Write access.** The default tools are read-only. To let your assistant create projects, funnels or annotations, set `SWETRIX_MCP_ENABLE_WRITES=true`, grant the corresponding write permission on the key, and restart the MCP server. Each create tool takes an `idempotencyKey`. Use a new UUID for each creation and reuse it with the same arguments if you retry within 24 hours.

**Streamable HTTP.** Run `npx -y @swetrix/mcp-server --http` to serve MCP at `http://127.0.0.1:3100/mcp`. Each client sends its own scoped Swetrix API key in the `Authorization: Bearer <key>` header. For a shared HTTPS endpoint, follow the reverse proxy setup in the [MCP guide](https://swetrix.com/docs/mcp#host-an-endpoint-for-a-team).

## License

[MIT License](https://github.com/Swetrix/swetrix/blob/main/packages/mcp-server/LICENSE).
