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
  <header class="bg-slate-900 shadow-md">
    <div
      class="container mx-auto flex flex-wrap items-center justify-between p-4 px-6 md:flex-nowrap"
    >
      <div class="flex items-center space-x-8">
        <RouterLink
          to="/"
          class="text-xl font-medium text-white hover:opacity-80 transition-opacity"
        >
          Home
        </RouterLink>
        <nav>
          <ul class="flex space-x-6">
            <li>
              <RouterLink to="/about" class="text-slate-400 hover:text-white transition-colors">
                About
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>

      <div class="flex items-center space-x-6">
        <template v-if="!ynab.isAuthorised">
          <a class="text-slate-400 hover:text-white transition-colors" v-bind:href="ynab.authUri">
            Authorise with YNAB
          </a>
        </template>
        <template v-else-if="ynab.selectedBudget">
          <button
            id="budget_switch"
            class="text-slate-400 hover:text-white transition-colors"
            v-on:click="ynab.clearSelectedBudget()"
          >
            Budget {{ ynab.selectedBudget?.name }}
          </button>
        </template>
        <button
          v-if="ynab.isAuthorised"
          id="logout"
          class="text-slate-400 hover:text-white transition-colors"
          v-on:click="ynab.logout()"
        >
          Logout
        </button>
      </div>
    </div>
  </header>

  <div class="container mx-auto p-6">
    <RouterView />
  </div>
</template>
