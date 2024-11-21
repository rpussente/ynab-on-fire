import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface Ynab {
  clientId: string
  redirectUri: string
  token?: string
  api?: string
}

export const useYnabStore = defineStore('ynab', () => {
  const ynab = ref<Ynab>({
    clientId: 'client-id',
    redirectUri: 'redirect-uri'
  })
  const isAuthorised = computed(() => ynab.value.token != null)
  function markAuthorised() {
    ynab.value.token = 'fake'
  }
  return { isAuthorised, markAuthorised }
})
