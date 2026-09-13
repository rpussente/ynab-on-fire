import { describe, it, expect } from 'vitest'
import { parseSebCsv, parseSwedishAmount, buildImportId } from '../sebCsv'
import fixture from './fixtures/seb-export.csv?raw'

const header = 'Bokföringsdatum;Valutadatum;Verifikationsnummer;Text;Belopp;Saldo'

describe('parseSwedishAmount', () => {
  it('reads a space-grouped comma decimal', () => {
    // 1 234,50 kr = 1,234,500 milliunits
    expect(parseSwedishAmount('1 234,50')).toBe(1_234_500)
  })

  it('reads a non-breaking-space-grouped amount', () => {
    const nbsp = String.fromCharCode(0xa0)
    expect(parseSwedishAmount(`1${nbsp}234,50`)).toBe(1_234_500)
  })

  it('reads a dot-grouped comma decimal', () => {
    expect(parseSwedishAmount('1.234,50')).toBe(1_234_500)
  })

  it('reads a plain dot decimal', () => {
    expect(parseSwedishAmount('1234.50')).toBe(1_234_500)
  })

  it('treats a lone comma as a decimal separator, not thousands', () => {
    // Swedish "1,5" is one and a half, not fifteen hundred.
    expect(parseSwedishAmount('1,5')).toBe(1_500)
  })

  it('treats repeated three-digit dot groups as thousands', () => {
    expect(parseSwedishAmount('1.234.567')).toBe(1_234_567_000)
  })

  it('reads a leading minus sign', () => {
    expect(parseSwedishAmount('-1 234,50')).toBe(-1_234_500)
  })

  it('reads a trailing minus sign', () => {
    expect(parseSwedishAmount('1 234,50-')).toBe(-1_234_500)
  })

  it('strips a currency suffix', () => {
    expect(parseSwedishAmount('1 234,50 kr')).toBe(1_234_500)
    expect(parseSwedishAmount('1 234,50 SEK')).toBe(1_234_500)
  })

  it('rounds cleanly to milliunits without float drift', () => {
    expect(parseSwedishAmount('0,07')).toBe(70)
    expect(parseSwedishAmount('29,29')).toBe(29_290)
  })

  it('returns null for blank and non-numeric input', () => {
    expect(parseSwedishAmount('')).toBeNull()
    expect(parseSwedishAmount('   ')).toBeNull()
    expect(parseSwedishAmount('Saldo')).toBeNull()
  })
})

describe('buildImportId', () => {
  it('matches the scheme YNAB file import generates', () => {
    expect(buildImportId(-294_230, '2015-12-30', 1)).toBe('YNAB:-294230:2015-12-30:1')
  })

  it('stays within the 36 character limit for realistic amounts', () => {
    expect(buildImportId(-1_234_567_890, '2026-08-28', 9).length).toBeLessThanOrEqual(36)
  })
})

