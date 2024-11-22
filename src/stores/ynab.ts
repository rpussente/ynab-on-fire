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
  const authUri = computed(
    () =>
      `https://app.ynab.com/oauth/authorize?client_id=${ynab.value.clientId}&redirect_uri=${ynab.value.redirectUri}&response_type=token`
  )
  const isAuthorised = computed(() => ynab.value.token != null)
  function markAuthorised(token: string) {
    ynab.value.token = token
  }
  return { ynab, authUri, isAuthorised, markAuthorised }
})
