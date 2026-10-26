#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { authorise, clearToken } from './auth.js'
import { config } from './config.js'
import { registerTools } from './tools.js'

async function serve() {
  const server = new McpServer({ name: 'ynab-on-fire', version: '0.1.0' })
  registerTools(server)
  await server.connect(new StdioServerTransport())
  console.error('YNAB on FIRE MCP server running on stdio')
}

const commands: Record<string, () => Promise<void>> = {
  serve,
  auth: async () => {
    await authorise()
    console.error(`Authorised. Token saved to ${config.tokenFile}`)
  },
  logout: async () => {
    await clearToken()
    console.error(`Removed ${config.tokenFile}`)
  }
}

const command = commands[process.argv[2] ?? 'serve']
if (!command) {
  console.error(`Usage: ynab-on-fire-mcp [${Object.keys(commands).join('|')}]`)
  process.exit(1)
}

command().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
