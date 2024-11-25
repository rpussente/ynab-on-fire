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
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <a v-bind:href="ynab.authUri" v-if="!ynab.isAuthorised">Authorise with YNAB</a>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>
