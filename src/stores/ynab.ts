import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage, useSessionStorage } from '@vueuse/core'
import * as ynab from 'ynab'
import jsonConfig from '../ynab.config.json'

export const YNAB_ACCESS_TOKEN = 'YNAB_ACCESS_TOKEN'
const SELECTED_ACCOUNT_IDS_KEY = 'ynab-on-fire:selected-account-ids'
const SELECTED_CATEGORY_IDS_KEY = 'ynab-on-fire:selected-category-ids'

/** YNAB rejects very large payloads, so long exports go up in batches. */
const IMPORT_BATCH_SIZE = 500

export interface Ynab {
  clientId: string
  redirectUri: string
}

/**
 * Pull the human-readable `detail` out of a YNAB API error, which arrives as
 * `{ error: { id, name, detail } }`. Returns null for anything else, so callers
 * can fall back to their own message.
 */
function extractApiErrorDetail(err: unknown): string | null {
  const detail = (err as { error?: { detail?: unknown } })?.error?.detail
  return typeof detail === 'string' && detail !== '' ? detail : null
}

export interface ImportResult {
  /** Transactions YNAB actually created. */
  imported: number
  /** Transactions YNAB already held under the same import_id. */
  duplicates: number
}

export const useYnabStore = defineStore('ynab', () => {
  const api = ref<ynab.api | null>(null)
  const apiConfig = ref<Ynab>({
    clientId: jsonConfig.clientId,
    redirectUri: import.meta.env.VITE_REDIRECT_URI ?? jsonConfig.redirectUri
  })
  const accessToken = useSessionStorage<string>(YNAB_ACCESS_TOKEN, null)

  const loading = ref(false)
  const error = ref()

  const budgets = ref<ynab.BudgetSummary[]>([])
  const accounts = ref<ynab.Account[]>([])
  const selectedAccountIds = useLocalStorage<string[]>(SELECTED_ACCOUNT_IDS_KEY, [])
  const loadingAccounts = ref(false)
  const accountsError = ref()

  const selectedBudget = ref<ynab.BudgetSummary>()

  const months = ref<ynab.MonthSummary[]>([])
  const loadingMonths = ref(false)
  const monthsError = ref<string | null>(null)

  const categoryGroups = ref<ynab.CategoryGroupWithCategories[]>([])
  const selectedCategoryIds = useLocalStorage<string[]>(SELECTED_CATEGORY_IDS_KEY, [])
  const loadingCategories = ref(false)
  const categoriesError = ref<string | null>(null)

  const importingTransactions = ref(false)
  const importError = ref<string | null>(null)
  const importResult = ref<ImportResult | null>(null)

  const authUri = computed(
    () =>
      `https://app.ynab.com/oauth/authorize?client_id=${apiConfig.value.clientId}&redirect_uri=${apiConfig.value.redirectUri}&response_type=token`
  )
  const isAuthorised = computed(() => accessToken.value != null)

  function markAuthorised(token: string) {
    accessToken.value = token
    api.value = new ynab.api(token)
    loadBudgets()
  }

  function logout() {
    accessToken.value = null
    budgets.value = []
    selectedBudget.value = undefined
    accounts.value = []
    selectedAccountIds.value = []
    months.value = []
    monthsError.value = null
    categoryGroups.value = []
    selectedCategoryIds.value = []
    categoriesError.value = null
    importError.value = null
    importResult.value = null
  }

  function clearSelectedBudget() {
    selectedBudget.value = undefined
    accounts.value = []
    selectedAccountIds.value = []
    months.value = []
    monthsError.value = null
    categoryGroups.value = []
    selectedCategoryIds.value = []
    categoriesError.value = null
    importError.value = null
    importResult.value = null
  }

  function selectBudget(budget: ynab.BudgetSummary) {
    selectedBudget.value = budget
    loadAccounts(budget.id)
  }

  function loadBudgets() {
    if (api.value != null) {
      loading.value = true
      api.value.budgets
        .getBudgets()
        .then((res) => {
          budgets.value = res.data.budgets
        })
        .catch((err) => {
          error.value = err.error.detail
        })
        .finally(() => {
          loading.value = false
        })
    }
  }

  function loadAccounts(budgetId: string) {
    if (api.value != null) {
      loadingAccounts.value = true
      api.value.accounts
        .getAccounts(budgetId)
        .then((res) => {
          accounts.value = res.data.accounts
        })
        .catch((err) => {
          accountsError.value = err.error.detail
        })
        .finally(() => {
          loadingAccounts.value = false
        })
    }
  }

  async function loadCategories(budgetId: string) {
    if (api.value == null) return
    loadingCategories.value = true
    categoriesError.value = null
    try {
      const res = await api.value.categories.getCategories(budgetId)
      categoryGroups.value = res.data.category_groups
    } catch {
      categoriesError.value = 'Failed to load categories'
    } finally {
      loadingCategories.value = false
    }
  }

  async function loadMonths(budgetId: string) {
    if (api.value == null) return
    loadingMonths.value = true
    monthsError.value = null
    try {
      const response = await api.value.months.getBudgetMonths(budgetId)
      months.value = response.data.months
    } catch {
      monthsError.value = 'Failed to load monthly data'
    } finally {
      loadingMonths.value = false
    }
  }

  /**
   * Create transactions in YNAB.
   *
   * Each transaction should carry an `import_id`; YNAB scopes that key per
   * account and silently declines any it already holds, reporting them in
   * `duplicate_import_ids`. That is what makes re-importing an overlapping
   * date range safe.
   */
  async function importTransactions(budgetId: string, transactions: ynab.NewTransaction[]) {
    if (api.value == null) return null
    importingTransactions.value = true
    importError.value = null
    importResult.value = null
    try {
      let imported = 0
      let duplicates = 0
      for (let i = 0; i < transactions.length; i += IMPORT_BATCH_SIZE) {
        const batch = transactions.slice(i, i + IMPORT_BATCH_SIZE)
        const res = await api.value.transactions.createTransaction(budgetId, {
          transactions: batch
        })
        imported += res.data.transactions?.length ?? 0
        duplicates += res.data.duplicate_import_ids?.length ?? 0
      }
      importResult.value = { imported, duplicates }
      return importResult.value
    } catch (err) {
      // Surface YNAB's own explanation when there is one — an expired token or
      // a rejected field is far more actionable than a generic failure.
      importError.value = extractApiErrorDetail(err) ?? 'Failed to import transactions'
      return null
    } finally {
      importingTransactions.value = false
    }
  }

  function clearImportResult() {
    importError.value = null
    importResult.value = null
  }

  if (isAuthorised.value) {
    api.value = new ynab.api(accessToken.value)
    loadBudgets()
  }

  return {
    apiConfig,
    accessToken,
    authUri,
    isAuthorised,
    markAuthorised,
    logout,
    selectedBudget,
    clearSelectedBudget,
    selectBudget,
    budgets,
    accounts,
    selectedAccountIds,
    loadingAccounts,
    accountsError,
    loadAccounts,
    months,
    loadingMonths,
    monthsError,
    loadMonths,
    categoryGroups,
    selectedCategoryIds,
    loadingCategories,
    categoriesError,
    loadCategories,
    importingTransactions,
    importError,
    importResult,
    importTransactions,
    clearImportResult
  }
})
