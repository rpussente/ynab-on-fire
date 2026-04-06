<script setup lang="ts">
import { useYnabStore } from '@/stores/ynab'

const ynab = useYnabStore()

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4">
    <!-- Header Section -->
    <div class="text-center mb-12">
      <div class="text-5xl mb-4 animate-bounce">🔥</div>
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
        Select your budget
      </h1>
      <p class="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
        Choose which budget you'd like to analyse
      </p>
    </div>

    <!-- Budgets Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
      <div
        v-for="budget in ynab.budgets"
        v-bind:id="budget.id"
        v-bind:key="budget.id"
        v-on:click="ynab.selectBudget(budget)"
        class="group relative overflow-hidden bg-slate-900/50 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur-xl shadow-2xl hover:shadow-indigo-500/10 active:scale-[0.98]"
      >
        <!-- Background Glow -->
        <div
          class="absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        ></div>

        <div class="relative flex items-center justify-between">
          <div class="flex items-center space-x-5">
            <!-- Initials Circle -->
            <div
              class="shrink-0 w-16 h-16 rounded-full bg-linear-to-br from-indigo-400 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300"
            >
              {{ getInitials(budget.name) }}
            </div>

            <!-- Details -->
            <div class="flex flex-col">
              <h3
                class="text-xl font-semibold text-white group-hover:text-indigo-300 transition-colors duration-300"
              >
                {{ budget.name }}
              </h3>
              <p class="text-slate-500 text-sm mt-1">
                Last modified {{ formatDate(budget.last_modified_on) }}
              </p>
            </div>
          </div>

          <!-- Select Indicator/Button (Visible on card hover or for variety like mockup) -->
          <div
            class="hidden md:flex px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
          >
            Select
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional subtle effects if needed */
</style>
