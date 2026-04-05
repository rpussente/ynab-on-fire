<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'
const ynab = useYnabStore()
</script>

<template>
  <div class="flex flex-col space-y-3">
    <a
      v-for="budget in ynab.budgets"
      v-bind:id="budget.id"
      v-bind:key="budget.id"
      class="cursor-pointer text-blue-400 hover:text-blue-300 hover:underline transition-colors"
      v-on:click="ynab.selectedBudget = budget"
    >
      {{ budget.name }}
    </a>
  </div>
</template>
