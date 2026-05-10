import { useYnabStore } from '@/stores/ynab'

export function useFormatCurrency() {
  const ynab = useYnabStore()

  const formatCurrency = (amount: number) => {
    const isoCode = ynab.selectedBudget?.currency_format?.iso_code ?? 'GBP'
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: isoCode }).format(amount)
  }

  return { formatCurrency }
}
