import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { useSessionStorage } from '@vueuse/core'
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
})
