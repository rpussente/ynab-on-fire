<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useYnabStore } from '@/stores/ynab'

const emit = defineEmits<{ 'change-accounts': [] }>()

const ynab = useYnabStore()
const withdrawalRate = ref(4)
const rates = [3.5, 4, 4.5, 5]

onMounted(() => {
  if (ynab.selectedBudget) {
    ynab.loadMonths(ynab.selectedBudget.id)
  }
})

const formatCurrency = (amount: number) => {
  const isoCode = ynab.selectedBudget?.currency_format?.iso_code ?? 'GBP'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: isoCode }).format(amount)
}

const portfolioValue = computed(
  () =>
    ynab.accounts
      .filter((a) => ynab.selectedAccountIds.includes(a.id))
      .reduce((sum, a) => sum + a.balance, 0) / 1000
)

const last12Months = computed(() => {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  return ynab.months
    .filter((m) => m.month < currentMonth)
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12)
})

const avgMonthlyIncome = computed(() => {
  if (last12Months.value.length === 0) return 0
  return last12Months.value.reduce((sum, m) => sum + m.income, 0) / last12Months.value.length / 1000
})

const annualIncomeNeeded = computed(() => avgMonthlyIncome.value * 12)

const retirementTarget = computed(() => {
  if (withdrawalRate.value === 0 || annualIncomeNeeded.value === 0) return 0
  return annualIncomeNeeded.value / (withdrawalRate.value / 100)
})

const fireProgress = computed(() => {
  if (retirementTarget.value === 0) return 0
  return Math.min(100, (portfolioValue.value / retirementTarget.value) * 100)
})

const remaining = computed(() => Math.max(0, retirementTarget.value - portfolioValue.value))

const hasReachedFire = computed(
  () => retirementTarget.value > 0 && portfolioValue.value >= retirementTarget.value
)

const hasNoData = computed(
  () => !ynab.loadingMonths && last12Months.value.length === 0 && !ynab.monthsError
)
</script>

<template>
  <div class="py-12 px-4 max-w-4xl mx-auto">
    <div class="flex items-start justify-between mb-10">
      <div>
        <p class="text-slate-400 text-sm font-medium uppercase tracking-widest mb-1">
          FIRE Dashboard
        </p>
        <h2 class="text-3xl font-bold text-white">{{ ynab.selectedBudget?.name }}</h2>
      </div>
      <div class="flex gap-4 mt-2">
        <button
          @click="emit('change-accounts')"
          class="text-indigo-400 hover:text-indigo-300 font-medium transition-colors text-sm"
        >
          &larr; Change accounts
        </button>
        <button
          @click="ynab.clearSelectedBudget()"
          class="text-slate-400 hover:text-white font-medium transition-colors text-sm"
        >
          Back to budgets
        </button>
      </div>
    </div>

    <div v-if="ynab.loadingMonths" class="flex items-center justify-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent"
      />
    </div>

    <div
      v-else-if="ynab.monthsError"
      class="bg-red-900/30 border border-red-700 rounded-xl p-6 text-red-300"
    >
      {{ ynab.monthsError }}
    </div>

    <div v-else-if="hasNoData" class="text-center py-20 text-slate-400">
      <p class="text-lg mb-2">No historical data found.</p>
      <p class="text-sm">Add transactions to your YNAB budget to see your FIRE status.</p>
    </div>

    <div v-else class="space-y-6">
      <div>
        <h3 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Income Needed in Retirement
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-800 rounded-xl p-6">
            <p class="text-slate-400 text-sm mb-1">Monthly</p>
            <p class="text-2xl font-bold text-white">{{ formatCurrency(avgMonthlyIncome) }}</p>
          </div>
          <div class="bg-slate-800 rounded-xl p-6">
            <p class="text-slate-400 text-sm mb-1">Annual</p>
            <p class="text-2xl font-bold text-white">{{ formatCurrency(annualIncomeNeeded) }}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Your Portfolio ({{ ynab.selectedAccountIds.length }} accounts)
        </h3>
        <div class="bg-slate-800 rounded-xl p-6">
          <p class="text-slate-400 text-sm mb-1">Current Value</p>
          <p class="text-3xl font-bold text-white">{{ formatCurrency(portfolioValue) }}</p>
        </div>
      </div>

      <div>
        <h3 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Withdrawal Rate
        </h3>
        <div class="flex gap-2">
          <button
            v-for="rate in rates"
            :key="rate"
            @click="withdrawalRate = rate"
            :class="[
              'px-5 py-2 rounded-lg font-semibold text-sm transition-colors',
              withdrawalRate === rate
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            ]"
          >
            {{ rate }}%
          </button>
        </div>
      </div>

      <div>
        <h3 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Retirement Target &mdash; {{ withdrawalRate }}% rate =
          {{ (100 / withdrawalRate).toFixed(1) }}&times; annual income
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-800 rounded-xl p-6">
            <p class="text-slate-400 text-sm mb-1">Target</p>
            <p class="text-2xl font-bold text-white">{{ formatCurrency(retirementTarget) }}</p>
          </div>
          <div class="bg-slate-800 rounded-xl p-6">
            <template v-if="hasReachedFire">
              <p class="text-slate-400 text-sm mb-1">Status</p>
              <p class="text-2xl font-bold text-green-400">You've reached FIRE!</p>
            </template>
            <template v-else>
              <p class="text-slate-400 text-sm mb-1">Remaining</p>
              <p class="text-2xl font-bold text-white">{{ formatCurrency(remaining) }}</p>
            </template>
          </div>
        </div>
      </div>

      <div>
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            FIRE Progress
          </h3>
          <span class="text-white font-bold text-sm">{{ fireProgress.toFixed(1) }}%</span>
        </div>
        <div class="h-4 bg-slate-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            :style="{ width: `${fireProgress}%` }"
          />
        </div>
        <p v-if="hasReachedFire" class="text-green-400 text-sm mt-3 text-center font-medium">
          Congratulations — you are financially independent!
        </p>
      </div>

      <p class="text-slate-500 text-xs text-center">
        Based on average monthly income over {{ last12Months.length }} months of YNAB data
      </p>
    </div>
  </div>
</template>
