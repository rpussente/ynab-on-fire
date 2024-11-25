import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStorage } from '@vueuse/core'
import * as ynab from 'ynab'
import jsonConfig from '../ynab.config.json'

export const YNAB_ACCESS_TOKEN = 'YNAB_ACCESS_TOKEN'

export interface Ynab {
  clientId: string
  redirectUri: string
}

export const useYnabStore = defineStore('ynab', () => {
  const api = ref<ynab.api | null>(null)
  const apiConfig = ref<Ynab>({
    clientId: jsonConfig.clientId,
    redirectUri: jsonConfig.redirectUri
  })
  const accessToken = useSessionStorage<string>(YNAB_ACCESS_TOKEN, null)
  const authUri = computed(
    () =>
      `https://app.ynab.com/oauth/authorize?client_id=${apiConfig.value.clientId}&redirect_uri=${apiConfig.value.redirectUri}&response_type=token`
  )
  const isAuthorised = computed(() => accessToken.value != null)
  function markAuthorised(token: string) {
    accessToken.value = token
    api.value = new ynab.api(token)
  }

  if (isAuthorised) {
    api.value = new ynab.api(accessToken.value)
  }

  return { apiConfig, accessToken, authUri, isAuthorised, markAuthorised }
})
