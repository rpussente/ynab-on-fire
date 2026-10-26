import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname } from 'node:path'
import open from 'open'
import { config } from './config.js'

interface StoredToken {
  access_token: string
  refresh_token?: string
  // Epoch milliseconds
  expires_at: number
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

// Refresh a little before the token actually expires
const EXPIRY_MARGIN_MS = 60 * 1000

async function loadToken(): Promise<StoredToken | undefined> {
  try {
    return JSON.parse(await readFile(config.tokenFile, 'utf8')) as StoredToken
  } catch {
    return undefined
  }
}

// YNAB's default lifetime, used when a response omits or garbles expires_in
const DEFAULT_EXPIRES_IN_S = 2 * 60 * 60

async function writeToken(token: StoredToken): Promise<void> {
  await mkdir(dirname(config.tokenFile), { recursive: true, mode: 0o700 })
  await writeFile(config.tokenFile, JSON.stringify(token, null, 2), { mode: 0o600 })
}

async function saveToken(res: Partial<TokenResponse>): Promise<StoredToken> {
  if (!res.access_token) throw new Error('YNAB did not return an access token.')
  const expiresIn = Number(res.expires_in)
  const token: StoredToken = {
    access_token: res.access_token,
    refresh_token: res.refresh_token,
    expires_at:
      Date.now() +
      (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : DEFAULT_EXPIRES_IN_S) * 1000
  }
  await writeToken(token)
  return token
}

export async function clearToken(): Promise<void> {
  await rm(config.tokenFile, { force: true })
}

/**
 * Marks a token YNAB rejected as expired, keeping its refresh token so the next
 * getAccessToken() can refresh before falling back to the browser. Returns whether a retry
 * could get a different token.
 */
export async function invalidateToken(rejected: string): Promise<boolean> {
  if (config.accessToken) return false
  const token = await loadToken()
  // Another call has already replaced the rejected token
  if (token?.access_token !== rejected) return true
  await writeToken({ ...token, expires_at: 0 })
  return true
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret ?? '',
      redirect_uri: config.redirectUri,
      ...params
    })
  })
  if (!res.ok) {
    throw new Error(`YNAB token request failed: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as TokenResponse
}

// The Implicit grant returns the token in the URL fragment, which never reaches the server,
// so this page forwards it back to us.
const IMPLICIT_CALLBACK_PAGE = `<!doctype html>
<meta charset="utf-8">
<title>YNAB on FIRE MCP</title>
<body style="font-family: system-ui; background: #0f172a; color: #e2e8f0; padding: 2rem">
<p id="msg">Completing authorisation…</p>
<script>
  fetch('/ynab-mcp-server/token', { method: 'POST', body: location.hash.slice(1) })
    .then((r) => r.text())
    .then((t) => (document.getElementById('msg').textContent = t))
    .catch(() => (document.getElementById('msg').textContent = 'Could not reach the local MCP server.'))
  history.replaceState(null, '', location.pathname)
</script>
</body>`

/**
 * Runs the browser-based OAuth flow against a temporary localhost server and resolves with
 * the issued token. The redirect URI must be registered on the YNAB OAuth application.
 */
export function authorise(): Promise<StoredToken> {
  const state = randomBytes(16).toString('hex')
  const useCodeGrant = Boolean(config.clientSecret)
  const origin = new URL(config.redirectUri).origin
  let done = false

  return new Promise((resolve, reject) => {
    const finish = (err: Error | undefined, token?: StoredToken) => {
      done = true
      clearTimeout(timer)
      server.close()
      if (err) reject(err)
      else resolve(token!)
    }

    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', config.redirectUri)
      const reply = (status: number, body: string, type = 'text/plain') => {
        res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` })
        res.end(body)
      }

      // A kept-alive connection can still deliver requests after the flow has finished
      if (done) return reply(410, 'Authorisation already completed.')

      try {
        if (req.method === 'GET' && url.pathname === '/ynab-mcp-server') {
          if (!useCodeGrant) return reply(200, IMPLICIT_CALLBACK_PAGE, 'text/html')

          const params = url.searchParams
          if (params.get('state') !== state) return reply(400, 'Invalid OAuth state.')
          if (params.get('error'))
            throw new Error(`YNAB authorisation failed: ${params.get('error')}`)
          const token = await saveToken(
            await requestToken({ grant_type: 'authorization_code', code: params.get('code') ?? '' })
          )
          reply(200, 'Authorised with YNAB. You can close this tab.')
          return finish(undefined, token)
        }

        if (req.method === 'POST' && url.pathname === '/ynab-mcp-server/token' && !useCodeGrant) {
          // A cross-origin text/plain POST skips the CORS preflight, so check where it came from
          if (req.headers.origin !== origin) return reply(403, 'Forbidden')
          let body = ''
          for await (const chunk of req) body += chunk
          const params = new URLSearchParams(body)
          if (params.get('state') !== state) return reply(400, 'Invalid OAuth state.')
          if (params.get('error'))
            throw new Error(`YNAB authorisation failed: ${params.get('error')}`)
          const token = await saveToken({
            access_token: params.get('access_token') ?? undefined,
            expires_in: Number(params.get('expires_in'))
          })
          reply(200, 'Authorised with YNAB. You can close this tab.')
          return finish(undefined, token)
        }

        reply(404, 'Not found')
      } catch (err) {
        reply(500, (err as Error).message)
        finish(err as Error)
      }
    })

    const timer = setTimeout(
      () => finish(new Error('Timed out waiting for YNAB authorisation.')),
      config.authTimeoutMs
    )

    server.on('error', (err) => finish(err))
    server.listen(config.port, 'localhost', () => {
      const authUrl = new URL(config.authorizeUrl)
      authUrl.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: useCodeGrant ? 'code' : 'token',
        state
      }).toString()

      // stdout is reserved for the MCP protocol, so everything user-facing goes to stderr
      console.error(`Opening browser to authorise with YNAB:\n${authUrl}`)
      open(authUrl.toString()).catch(() => {
        console.error('Could not open a browser; visit the URL above manually.')
      })
    })
  })
}

let pending: Promise<StoredToken> | undefined

/** Returns a valid access token, refreshing or re-authorising as needed. */
export async function getAccessToken(): Promise<string> {
  if (config.accessToken) return config.accessToken

  const token = await loadToken()
  if (token && token.expires_at - EXPIRY_MARGIN_MS > Date.now()) return token.access_token

  // Share one in-flight flow between concurrent tool calls
  pending ??= (async () => {
    if (token?.refresh_token && config.clientSecret) {
      try {
        return await saveToken(
          await requestToken({ grant_type: 'refresh_token', refresh_token: token.refresh_token })
        )
      } catch (err) {
        console.error(`Token refresh failed, re-authorising: ${(err as Error).message}`)
      }
    }
    return authorise()
  })().finally(() => {
    pending = undefined
  })

  return (await pending).access_token
}
