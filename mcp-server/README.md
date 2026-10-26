# YNAB on FIRE — MCP server

A local [MCP](https://modelcontextprotocol.io) server that gives AI assistants (Claude Code, Claude Desktop, …) read-only access to your YNAB data. It runs over stdio on your machine and authorises with YNAB via OAuth — no personal access token needed.

## Tools

| Tool                | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `list_budgets`      | Budgets (YNAB "plans") you have access to                    |
| `list_accounts`     | Accounts and balances                                        |
| `list_categories`   | Category groups and categories for the current month         |
| `list_months`       | Monthly summaries (income, budgeted, activity, age of money) |
| `get_month`         | A single month with per-category figures                     |
| `list_transactions` | Transactions, filterable by date range, account or category  |

Every tool takes an optional `plan_id` (defaults to `last-used`). Amounts are returned in currency units — the server converts from YNAB milliunits — and deleted entities are filtered out.

## Setup

1. **Register the redirect URI.** In [YNAB → Developer Settings](https://app.ynab.com/settings/developer), edit the OAuth application and add:

   ```
   http://localhost:8765/ynab-mcp-server
   ```

2. **Build and authorise** (from the repo root):

   ```sh
   make mcp        # install + build
   make mcp-auth   # opens your browser to approve access
   ```

   The token is stored in `~/.config/ynab-on-fire/mcp-token.json` (mode `0600`). If you skip this step, the browser opens on the first tool call instead.

3. **Register it with your MCP client.** For Claude Code:

   ```sh
   claude mcp add --scope user ynab -- node "$(git rev-parse --show-toplevel)/mcp-server/dist/index.js"
   ```

   Run this from anywhere inside the repo. The path is expanded once and saved as an absolute path, and `--scope user` makes the server available in every Claude Code session, whatever folder it starts in (the default `local` scope only covers the current project).

   Or in any client's JSON config:

   ```json
   {
     "mcpServers": {
       "ynab": {
         "command": "node",
         "args": ["/absolute/path/to/ynab-on-fire/mcp-server/dist/index.js"]
       }
     }
   }
   ```

## OAuth grants

By default the server reuses the web app's OAuth client (`src/ynab.config.json`) with the **Implicit grant**. Implicit tokens expire after about 2 hours, after which the browser opens again on the next tool call.

To stay signed in, set `YNAB_CLIENT_SECRET` to the OAuth application's secret. The server then uses the **Authorization Code grant** and refreshes tokens automatically. Pass it via your MCP client's `env` config rather than committing it.

## Commands

```sh
npm run build   # compile to dist/
npm start       # run the server on stdio (what MCP clients invoke)
npm run dev     # run from source with tsx
npm run auth    # authorise with YNAB and save the token
npm run logout  # delete the saved token
```

## Configuration

| Variable              | Default                                 | Purpose                                                  |
| --------------------- | --------------------------------------- | -------------------------------------------------------- |
| `YNAB_CLIENT_ID`      | `clientId` from `src/ynab.config.json`  | OAuth application client ID                              |
| `YNAB_CLIENT_SECRET`  | —                                       | Enables the Authorization Code grant with refresh tokens |
| `YNAB_ACCESS_TOKEN`   | —                                       | Skip OAuth and use this token (e.g. a personal token)    |
| `YNAB_MCP_PORT`       | `8765`                                  | Port for the local OAuth callback                        |
| `YNAB_MCP_TOKEN_FILE` | `~/.config/ynab-on-fire/mcp-token.json` | Where the token is stored                                |

If you change the port, register the matching redirect URI in YNAB.
