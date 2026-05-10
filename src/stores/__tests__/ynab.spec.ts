import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { useYnabStore, YNAB_ACCESS_TOKEN } from '../ynab'

describe('ynab store', () => {
  beforeEach(() => {
    // creates a fresh pinia and makes it active
    // so it's automatically picked up by any useStore() call
    // without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })
  afterEach(() => {
    sessionStorage.clear()
  })

  it('starts as unauthorised', () => {
    const ynab = useYnabStore()
    expect(ynab.isAuthorised).toBe(false)
    expect(ynab.accessToken).toBeNull()
  })

  it('marks as authorised', async () => {
    const ynab = useYnabStore()
    ynab.markAuthorised('token-value')
    expect(ynab.isAuthorised).toBe(true)
    expect(ynab.accessToken).toBe('token-value')

    // the token is written async
    await flushPromises()
    expect(sessionStorage.getItem(YNAB_ACCESS_TOKEN)).toBe('token-value')
  })

  it('loads access token from session storage', () => {
    sessionStorage.setItem(YNAB_ACCESS_TOKEN, 'stored-access-token')
    const ynab = useYnabStore()
    expect(ynab.isAuthorised).toBe(true)
    expect(ynab.accessToken).toBe('stored-access-token')
  })

  it('loads the configuration', () => {
    const ynab = useYnabStore()
    expect(ynab.apiConfig.clientId).toBeTruthy()
    expect(ynab.apiConfig.redirectUri).toBeTruthy()
  })

  it('logs out', async () => {
    const ynab = useYnabStore()
    ynab.markAuthorised('test-token')
    ynab.selectedBudget = {
      id: 'budget_id',
      name: 'Budget Name'
    }
    ynab.budgets = [ynab.selectedBudget]
    ynab.months = [{ month: '2026-01-01' } as any]
    ynab.monthsError = 'some error'

    // the token is written async
    await flushPromises()

    ynab.logout()

    // the token is written async
    await flushPromises()

    expect(ynab.isAuthorised).toBe(false)
    expect(ynab.budgets).toStrictEqual([])
    expect(ynab.selectedBudget).toBeUndefined()
    expect(ynab.months).toStrictEqual([])
    expect(ynab.monthsError).toBeNull()
    expect(sessionStorage.getItem(YNAB_ACCESS_TOKEN)).toBe(null)
  })

  it('selects a budget and clears it', async () => {
    const ynab = useYnabStore()
    const budget = { id: 'b1', name: 'Budget 1' }
    ynab.selectBudget(budget as any)
    ynab.months = [{ month: '2026-01-01' } as any]
    ynab.monthsError = 'some error'
    expect(ynab.selectedBudget).toEqual(budget)

    ynab.clearSelectedBudget()
    expect(ynab.selectedBudget).toBeUndefined()
    expect(ynab.accounts).toEqual([])
    expect(ynab.selectedAccountIds).toEqual([])
    expect(ynab.months).toEqual([])
    expect(ynab.monthsError).toBeNull()
  })

  it('loadMonths does nothing when api is not initialised', async () => {
    const ynab = useYnabStore()
    ynab.months = [{ month: '2026-01-01' } as any]
    await ynab.loadMonths('budget_id')
    // api is null, so months and loading state must be unchanged
    expect(ynab.months).toHaveLength(1)
    expect(ynab.loadingMonths).toBe(false)
    expect(ynab.monthsError).toBeNull()
  })
})
