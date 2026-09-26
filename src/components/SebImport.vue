<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import * as ynabApi from 'ynab'
import { useYnabStore } from '@/stores/ynab'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import { parseSebCsv, readSebFile, type SebParseResult } from '@/utils/sebCsv'

/** YNAB truncates beyond these; do it here so the preview matches what lands. */
const PAYEE_NAME_MAX = 50
const MEMO_MAX = 200

const IMPORT_ACCOUNT_ID_KEY = 'ynab-on-fire:seb-import-account-id'

const ynab = useYnabStore()
const { formatCurrency } = useFormatCurrency()

const importAccountId = useLocalStorage<string>(IMPORT_ACCOUNT_ID_KEY, '')
const parsed = ref<SebParseResult | null>(null)
const fileName = ref('')
const parseError = ref<string | null>(null)
const excludedIndexes = ref<Set<number>>(new Set())
const isDraggingOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const activeAccounts = computed(() =>
  ynab.accounts.filter((account) => !account.closed && !account.deleted)
)

const selectedAccount = computed(() =>
  activeAccounts.value.find((account) => account.id === importAccountId.value)
)

const includedTransactions = computed(() =>
  (parsed.value?.transactions ?? []).filter((_, index) => !excludedIndexes.value.has(index))
)

const netAmount = computed(() =>
  includedTransactions.value.reduce((total, transaction) => total + transaction.amount, 0)
)

const canImport = computed(
  () =>
    selectedAccount.value != null &&
    includedTransactions.value.length > 0 &&
    !ynab.importingTransactions
)

onMounted(() => {
  if (ynab.accounts.length === 0 && ynab.selectedBudget) {
    ynab.loadAccounts(ynab.selectedBudget.id)
  }
  ynab.clearImportResult()
})

function reset() {
  parsed.value = null
  fileName.value = ''
  parseError.value = null
  excludedIndexes.value = new Set()
  ynab.clearImportResult()
}

async function handleFile(file: File) {
  reset()
  fileName.value = file.name
  try {
    const text = await readSebFile(file)
    const result = parseSebCsv(text)
    if (result.transactions.length === 0) {
      // A file with content that yields nothing is the wrong file, not an
      // empty one — say so rather than implying the export was blank.
      parseError.value =
        text.trim() === ''
          ? 'This file is empty.'
          : 'No transactions could be read from this file. Check that it is a CSV export from seb.se.'
    }
    parsed.value = result
  } catch {
    parseError.value = 'Could not read this file.'
  }
}

