<script setup lang="ts">
import { ref, watch } from 'vue'
import { useYnabStore } from '@/stores/ynab'
import BudgetList from '@/components/BudgetList.vue'
import AccountList from '@/components/AccountList.vue'
import CategoryList from '@/components/CategoryList.vue'
import RetirementDashboard from '@/components/RetirementDashboard.vue'
import LockIcon from '@/components/icons/LockIcon.vue'

const ynab = useYnabStore()
const isAccountsConfirmed = ref(ynab.selectedAccountIds.length > 0)
const isCategoriesConfirmed = ref(ynab.selectedCategoryIds.length > 0)

watch(
  () => ynab.selectedBudget,
  () => {
    isAccountsConfirmed.value = ynab.selectedAccountIds.length > 0
    isCategoriesConfirmed.value = ynab.selectedCategoryIds.length > 0
  }
)

function resetToAccounts() {
  isAccountsConfirmed.value = false
  isCategoriesConfirmed.value = false
}
</script>

<template>
  <div v-if="!ynab.isAuthorised" class="flex flex-col items-center justify-center py-20 px-4">
    <div class="text-6xl mb-8 animate-pulse text-indigo-500 w-24 h-24">
      <LockIcon />
    </div>
    <h1 class="text-4xl md:text-5xl font-bold text-white mb-6 text-center tracking-tight">
      Ready to see your
      <span class="bg-linear-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent"
        >Budget on Fire?</span
      >
    </h1>
    <p class="text-slate-400 text-lg md:text-xl max-w-xl mx-auto text-center mb-10 leading-relaxed">
      Connect your YNAB account to securely analyse your budgets and discover insights with a
      premium dashboard.
    </p>
    <a
      v-bind:href="ynab.authUri"
      class="px-8 py-4 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg transition-all shadow-2xl shadow-indigo-500/25 active:scale-95"
    >
      Authorise with YNAB
    </a>
  </div>
  <RetirementDashboard
    v-else-if="ynab.selectedBudget && isAccountsConfirmed && isCategoriesConfirmed"
    @change-categories="isCategoriesConfirmed = false"
    @change-accounts="resetToAccounts"
  />
  <CategoryList
    v-else-if="ynab.selectedBudget && isAccountsConfirmed"
    @confirm="isCategoriesConfirmed = true"
    @back="isAccountsConfirmed = false"
  />
  <AccountList v-else-if="ynab.selectedBudget" @confirm="isAccountsConfirmed = true" />
  <BudgetList v-else />
</template>
