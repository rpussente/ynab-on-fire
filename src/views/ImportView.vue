<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'
import BudgetList from '@/components/BudgetList.vue'
import SebImport from '@/components/SebImport.vue'
import LockIcon from '@/components/icons/LockIcon.vue'

const ynab = useYnabStore()
</script>

<template>
  <div v-if="!ynab.isAuthorised" class="flex flex-col items-center justify-center py-20 px-4">
    <div class="text-6xl mb-8 animate-pulse text-indigo-500 w-24 h-24">
      <LockIcon />
    </div>
    <h1 class="text-4xl md:text-5xl font-bold text-white mb-6 text-center tracking-tight">
      Connect YNAB to import
    </h1>
    <p class="text-slate-400 text-lg md:text-xl max-w-xl mx-auto text-center mb-10 leading-relaxed">
      Authorise your YNAB account to import transactions from your SEB export.
    </p>
    <a
      v-bind:href="ynab.authUri"
      class="px-8 py-4 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg transition-all shadow-2xl shadow-indigo-500/25 active:scale-95"
    >
      Authorise with YNAB
    </a>
  </div>
  <SebImport v-else-if="ynab.selectedBudget" />
  <BudgetList v-else />
</template>
