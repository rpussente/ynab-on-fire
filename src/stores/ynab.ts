import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import jsonConfig from '../ynab.config.json'

export interface Ynab {
  clientId: string
  redirectUri: string
  token?: string
  api?: string
}

export const useYnabStore = defineStore('ynab', () => {
  const ynab = ref<Ynab>({
    clientId: jsonConfig.clientId,
    redirectUri: jsonConfig.redirectUri
  })
  const isAuthorised = computed(() => ynab.value.token != null)
  function markAuthorised() {
    ynab.value.token = 'fake'
  }
  return { ynab, isAuthorised, markAuthorised }
})
