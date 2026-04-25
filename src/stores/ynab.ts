import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStorage } from '@vueuse/core'
import * as ynab from 'ynab'
import jsonConfig from '../ynab.config.json'

export const YNAB_ACCESS_TOKEN = 'YNAB_ACCESS_TOKEN'

export interface Ynab {
  clientId: string
  redirectUri: string
}

export const useYnabStore = defineStore('ynab', () => {
  const api = ref<ynab.api | null>(null)
  const apiConfig = ref<Ynab>({
    clientId: jsonConfig.clientId,
    redirectUri: jsonConfig.redirectUri
  })
  const accessToken = useSessionStorage<string>(YNAB_ACCESS_TOKEN, null)

  const loading = ref(false)
  const error = ref()

  const budgets = ref<ynab.BudgetSummary[]>([])
  const accounts = ref<ynab.Account[]>([])
  const selectedAccountIds = ref<string[]>([])
  const loadingAccounts = ref(false)
  const accountsError = ref()

  const selectedBudget = ref<ynab.BudgetSummary>()

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
  }

  function clearSelectedBudget() {
    selectedBudget.value = undefined
    accounts.value = []
    selectedAccountIds.value = []
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
    loadAccounts
  }
})
