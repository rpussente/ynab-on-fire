import { beforeEach, describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useYnabStore } from '../ynab'

describe('ynab store', () => {
  beforeEach(() => {
    // creates a fresh pinia and makes it active
    // so it's automatically picked up by any useStore() call
    // without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('starts as unauthorised', () => {
    const ynab = useYnabStore()
    expect(ynab.isAuthorised).toBe(false)
  })

  it('marks as authorised', () => {
    const ynab = useYnabStore()
    ynab.markAuthorised('token-value')
    expect(ynab.isAuthorised).toBe(true)
    expect(ynab.ynab.token).toBe('token-value')
  })

  it('loads the configuration', () => {
    const ynab = useYnabStore()
    expect(ynab.ynab.clientId).toBeTruthy()
    expect(ynab.ynab.redirectUri).toBeTruthy()
  })
})
