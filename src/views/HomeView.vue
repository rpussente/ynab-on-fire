<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'
import BudgetList from '@/components/BudgetList.vue'

const ynab = useYnabStore()
</script>

<template>
  <div v-if="ynab.selectedBudget">
    {{ ynab.selectedBudget.name }}
  </div>
  <BudgetList v-else />
</template>
