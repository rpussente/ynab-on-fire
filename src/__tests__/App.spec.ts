import { beforeEach, describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import App from '../App.vue'
import router from '../router'

import { useYnabStore } from '@/stores/ynab'

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders properly', () => {
    const ynab = useYnabStore()
    mount(App, { global: { plugins: [router] } })
    expect(ynab.isAuthorised).toBe(false)
  })

  it('parses access token', async () => {
    router.push('/#access_token=token-value&other_property=ignored')
    await router.isReady()

    const ynab = useYnabStore()

    const wrapper = mount(App, { global: { plugins: [router] } })

    await router.isReady()

    expect(ynab.isAuthorised).toBe(true)
    expect(ynab.accessToken).toBe('token-value')

    // Required to wait for router.push
    await flushPromises()

    expect(wrapper.vm.$route.path).toBe('/')
    expect(wrapper.vm.$route.hash).toBe('')
  })

  it('clears selected budget', async () => {
    const ynab = useYnabStore()
    ynab.markAuthorised('test-token')
    ynab.selectedBudget = {
      id: 'budget_1',
      name: 'Budget 1'
    }

    const wrapper = mount(App, { global: { plugins: [router] } })

    await wrapper.find('#budget_switch').trigger('click')

    expect(ynab.selectedBudget).toBeUndefined()
  })
})
