<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useYnabStore } from '@/stores/ynab'

const router = useRouter()
const ynabStore = useYnabStore()

if (ynabStore.isAuthorised) {
  router.push('/')
}

function authorise() {
  ynabStore.markAuthorised('fake-token')
  router.push('/')
}
</script>

<template>
  <main>
    <button v-on:click="authorise">Authorise with Ynab</button>
  </main>
</template>
