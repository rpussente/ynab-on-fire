<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'
const ynab = useYnabStore()
</script>

<template>
  <a
    v-for="budget in ynab.budgets"
    v-bind:id="budget.id"
    v-bind:key="budget.id"
    v-on:click="ynab.selectedBudget = budget"
  >
    {{ budget.name }}
  </a>
</template>
