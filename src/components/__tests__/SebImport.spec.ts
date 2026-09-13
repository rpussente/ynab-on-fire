import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { config, mount, RouterLinkStub, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useYnabStore } from '@/stores/ynab'
import SebImport from '../SebImport.vue'
import fixture from '@/utils/__tests__/fixtures/seb-export.csv?raw'

config.global.stubs = { RouterLink: RouterLinkStub }

/**
 * jsdom's File lacks `.text()`/`.arrayBuffer()` in this environment, so stand in
 * a minimal object with the shape `readSebFile` actually uses.
 */
const makeFile = (content: string, name = 'seb-export.csv') =>
  ({
    name,
    text: () => Promise.resolve(content),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(content).buffer)
  }) as unknown as File

describe('SebImport', () => {
  let ynab: ReturnType<typeof useYnabStore>

  const dropFile = async (wrapper: ReturnType<typeof mount>, content: string) => {
    await wrapper
      .find('[class*="border-dashed"]')
      .trigger('drop', { dataTransfer: { files: [makeFile(content)] } })
    await flushPromises()
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    ynab = useYnabStore()
    ynab.selectedBudget = {
      id: 'b1',
      name: 'Test Budget',
      currency_format: { iso_code: 'SEK' }
    } as never
    ynab.accounts = [
      { id: 'acc1', name: 'SEB Privatkonto', type: 'checking', balance: 45_678_900 },
      { id: 'acc2', name: 'Closed One', type: 'checking', balance: 0, closed: true }
    ] as never
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('lists only open accounts as import targets', () => {
    const wrapper = mount(SebImport)

    expect(wrapper.text()).toContain('SEB Privatkonto')
    expect(wrapper.text()).not.toContain('Closed One')
  })

  it('shows a spinner while accounts load', () => {
    ynab.loadingAccounts = true
    const wrapper = mount(SebImport)

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('shows an error when accounts fail to load', () => {
    ynab.accountsError = 'Boom'
    const wrapper = mount(SebImport)

    expect(wrapper.text()).toContain('Boom')
  })

  it('disables the import button until a file and account are chosen', () => {
    const wrapper = mount(SebImport)
    const button = wrapper.find('button[disabled]')

    expect(button.exists()).toBe(true)
  })

  it('previews the parsed transactions after a file is dropped', async () => {
    const wrapper = mount(SebImport)
    await dropFile(wrapper, fixture)

    expect(wrapper.text()).toContain('ICA KVANTUM VÄSTERÅS')
    expect(wrapper.text()).toContain('Swish till Åsa Öberg')
    expect(wrapper.text()).toContain('2026-08-28')
    // Four rows, none excluded yet.
    expect(wrapper.findAll('tbody tr')).toHaveLength(4)
  })

  it('reports rows it could not read', async () => {
    const wrapper = mount(SebImport)
    await dropFile(
      wrapper,
      ['Bokföringsdatum;Text;Belopp', '2026-08-28;ICA;-100,00', 'trasig rad;;'].join('\n')
    )

    expect(wrapper.text()).toContain('1 row could not be read')
  })

  it('explains when a file yields no transactions at all', async () => {
    const wrapper = mount(SebImport)
    await dropFile(wrapper, 'this is not a bank export\nnor is this line')

    expect(wrapper.text()).toContain('No transactions could be read from this file')
  })

  it('excludes a row when it is clicked and drops it from the count', async () => {
    const wrapper = mount(SebImport)
    await dropFile(wrapper, fixture)
    expect(wrapper.text()).toContain('Import 4 Transactions')

    await wrapper.findAll('tbody tr')[0].trigger('click')

    expect(wrapper.text()).toContain('Import 3 Transactions')
    // The row stays visible, just deselected.
    expect(wrapper.findAll('tbody tr')).toHaveLength(4)
  })

  it('sends correctly mapped transactions to the store', async () => {
    const spy = vi.spyOn(ynab, 'importTransactions').mockResolvedValue({
      imported: 4,
      duplicates: 0
    })

    const wrapper = mount(SebImport)
    await wrapper.find('#import-account-acc1').trigger('click')
    await dropFile(wrapper, fixture)

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Import 4'))!
      .trigger('click')
    await flushPromises()

    expect(spy).toHaveBeenCalledTimes(1)
    const [budgetId, transactions] = spy.mock.calls[0]

    expect(budgetId).toBe('b1')
    expect(transactions).toHaveLength(4)
    expect(transactions[0]).toMatchObject({
      account_id: 'acc1',
      date: '2026-08-28',
      amount: -1_234_500,
      payee_name: 'ICA KVANTUM VÄSTERÅS',
      cleared: 'cleared',
      // Left unapproved so the user reviews them in YNAB.
      approved: false,
      import_id: 'YNAB:-1234500:2026-08-28:1'
    })
  })

  it('only sends the rows still selected', async () => {
    const spy = vi.spyOn(ynab, 'importTransactions').mockResolvedValue({
      imported: 3,
      duplicates: 0
    })

    const wrapper = mount(SebImport)
    await wrapper.find('#import-account-acc1').trigger('click')
    await dropFile(wrapper, fixture)
    await wrapper.findAll('tbody tr')[0].trigger('click')

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Import 3'))!
      .trigger('click')
    await flushPromises()

    const [, transactions] = spy.mock.calls[0]
    expect(transactions).toHaveLength(3)
    expect(transactions.map((t) => t.payee_name)).not.toContain('ICA KVANTUM VÄSTERÅS')
  })

  it('truncates a long payee name and keeps the full text in the memo', async () => {
    const longText = 'A'.repeat(80)
    const spy = vi.spyOn(ynab, 'importTransactions').mockResolvedValue({
      imported: 1,
      duplicates: 0
    })

    const wrapper = mount(SebImport)
    await wrapper.find('#import-account-acc1').trigger('click')
    await dropFile(
      wrapper,
      ['Bokföringsdatum;Text;Belopp', `2026-08-28;${longText};-100,00`].join('\n')
    )

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Import 1'))!
      .trigger('click')
    await flushPromises()

    const [, transactions] = spy.mock.calls[0]
    expect(transactions[0].payee_name).toHaveLength(50)
    expect(transactions[0].memo).toBe(longText)
  })

  it('reports the outcome, including duplicates YNAB already held', async () => {
    ynab.importResult = { imported: 3, duplicates: 1 }
    const wrapper = mount(SebImport)

    expect(wrapper.text()).toContain('Import complete')
    expect(wrapper.text()).toContain('3 transactions added')
    expect(wrapper.text()).toContain('1 already in YNAB')
  })

  it('shows an import failure', () => {
    ynab.importError = 'Failed to import transactions'
    const wrapper = mount(SebImport)

    expect(wrapper.text()).toContain('Failed to import transactions')
  })
})
