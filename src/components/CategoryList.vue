<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useYnabStore } from '@/stores/ynab'
import { useFormatCurrency } from '@/composables/useFormatCurrency'

const emit = defineEmits<{ confirm: []; back: [] }>()

const ynab = useYnabStore()
const { formatCurrency } = useFormatCurrency()

onMounted(() => {
  if (ynab.selectedBudget) {
    ynab.loadCategories(ynab.selectedBudget.id)
  }
})

const activeGroups = computed(() =>
  ynab.categoryGroups
    .filter((g) => !g.deleted && g.name !== 'Internal Master Category')
    .map((g) => ({
      ...g,
      categories: g.categories.filter((c) => !c.hidden && !c.deleted)
    }))
    .filter((g) => g.categories.length > 0)
)

const toggleCategory = (categoryId: string) => {
  const index = ynab.selectedCategoryIds.indexOf(categoryId)
  if (index === -1) {
    ynab.selectedCategoryIds.push(categoryId)
  } else {
    ynab.selectedCategoryIds.splice(index, 1)
  }
}

const isSelected = (categoryId: string) => ynab.selectedCategoryIds.includes(categoryId)
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4">
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
        Select retirement categories
      </h1>
      <p class="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
        Choose which spending categories you expect to have in retirement
      </p>
    </div>

    <div v-if="ynab.loadingCategories" class="flex flex-col items-center justify-center py-20">
      <div
        class="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"
      ></div>
      <p class="text-slate-400">Loading categories...</p>
    </div>

    <div v-else-if="ynab.categoriesError" class="text-center py-20">
      <p class="text-red-400 text-lg mb-4">{{ ynab.categoriesError }}</p>
      <button
        @click="ynab.loadCategories(ynab.selectedBudget!.id)"
        class="text-indigo-400 hover:text-indigo-300 font-medium"
      >
        Try again
      </button>
    </div>

    <template v-else>
      <div class="w-full max-w-4xl mb-12 space-y-8">
        <div v-for="group in activeGroups" :key="group.id">
          <p class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
            {{ group.name }}
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="category in group.categories"
              :key="category.id"
              @click="toggleCategory(category.id)"
              class="group relative overflow-hidden bg-slate-900/50 border rounded-2xl p-5 cursor-pointer transition-all duration-300 backdrop-blur-xl active:scale-[0.98]"
              :class="[
                isSelected(category.id)
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
              ]"
            >
              <div class="flex items-center justify-between">
                <h3
                  class="text-base font-semibold transition-colors duration-300 pr-6"
                  :class="[isSelected(category.id) ? 'text-indigo-300' : 'text-white']"
                >
                  {{ category.name }}
                </h3>
                <p
                  class="text-base font-mono font-medium shrink-0"
                  :class="[isSelected(category.id) ? 'text-white' : 'text-slate-300']"
                >
                  {{ category.budgeted !== 0 ? formatCurrency(category.budgeted / 1000) : '—' }}
                </p>
              </div>

              <div
                class="absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300"
                :class="[
                  isSelected(category.id)
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-slate-700 opacity-0 group-hover:opacity-100'
                ]"
              >
                <svg
                  v-if="isSelected(category.id)"
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
        </div>
      </div>

      <div class="sticky bottom-8 w-full max-w-4xl flex justify-center">
        <button
          @click="emit('back')"
          class="mr-4 px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all"
        >
          &larr; Back
        </button>
        <button
          :disabled="ynab.selectedCategoryIds.length === 0"
          @click="emit('confirm')"
          class="px-12 py-3 rounded-xl font-bold text-lg transition-all shadow-2xl shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          :class="[
            ynab.selectedCategoryIds.length > 0
              ? 'bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
              : 'bg-slate-800 text-slate-500'
          ]"
        >
          Analyse {{ ynab.selectedCategoryIds.length }} Categor{{
            ynab.selectedCategoryIds.length === 1 ? 'y' : 'ies'
          }}
        </button>
      </div>
    </template>
  </div>
</template>
