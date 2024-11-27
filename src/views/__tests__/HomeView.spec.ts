import { beforeEach, describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import HomeView from '../HomeView.vue'
import BudgetList from '@/components/BudgetList.vue'

import { useYnabStore } from '@/stores/ynab'

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('suggests to select a budget', () => {
    const wrapper = mount(HomeView)

    expect(wrapper.findComponent(BudgetList).isVisible()).toBe(true)
  })

  it('selects a budget', async () => {
    const ynabStore = useYnabStore()
    ynabStore.budgets = [
      { id: 'budget_1', name: 'Budget 1' },
      { id: 'budget_2', name: 'Budget 2' }
    ]

    const wrapper = mount(HomeView)

    await wrapper.find('#budget_2').trigger('click')

    expect(ynabStore.selectedBudget?.id).toBe('budget_2')
    expect(wrapper.findComponent(BudgetList).exists()).toBe(false)
  })
})