function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function onDrop(event: DragEvent) {
  isDraggingOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function toggleRow(index: number) {
  const next = new Set(excludedIndexes.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  excludedIndexes.value = next
}

async function runImport() {
  if (!canImport.value || !ynab.selectedBudget || !selectedAccount.value) return

  const accountId = selectedAccount.value.id
  const transactions: ynabApi.NewTransaction[] = includedTransactions.value.map((transaction) => {
    // The full text goes in the memo only when the payee name had to be cut,
    // so nothing from the bank statement is silently lost.
    const memo = transaction.text.length > PAYEE_NAME_MAX ? transaction.text : transaction.reference

    return {
      account_id: accountId,
      date: transaction.date,
      amount: transaction.amount,
      payee_name: transaction.text.slice(0, PAYEE_NAME_MAX),
      memo: memo ? memo.slice(0, MEMO_MAX) : undefined,
      cleared: ynabApi.TransactionClearedStatus.Cleared,
      // Left unapproved so the user reviews and categorises them in YNAB.
      approved: false,
      import_id: transaction.importId
    }
  })

  await ynab.importTransactions(ynab.selectedBudget.id, transactions)
}
</script>

<template>
  <div class="flex flex-col items-center py-12 px-4">
    <!-- Header Section -->
    <div class="text-center mb-12">
      <div class="text-5xl mb-4">🏦</div>
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Import from SEB</h1>
      <p class="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
        Export your transactions from seb.se as a CSV file, then drop it here to send them straight
        to YNAB
      </p>
    </div>

    <div v-if="ynab.loadingAccounts" class="flex flex-col items-center justify-center py-20">
      <div
        class="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"
      ></div>
      <p class="text-slate-400">Loading accounts...</p>
    </div>

    <div v-else-if="ynab.accountsError" class="text-center py-20">
      <p class="text-red-400 text-lg mb-4">{{ ynab.accountsError }}</p>
      <button
        v-on:click="ynab.loadAccounts(ynab.selectedBudget!.id)"
        class="text-indigo-400 hover:text-indigo-300 font-medium"
      >
        Try again
      </button>
    </div>

    <!-- Success -->
    <div v-else-if="ynab.importResult" class="w-full max-w-2xl text-center">
      <div class="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 backdrop-blur-xl">
        <div class="text-5xl mb-4">✅</div>
        <h2 class="text-2xl font-bold text-white mb-2">Import complete</h2>
        <p class="text-slate-400 mb-8">
          {{ ynab.importResult.imported }}
          {{ ynab.importResult.imported === 1 ? 'transaction' : 'transactions' }} added to
          {{ selectedAccount?.name }}
          <template v-if="ynab.importResult.duplicates > 0">
            &middot; {{ ynab.importResult.duplicates }} already in YNAB
          </template>
        </p>
        <p v-if="ynab.importResult.imported > 0" class="text-slate-500 text-sm mb-8">
          They are unapproved in YNAB so you can review and categorise them.
        </p>
        <p v-else class="text-slate-500 text-sm mb-8">
          Nothing was added, so this file has already been imported.
        </p>
        <div class="flex justify-center gap-4">
          <button
            v-on:click="reset()"
            class="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all"
          >
            Import another file
          </button>
          <RouterLink
            to="/"
            class="px-8 py-3 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all shadow-2xl shadow-indigo-500/25 active:scale-95"
          >
            Back to dashboard
          </RouterLink>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="w-full max-w-4xl space-y-8">
        <!-- Step 1: target account -->
        <section>
          <h2 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            1 &middot; Import into
          </h2>
          <div v-if="activeAccounts.length === 0" class="text-slate-500">
            No open accounts found in this budget.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="account in activeAccounts"
              v-bind:key="account.id"
              v-bind:id="`import-account-${account.id}`"
              v-on:click="importAccountId = account.id"
              class="group relative overflow-hidden bg-slate-900/50 border rounded-2xl p-5 cursor-pointer transition-all duration-300 backdrop-blur-xl active:scale-[0.98]"
              v-bind:class="[
                importAccountId === account.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
              ]"
            >
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <h3
                    class="text-lg font-semibold transition-colors duration-300"
                    v-bind:class="[
                      importAccountId === account.id ? 'text-indigo-300' : 'text-white'
                    ]"
                  >
                    {{ account.name }}
                  </h3>
                  <p class="text-slate-500 text-xs mt-1 uppercase tracking-wider">
                    {{ account.type }}
                  </p>
                </div>
                <p
                  class="text-lg font-mono font-medium"
                  v-bind:class="[importAccountId === account.id ? 'text-white' : 'text-slate-300']"
                >
                  {{ formatCurrency(account.balance / 1000) }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Step 2: the file -->
        <section>
          <h2 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            2 &middot; Choose your SEB export
          </h2>
          <div
            v-on:click="fileInput?.click()"
            v-on:dragover.prevent="isDraggingOver = true"
            v-on:dragleave.prevent="isDraggingOver = false"
            v-on:drop.prevent="onDrop"
            class="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300"
            v-bind:class="[
              isDraggingOver
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-900/50'
            ]"
          >
            <p class="text-white font-medium mb-1">
              {{ fileName || 'Drop your CSV file here' }}
            </p>
            <p class="text-slate-500 text-sm">
              {{ fileName ? 'Click to choose a different file' : 'or click to browse' }}
            </p>
            <input
              ref="fileInput"
              type="file"
              accept=".csv,.txt,text/csv"
              class="hidden"
              v-on:change="onFileSelected"
            />
          </div>
          <p v-if="parseError" class="text-red-400 mt-4">{{ parseError }}</p>
        </section>

        <!-- Step 3: preview -->
        <section v-if="parsed && parsed.transactions.length > 0">
          <h2 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            3 &middot; Review
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-slate-800 rounded-xl p-6">
              <p class="text-slate-400 text-sm mb-1">Selected</p>
              <p class="text-2xl font-bold text-white">{{ includedTransactions.length }}</p>
            </div>
            <div class="bg-slate-800 rounded-xl p-6">
              <p class="text-slate-400 text-sm mb-1">Net amount</p>
              <p class="text-2xl font-bold font-mono text-white">
                {{ formatCurrency(netAmount / 1000) }}
              </p>
            </div>
            <div class="bg-slate-800 rounded-xl p-6">
              <p class="text-slate-400 text-sm mb-1">Unreadable rows</p>
              <p class="text-2xl font-bold text-white">{{ parsed.skipped.length }}</p>
            </div>
          </div>

          <div
            class="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl"
          >
            <table class="w-full text-left">
              <thead>
                <tr
                  class="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider"
                >
                  <th class="p-4 w-12"></th>
                  <th class="p-4 font-semibold">Date</th>
                  <th class="p-4 font-semibold">Payee</th>
                  <th class="p-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(transaction, index) in parsed.transactions"
                  v-bind:key="transaction.importId"
                  v-on:click="toggleRow(index)"
                  class="border-b border-slate-800/50 last:border-0 cursor-pointer transition-colors hover:bg-slate-800/40"
                  v-bind:class="[excludedIndexes.has(index) ? 'opacity-40' : '']"
                >
                  <td class="p-4">
                    <div
                      class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                      v-bind:class="[
                        excludedIndexes.has(index)
                          ? 'border-slate-700'
                          : 'bg-indigo-500 border-indigo-500'
                      ]"
                    >
                      <svg
                        v-if="!excludedIndexes.has(index)"
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3.5 w-3.5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </td>
                  <td class="p-4 text-slate-300 font-mono text-sm whitespace-nowrap">
                    {{ transaction.date }}
                  </td>
                  <td class="p-4 text-white">{{ transaction.text }}</td>
                  <td
                    class="p-4 text-right font-mono font-medium whitespace-nowrap"
                    v-bind:class="[transaction.amount < 0 ? 'text-slate-300' : 'text-emerald-400']"
                  >
                    {{ formatCurrency(transaction.amount / 1000) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <details v-if="parsed.skipped.length > 0" class="mt-4">
            <summary class="text-slate-400 text-sm cursor-pointer hover:text-slate-300">
              {{ parsed.skipped.length }} row{{ parsed.skipped.length === 1 ? '' : 's' }} could not
              be read
            </summary>
            <ul class="mt-3 space-y-2">
              <li
                v-for="row in parsed.skipped"
                v-bind:key="row.line"
                class="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-sm"
              >
                <span class="text-red-400">Line {{ row.line }}: {{ row.reason }}</span>
                <span class="block text-slate-500 font-mono text-xs mt-1 break-all">
                  {{ row.raw }}
                </span>
              </li>
            </ul>
          </details>
        </section>

        <p v-if="ynab.importError" class="text-red-400 text-center">{{ ynab.importError }}</p>

        <!-- Action Footer -->
        <div class="sticky bottom-8 flex justify-center">
          <RouterLink
            to="/"
            class="mr-4 px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all"
          >
            Cancel
          </RouterLink>
          <button
            v-bind:disabled="!canImport"
            v-on:click="runImport()"
            class="px-12 py-3 rounded-xl font-bold text-lg transition-all shadow-2xl shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            v-bind:class="[
              canImport
                ? 'bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
                : 'bg-slate-800 text-slate-500'
            ]"
          >
            <span v-if="ynab.importingTransactions">Importing...</span>
            <span v-else>
              Import {{ includedTransactions.length }} Transaction{{
                includedTransactions.length === 1 ? '' : 's'
              }}
            </span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
