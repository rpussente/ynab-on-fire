<script setup lang="ts">
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'
import { useYnabStore } from './stores/ynab'
import 'bootstrap/dist/css/bootstrap.css'

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
  <header class="navbar navbar-expand-lg bg-body-tertiary" data-bs-theme="dark">
    <div class="container-fluid">
      <RouterLink to="/" class="navbar-brand">Home</RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="navbarNav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <RouterLink to="/about" class="nav-link">About</RouterLink>
          </li>
        </ul>
        <ul class="navbar-nav ms-auto">
          <li class="nav-item" v-if="!ynab.isAuthorised">
            <a class="nav-link" v-bind:href="ynab.authUri"> Authorise with YNAB </a>
          </li>
          <li class="nav-item" v-else-if="ynab.selectedBudget">
            <a id="budget_switch" href="#" class="nav-link" v-on:click="ynab.clearSelectedBudget()">
              Budget {{ ynab.selectedBudget?.name }}
            </a>
          </li>
          <li class="nav-item" v-if="ynab.isAuthorised">
            <a id="logout" href="#" class="nav-link" v-on:click="ynab.logout()"> Logout </a>
          </li>
        </ul>
      </div>
    </div>
  </header>
  <div class="container-fluid">
    <RouterView />
  </div>
</template>
