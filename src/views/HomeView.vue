<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'
import BudgetList from '@/components/BudgetList.vue'

const ynab = useYnabStore()
</script>

<template>
  <div v-if="ynab.selectedBudget" class="selected-view">
    <h2>{{ ynab.selectedBudget.name }}</h2>
  </div>
  <BudgetList v-else />
</template>

<style scoped>
.selected-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 56px);
  color: #e2e8f0;
  font-size: 1.5rem;
  font-weight: 600;
}
</style>
