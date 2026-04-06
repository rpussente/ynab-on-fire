<script setup lang="ts">
import { ref, watch } from 'vue'
import { useYnabStore } from '@/stores/ynab'
import BudgetList from '@/components/BudgetList.vue'
import AccountList from '@/components/AccountList.vue'
import LockIcon from '@/components/icons/LockIcon.vue'

const ynab = useYnabStore()
const isConfirmed = ref(false)

// Reset confirmation when budget changes or is cleared
watch(
  () => ynab.selectedBudget,
  () => {
    isConfirmed.value = false
  }
)
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
  <div v-else-if="ynab.selectedBudget && isConfirmed" class="py-12 px-4 max-w-4xl mx-auto">
    <!-- Selected Budget View Placeholder -->
    <h2 class="text-3xl font-bold text-white mb-4">
      {{ ynab.selectedBudget.name }}
    </h2>
    <p class="text-slate-400">
      Portfolio analysis dashboard for
      {{ ynab.selectedAccountIds.length }} accounts coming soon...
    </p>
    <div class="mt-8 flex space-x-4">
      <button
        v-on:click="isConfirmed = false"
        class="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
      >
        &larr; Change accounts
      </button>
      <button
        v-on:click="ynab.clearSelectedBudget()"
        class="text-slate-400 hover:text-white font-medium transition-colors"
      >
        Back to budgets
      </button>
    </div>
  </div>
  <AccountList v-else-if="ynab.selectedBudget" v-on:confirm="isConfirmed = true" />
  <BudgetList v-else />
</template>
