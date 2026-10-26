import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Reuse the web app's OAuth client unless overridden. Resolves from both src/ (tsx) and dist/ (node).
const appConfig = JSON.parse(
  readFileSync(new URL('../../src/ynab.config.json', import.meta.url), 'utf8')
) as { clientId: string }

const port = Number(process.env.YNAB_MCP_PORT ?? 8765)

export const config = {
  clientId: process.env.YNAB_CLIENT_ID ?? appConfig.clientId,
  // When set, the Authorization Code grant is used (long-lived refresh tokens).
  // Otherwise the Implicit grant is used and tokens expire after ~2 hours.
  clientSecret: process.env.YNAB_CLIENT_SECRET,
  // Skips OAuth entirely, e.g. a YNAB personal access token.
  accessToken: process.env.YNAB_ACCESS_TOKEN,
  port,
  redirectUri: `http://localhost:${port}/ynab-mcp-server`,
  tokenFile:
    process.env.YNAB_MCP_TOKEN_FILE ?? join(homedir(), '.config', 'ynab-on-fire', 'mcp-token.json'),
  authorizeUrl: 'https://app.ynab.com/oauth/authorize',
  tokenUrl: 'https://app.ynab.com/oauth/token',
  authTimeoutMs: 5 * 60 * 1000
}
