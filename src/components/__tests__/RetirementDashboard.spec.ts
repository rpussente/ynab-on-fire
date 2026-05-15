import { beforeEach, describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useYnabStore } from '@/stores/ynab'
import RetirementDashboard from '../RetirementDashboard.vue'

describe('RetirementDashboard', () => {
  let ynab: ReturnType<typeof useYnabStore>

  const makeMonth = (monthsAgo: number, income: number, deleted = false, activity = -income) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - monthsAgo)
    return {
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      income,
      budgeted: income,
      activity,
      to_be_budgeted: 0,
      deleted
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    ynab = useYnabStore()
    ynab.selectedBudget = {
      id: 'b1',
      name: 'Test Budget',
      currency_format: { iso_code: 'GBP' }
    } as any
    ynab.accounts = [
      { id: 'acc1', balance: 10_000_000, closed: false, deleted: false } as any,
      { id: 'acc2', balance: 20_000_000, closed: false, deleted: false } as any
    ]
    ynab.selectedAccountIds = ['acc1', 'acc2']
    // 12 months at £2,000/month income (2,000,000 milliunits each)
    ynab.months = Array.from({ length: 12 }, (_, i) => makeMonth(i + 1, 2_000_000)) as any
  })

  it('shows spinner while loading months', () => {
    ynab.loadingMonths = true
    const wrapper = mount(RetirementDashboard)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('shows error message on load failure', () => {
    ynab.monthsError = 'Failed to load monthly data'
    const wrapper = mount(RetirementDashboard)
    expect(wrapper.text()).toContain('Failed to load monthly data')
  })

  it('shows no-data message when months list is empty', () => {
    ynab.months = []
    const wrapper = mount(RetirementDashboard)
    expect(wrapper.text()).toContain('No historical data found')
  })

  it('renders correct portfolio value from selected accounts', () => {
    const wrapper = mount(RetirementDashboard)
    // (10,000,000 + 20,000,000) / 1000 = £30,000
    expect(wrapper.text()).toContain('30,000')
  })

  it('renders correct monthly income needed', () => {
    const wrapper = mount(RetirementDashboard)
    // avg 2,000,000 milliunits / 1000 = £2,000
    expect(wrapper.text()).toContain('£2,000')
  })

  it('renders correct retirement target at 4% withdrawal rate', () => {
    const wrapper = mount(RetirementDashboard)
    // annual = £2,000 × 12 = £24,000; target = £24,000 / 0.04 = £600,000
    expect(wrapper.text()).toContain('600,000')
  })

  it('renders correct remaining to FIRE', () => {
    const wrapper = mount(RetirementDashboard)
    // £600,000 - £30,000 = £570,000
    expect(wrapper.text()).toContain('570,000')
  })

  it('renders correct FIRE progress percentage', () => {
    const wrapper = mount(RetirementDashboard)
    // £30,000 / £600,000 = 5.0%
    expect(wrapper.text()).toContain('5.0%')
  })

  it('excludes deleted months from income average', () => {
    ynab.months = [
      makeMonth(1, 3_000_000), // £3,000 — valid
      makeMonth(2, 9_000_000, true) // deleted — must not affect average
    ] as any
    const wrapper = mount(RetirementDashboard)
    // avg = £3,000 monthly → annual £36,000 (not £72,000 if deleted were included)
    expect(wrapper.text()).toContain('36,000')
    expect(wrapper.text()).not.toContain('72,000')
  })

  it('updates retirement target when withdrawal rate changes', async () => {
    const wrapper = mount(RetirementDashboard)
    // Default 4%: annual £24,000 → target £600,000
    expect(wrapper.text()).toContain('600,000')

    // Switch to 5%: target = £24,000 / 0.05 = £480,000
    const fiveBtn = wrapper.findAll('button').find((b) => b.text().trim() === '5%')
    await fiveBtn!.trigger('click')
    expect(wrapper.text()).toContain('480,000')
  })

  it('emits change-accounts when navigation button clicked', async () => {
    const wrapper = mount(RetirementDashboard)
    const changeBtn = wrapper.findAll('button').find((b) => b.text().includes('Change accounts'))
    await changeBtn!.trigger('click')
    expect(wrapper.emitted('change-accounts')).toBeTruthy()
  })

  describe('FIRE projection', () => {
    it('shows avg monthly savings when net savings are positive', () => {
      // income £2,000, spending £1,500 → net £500/month
      ynab.months = Array.from({ length: 12 }, (_, i) =>
        makeMonth(i + 1, 2_000_000, false, -1_500_000)
      ) as any
      const wrapper = mount(RetirementDashboard)
      expect(wrapper.text()).toContain('£500')
    })

    it('shows estimated FIRE date as a year', () => {
      ynab.months = Array.from({ length: 12 }, (_, i) =>
        makeMonth(i + 1, 2_000_000, false, -1_500_000)
      ) as any
      const wrapper = mount(RetirementDashboard)
      expect(wrapper.text()).toMatch(/20\d\d/)
    })

    it('shows "years away" label', () => {
      ynab.months = Array.from({ length: 12 }, (_, i) =>
        makeMonth(i + 1, 2_000_000, false, -1_500_000)
      ) as any
      const wrapper = mount(RetirementDashboard)
      expect(wrapper.text()).toContain('years away')
    })

    it('shows warning when net savings are zero or negative', () => {
      // spending equals income → net £0
      ynab.months = Array.from({ length: 12 }, (_, i) => makeMonth(i + 1, 2_000_000)) as any
      const wrapper = mount(RetirementDashboard)
      expect(wrapper.text()).toContain('spending exceeds income')
    })

    it('shows warning when spending exceeds income', () => {
      // spending more than income → net -£1,000
      ynab.months = Array.from({ length: 12 }, (_, i) =>
        makeMonth(i + 1, 2_000_000, false, -3_000_000)
      ) as any
      const wrapper = mount(RetirementDashboard)
      expect(wrapper.text()).toContain('spending exceeds income')
    })

    it('hides projection when already at FIRE', () => {
      // portfolio of £600,000 meets the £600k target at 4%
      ynab.accounts = [{ id: 'acc1', balance: 600_000_000, closed: false, deleted: false }] as any
      ynab.selectedAccountIds = ['acc1']
      ynab.months = Array.from({ length: 12 }, (_, i) =>
        makeMonth(i + 1, 2_000_000, false, -1_500_000)
      ) as any
      const wrapper = mount(RetirementDashboard)
      expect(wrapper.text()).not.toContain('FIRE Projection')
      expect(wrapper.text()).not.toContain('spending exceeds income')
    })

    it('shows FIRE projection heading when savings are positive', () => {
      ynab.months = Array.from({ length: 12 }, (_, i) =>
        makeMonth(i + 1, 2_000_000, false, -1_000_000)
      ) as any
      const wrapper = mount(RetirementDashboard)
      expect(wrapper.text()).toContain('FIRE Projection')
    })
  })
})
