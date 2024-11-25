<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'
const ynab = useYnabStore()
</script>

<template>
  <li v-for="budget in ynab.budgets" v-bind:key="budget.id">
    {{ budget.name }}
  </li>
</template>
