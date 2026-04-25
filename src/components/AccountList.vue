<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'
import { computed } from 'vue'

const ynab = useYnabStore()

const formatCurrency = (amount?: number) => {
  if (amount === undefined) return '0.00'
  const isoCode = ynab.selectedBudget?.currency_format?.iso_code || 'GBP'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: isoCode
  }).format(amount / 1000)
}

const activeAccounts = computed(() => {
  return ynab.accounts.filter((account) => !account.closed && !account.deleted)
})

const toggleAccount = (accountId: string) => {
  const index = ynab.selectedAccountIds.indexOf(accountId)
  if (index === -1) {
    ynab.selectedAccountIds.push(accountId)
  } else {
    ynab.selectedAccountIds.splice(index, 1)
  }
}

const isSelected = (accountId: string) => {
  return ynab.selectedAccountIds.includes(accountId)
}
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4">
    <!-- Header Section -->
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
        Select accounts for analysis
      </h1>
      <p class="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
        Choose which accounts you'd like to include in your portfolio analysis
      </p>
    </div>

    <div v-if="ynab.loadingAccounts" class="flex flex-col items-center justify-center py-20">
      <div
        class="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"
      ></div>
      <p class="text-slate-400">Loading accounts...</p>
    </div>

    <div v-else-if="ynab.accountsError" class="text-center py-20">
      <p class="text-red-400 text-lg mb-4">{{ ynab.accountsError }}</p>
      <button
        v-on:click="ynab.loadAccounts(ynab.selectedBudget!.id)"
        class="text-indigo-400 hover:text-indigo-300 font-medium"
      >
        Try again
      </button>
    </div>

    <template v-else>
      <!-- Accounts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mb-12">
        <div
          v-for="account in activeAccounts"
          v-bind:key="account.id"
          v-on:click="toggleAccount(account.id)"
          class="group relative overflow-hidden bg-slate-900/50 border rounded-2xl p-5 cursor-pointer transition-all duration-300 backdrop-blur-xl active:scale-[0.98]"
          v-bind:class="[
            isSelected(account.id)
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
          ]"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <h3
                class="text-lg font-semibold transition-colors duration-300"
                v-bind:class="[isSelected(account.id) ? 'text-indigo-300' : 'text-white']"
              >
                {{ account.name }}
              </h3>
              <p class="text-slate-500 text-xs mt-1 uppercase tracking-wider">
                {{ account.type }}
              </p>
            </div>
            <div class="text-right">
              <p
                class="text-lg font-mono font-medium"
                v-bind:class="[isSelected(account.id) ? 'text-white' : 'text-slate-300']"
              >
                {{ formatCurrency(account.balance) }}
              </p>
            </div>
          </div>

          <!-- Selection Indicator -->
          <div
            class="absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300"
            v-bind:class="[
              isSelected(account.id)
                ? 'bg-indigo-500 border-indigo-500'
                : 'border-slate-700 opacity-0 group-hover:opacity-100'
            ]"
          >
            <svg
              v-if="isSelected(account.id)"
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="sticky bottom-8 w-full max-w-4xl flex justify-center">
        <button
          v-on:click="ynab.clearSelectedBudget()"
          class="mr-4 px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all"
        >
          Cancel
        </button>
        <button
          v-bind:disabled="ynab.selectedAccountIds.length === 0"
          v-on:click="$emit('confirm')"
          class="px-12 py-3 rounded-xl font-bold text-lg transition-all shadow-2xl shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          v-bind:class="[
            ynab.selectedAccountIds.length > 0
              ? 'bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
              : 'bg-slate-800 text-slate-500'
          ]"
        >
          Analyse {{ ynab.selectedAccountIds.length }} Account{{
            ynab.selectedAccountIds.length === 1 ? '' : 's'
          }}
        </button>
      </div>
    </template>
  </div>
</template>
