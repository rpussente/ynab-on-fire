<script setup lang="ts">
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'
import { useYnabStore } from './stores/ynab'

const route = useRoute()
const router = useRouter()
const ynab = useYnabStore()

const ynabToken = findYnabToken()

if (ynabToken != null) {
  ynab.markAuthorised(ynabToken)
}

function findYnabToken() {
  let token = null
  const search = route.hash.substring(1).replace(/&/g, '","').replace(/=/g, '":"')
  if (search && search !== '') {
    // Try to get access_token from the hash returned by OAuth
    const params = JSON.parse('{"' + search + '"}', function (key, value) {
      return key === '' ? value : decodeURIComponent(value)
    })
    token = params.access_token
    router.push('/')
  }
  return token
}
</script>

<template>
  <header class="bg-slate-950/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
    <div class="container mx-auto flex items-center justify-between p-4 px-6">
      <div class="flex items-center space-x-8">
        <RouterLink
          to="/"
          class="text-xl font-bold text-white hover:opacity-80 transition-opacity tracking-tight"
        >
          YNAB on Fire
        </RouterLink>
      </div>

      <div class="flex items-center space-x-6">
        <template v-if="!ynab.isAuthorised">
          <a
            class="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-lg shadow-indigo-500/20"
            v-bind:href="ynab.authUri"
          >
            Authorise with YNAB
          </a>
        </template>
        <template v-else>
          <div class="flex items-center space-x-6">
            <button
              v-if="ynab.selectedBudget"
              id="budget_switch"
              class="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              v-on:click="ynab.clearSelectedBudget()"
            >
              Switch Budget ({{ ynab.selectedBudget?.name }})
            </button>
            <button
              id="logout"
              class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all"
              v-on:click="ynab.logout()"
            >
              Logout
            </button>
          </div>
        </template>
      </div>
    </div>
  </header>

  <div class="container mx-auto p-6">
    <RouterView />
  </div>
</template>
