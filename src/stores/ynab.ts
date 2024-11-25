import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStorage } from '@vueuse/core'
import jsonConfig from '../ynab.config.json'

const YNAB_ACCESS_TOKEN = 'YNAB_ACCESS_TOKEN'

export interface Ynab {
  clientId: string
  redirectUri: string
  api?: string
}

export const useYnabStore = defineStore('ynab', () => {
  const ynab = ref<Ynab>({
    clientId: jsonConfig.clientId,
    redirectUri: jsonConfig.redirectUri
  })
  const accessToken = useSessionStorage<string>(YNAB_ACCESS_TOKEN, null)
  const authUri = computed(
    () =>
      `https://app.ynab.com/oauth/authorize?client_id=${ynab.value.clientId}&redirect_uri=${ynab.value.redirectUri}&response_type=token`
  )
  const isAuthorised = computed(() => accessToken.value != null)
  function markAuthorised(token: string) {
    accessToken.value = token
  }
  return { ynab, accessToken, authUri, isAuthorised, markAuthorised }
})