describe('parseSebCsv', () => {
  it('parses a realistic SEB export', () => {
    const result = parseSebCsv(fixture)

    expect(result.transactions).toHaveLength(4)
    expect(result.skipped).toHaveLength(0)
    expect(result.detected.delimiter).toBe(';')
    // Five metadata rows, so the header is line 6.
    expect(result.detected.headerRow).toBe(6)
  })

  it('maps each column to the right field', () => {
    const [first] = parseSebCsv(fixture).transactions

    expect(first).toMatchObject({
      date: '2026-08-28',
      text: 'ICA KVANTUM VÄSTERÅS',
      reference: '12345678',
      amount: -1_234_500
    })
  })

  it('keeps income positive and spending negative', () => {
    const { transactions } = parseSebCsv(fixture)
    const salary = transactions.find((t) => t.text.startsWith('Lön'))

    expect(salary?.amount).toBe(32_500_000)
    expect(transactions.filter((t) => t.amount < 0)).toHaveLength(3)
  })

  it('preserves Swedish characters', () => {
    const { transactions } = parseSebCsv(fixture)
    expect(transactions.map((t) => t.text)).toContain('Swish till Åsa Öberg')
  })

  it('sniffs a comma delimiter when the export uses one', () => {
    const csv = [
      'Bokföringsdatum,Valutadatum,Verifikationsnummer,Text,Belopp,Saldo',
      '2026-08-28,2026-08-28,1,ICA,-1234.50,45678.90'
    ].join('\n')
    const result = parseSebCsv(csv)

    expect(result.detected.delimiter).toBe(',')
    expect(result.transactions[0].amount).toBe(-1_234_500)
  })

  it('finds the header wherever it sits, not at a fixed offset', () => {
    const csv = [header, '2026-08-28;2026-08-28;1;ICA;-100,00;0,00'].join('\n')
    const result = parseSebCsv(csv)

    expect(result.detected.headerRow).toBe(1)
    expect(result.transactions).toHaveLength(1)
  })

  it('falls back to fixed column positions when no header is recognisable', () => {
    // Five junk rows then data, matching the documented SEB layout.
    const csv = [
      'junk 1',
      'junk 2',
      'junk 3',
      'junk 4',
      'junk 5',
      '2026-08-28;2026-08-28;12345678;ICA KVANTUM;-1 234,50;45 678,90'
    ].join('\n')
    const result = parseSebCsv(csv)

    expect(result.detected.headerRow).toBeNull()
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toMatchObject({
      date: '2026-08-28',
      text: 'ICA KVANTUM',
      amount: -1_234_500
    })
  })

  it('collects unreadable rows instead of throwing', () => {
    const csv = [
      header,
      '2026-08-28;2026-08-28;1;Good row;-100,00;0,00',
      'inte ett datum;;;Trasig rad;-100,00;0,00',
      '2026-08-27;2026-08-27;2;No amount;;0,00'
    ].join('\n')
    const result = parseSebCsv(csv)

    expect(result.transactions).toHaveLength(1)
    expect(result.skipped).toHaveLength(2)
    expect(result.skipped[0]).toMatchObject({ line: 3, reason: 'Could not read a date' })
    expect(result.skipped[1]).toMatchObject({ line: 4, reason: 'Could not read an amount' })
  })

  it('numbers repeated same-day same-amount rows so YNAB keeps both', () => {
    const csv = [
      header,
      '2026-08-28;2026-08-28;1;Kaffe;-45,00;0,00',
      '2026-08-28;2026-08-28;2;Kaffe;-45,00;0,00',
      '2026-08-28;2026-08-28;3;Lunch;-120,00;0,00'
    ].join('\n')
    const { transactions } = parseSebCsv(csv)

    expect(transactions.map((t) => t.importId)).toEqual([
      'YNAB:-45000:2026-08-28:1',
      'YNAB:-45000:2026-08-28:2',
      'YNAB:-120000:2026-08-28:1'
    ])
  })

  it('handles quoted fields containing the delimiter', () => {
    const csv = [header, '2026-08-28;2026-08-28;1;"Butik, AB";-100,00;0,00'].join('\n')
    const { transactions } = parseSebCsv(csv)

    expect(transactions[0].text).toBe('Butik, AB')
  })

  it('strips a UTF-8 byte order mark', () => {
    const bom = String.fromCharCode(0xfeff)
    const result = parseSebCsv(`${bom}${header}\n2026-08-28;2026-08-28;1;ICA;-100,00;0,00`)
    expect(result.detected.headerRow).toBe(1)
    expect(result.transactions).toHaveLength(1)
  })

  it('handles CRLF line endings', () => {
    const csv = [header, '2026-08-28;2026-08-28;1;ICA;-100,00;0,00'].join('\r\n')
    expect(parseSebCsv(csv).transactions).toHaveLength(1)
  })

  it('reads the bare YYMMDD date format', () => {
    const csv = [header, '260828;260828;1;ICA;-100,00;0,00'].join('\n')
    expect(parseSebCsv(csv).transactions[0].date).toBe('2026-08-28')
  })

  it('returns an empty result for an empty file', () => {
    const result = parseSebCsv('')
    expect(result.transactions).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })

  it('leaves reference null when the export has no verifikationsnummer column', () => {
    const csv = ['Bokföringsdatum;Text;Belopp', '2026-08-28;ICA;-100,00'].join('\n')
    const { transactions } = parseSebCsv(csv)

    expect(transactions[0].reference).toBeNull()
    expect(transactions[0].text).toBe('ICA')
  })
})
