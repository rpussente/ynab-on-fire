import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as ynab from 'ynab'
import { z } from 'zod'
import { getAccessToken, invalidateToken } from './auth.js'

// Fields the YNAB API returns in milliunits (1/1000 of the currency unit)
const MILLIUNIT_FIELDS = new Set([
  'amount',
  'balance',
  'cleared_balance',
  'uncleared_balance',
  'budgeted',
  'activity',
  'income',
  'to_be_budgeted',
  'goal_target',
  'goal_under_funded',
  'goal_overall_funded',
  'goal_overall_left',
  'debt_original_balance'
])

// Fields holding a { [date]: milliunits } map (interest rates are milliunits of a percent)
const MILLIUNIT_MAPS = new Set([
  'debt_minimum_payments',
  'debt_escrow_amounts',
  'debt_interest_rates'
])

/** Converts milliunits to currency amounts and drops deleted entities. */
function normalise(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !(item && typeof item === 'object' && 'deleted' in item && item.deleted))
      .map((item) => normalise(item))
  }
  if (value && typeof value === 'object' && key && MILLIUNIT_MAPS.has(key)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, typeof v === 'number' ? v / 1000 : v])
    )
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalise(v, k)]))
  }
  if (typeof value === 'number' && key && MILLIUNIT_FIELDS.has(key)) return value / 1000
  return value
}

function isUnauthorised(err: unknown): boolean {
  return (err as { error?: { id?: string } })?.error?.id === '401'
}

async function callYnab<T>(fn: (api: ynab.API) => Promise<T>): Promise<T> {
  const token = await getAccessToken()
  try {
    return await fn(new ynab.API(token))
  } catch (err) {
    // Token was revoked or expired early: refresh or authorise again, once
    if (!isUnauthorised(err) || !(await invalidateToken(token))) throw err
    return fn(new ynab.API(await getAccessToken()))
  }
}

function errorMessage(err: unknown): string {
  const detail = (err as { error?: { detail?: string } })?.error?.detail
  return detail ?? (err instanceof Error ? err.message : JSON.stringify(err))
}

function tool<Args>(fn: (args: Args) => Promise<unknown>) {
  return async (args: Args) => {
    try {
      const data = normalise(await fn(args))
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: errorMessage(err) }], isError: true }
    }
  }
}

const planId = z
  .string()
  .default('last-used')
  .describe('Budget (plan) ID from list_budgets, or "last-used" / "default"')

const AMOUNTS_NOTE = 'Monetary amounts are in currency units (already converted from milliunits).'

export function registerTools(server: McpServer) {
  server.registerTool(
    'list_budgets',
    {
      description: 'List the YNAB budgets (plans) the user has access to.',
      inputSchema: {}
    },
    tool(() => callYnab(async (api) => (await api.plans.getPlans()).data))
  )

  server.registerTool(
    'list_accounts',
    {
      description: `List accounts in a budget with their balances. ${AMOUNTS_NOTE}`,
      inputSchema: { plan_id: planId }
    },
    tool(({ plan_id }) => callYnab(async (api) => (await api.accounts.getAccounts(plan_id)).data))
  )

  server.registerTool(
    'list_categories',
    {
      description: `List category groups and categories for the current month, including budgeted, activity and balance. ${AMOUNTS_NOTE}`,
      inputSchema: { plan_id: planId }
    },
    tool(({ plan_id }) =>
      callYnab(async (api) => (await api.categories.getCategories(plan_id)).data)
    )
  )

  server.registerTool(
    'list_months',
    {
      description: `List monthly summaries (income, budgeted, activity, age of money) for a budget. ${AMOUNTS_NOTE}`,
      inputSchema: { plan_id: planId }
    },
    tool(({ plan_id }) => callYnab(async (api) => (await api.months.getPlanMonths(plan_id)).data))
  )

  server.registerTool(
    'get_month',
    {
      description: `Get a single budget month, including per-category figures. ${AMOUNTS_NOTE}`,
      inputSchema: {
        plan_id: planId,
        month: z
          .string()
          .default('current')
          .describe('Month in ISO format (YYYY-MM-01), or "current"')
      }
    },
    tool(({ plan_id, month }) =>
      callYnab(async (api) => (await api.months.getPlanMonth(plan_id, month)).data)
    )
  )

  server.registerTool(
    'list_transactions',
    {
      description: `List transactions in a budget, optionally filtered by account or category (not both). ${AMOUNTS_NOTE}`,
      inputSchema: {
        plan_id: planId,
        since_date: z
          .string()
          .optional()
          .describe('Only include transactions on or after this date (YYYY-MM-DD)'),
        until_date: z
          .string()
          .optional()
          .describe('Only include transactions on or before this date (YYYY-MM-DD)'),
        account_id: z.string().optional().describe('Only include transactions for this account'),
        category_id: z.string().optional().describe('Only include transactions for this category')
      }
    },
    tool(({ plan_id, since_date, until_date, account_id, category_id }) =>
      callYnab(async (api) => {
        if (account_id && category_id) {
          throw new Error('Filter by account_id or category_id, not both.')
        }
        if (account_id) {
          return (
            await api.transactions.getTransactionsByAccount(
              plan_id,
              account_id,
              since_date,
              until_date
            )
          ).data
        }
        if (category_id) {
          return (
            await api.transactions.getTransactionsByCategory(
              plan_id,
              category_id,
              since_date,
              until_date
            )
          ).data
        }
        return (await api.transactions.getTransactions(plan_id, since_date, until_date)).data
      })
    )
  )
}
