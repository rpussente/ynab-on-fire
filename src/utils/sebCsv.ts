/**
 * Parser for transaction exports from SEB (Skandinaviska Enskilda Banken, seb.se).
 *
 * A SEB export is a small CSV with a handful of metadata rows before the real
 * header, six columns, and Swedish number formatting:
 *
 *   Bokföringsdatum ; Valutadatum ; Verifikationsnummer ; Text ; Belopp ; Saldo
 *
 * The exact shape varies between SEB's private and business banks, and between
 * the CSV delimiter options the export dialog offers, so nothing here is
 * hardcoded: the delimiter is sniffed, the header row is located by matching
 * known Swedish column names, and fixed column positions are only used as a
 * last resort. Rows that cannot be understood are collected in `skipped`
 * rather than aborting the whole file, so a single odd line never costs the
 * user the rest of the import.
 */

/**
 * Which column holds which field. `date` and `amount` are the minimum needed to
 * build a transaction, so they are always resolved; the rest are optional
 * because narrower exports omit them.
 */
interface ColumnMap {
  date: number
  amount: number
  text?: number
  reference?: number
  valueDate?: number
  balance?: number
}

/** Column positions used when no recognisable header row is found. */
const FALLBACK_HEADER_ROWS = 5
const FALLBACK_COLUMNS: ColumnMap = { date: 0, text: 3, amount: 4 }

/** How many rows to scan before giving up on finding a header. */
const MAX_HEADER_SCAN_ROWS = 15

const DELIMITERS = [';', ',', '\t']

/**
 * Swedish column names, normalised (lowercased, diacritics stripped). SEB has
 * used several spellings over the years and the business bank differs from the
 * private one, so each field accepts a few aliases.
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  date: ['bokforingsdatum', 'bokfort', 'bokf datum', 'bokforingsdag', 'datum'],
  valueDate: ['valutadatum', 'valutadag'],
  reference: ['verifikationsnummer', 'verifikationsnr', 'verifikationsnummer/referens', 'referens'],
  text: ['text', 'beskrivning', 'text/mottagare', 'transaktion'],
  amount: ['belopp', 'belopp sek', 'summa'],
  balance: ['saldo', 'bokfort saldo']
}

export interface SebTransaction {
  /** ISO date, YYYY-MM-DD. */
  date: string
  /** The Swedish "Text" column — becomes the YNAB payee. */
  text: string
  /** Verifikationsnummer, when the export includes one. */
  reference: string | null
  /** Milliunits (1/1000 of a krona). Negative is an outflow. */
  amount: number
  /** YNAB-compatible dedupe key, see `buildImportId`. */
  importId: string
}

export interface SebSkippedRow {
  /** 1-based line number in the original file. */
  line: number
  raw: string
  reason: string
}

export interface SebParseResult {
  transactions: SebTransaction[]
  skipped: SebSkippedRow[]
  detected: {
    delimiter: string
    /** 1-based line number of the header row, or null if positions were assumed. */
    headerRow: number | null
  }
}

/** Lowercase and strip diacritics so "Bokföringsdatum" matches "bokforingsdatum". */
function normaliseHeader(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Split one CSV line, honouring double-quoted fields and "" escapes.
 */
function splitLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      fields.push(field.trim())
      field = ''
    } else {
      field += char
    }
  }
  fields.push(field.trim())
  return fields
}

/**
 * Pick the delimiter that most consistently splits the file into columns.
 *
 * Ties resolve towards the earlier entry in DELIMITERS, which puts ';' ahead of
 * ',' on purpose: SEB writes amounts in the Swedish style ("1 234,50"), so a
 * comma-heavy line is usually decimal points rather than field separators.
 */
function sniffDelimiter(lines: string[]): string {
  let best = DELIMITERS[0]
  let bestScore = 0

  for (const delimiter of DELIMITERS) {
    // Count per-line occurrences outside quotes, then score the modal count:
    // a real delimiter yields the same count on most lines.
    const counts = new Map<number, number>()
    for (const line of lines) {
      const count = splitLine(line, delimiter).length - 1
      if (count > 0) counts.set(count, (counts.get(count) ?? 0) + 1)
    }
    for (const [columns, rows] of counts) {
      const score = columns * rows
      if (score > bestScore) {
        bestScore = score
        best = delimiter
      }
    }
  }
  return best
}

/**
 * Parse a Swedish-formatted amount into milliunits.
 *
 * Handles "1 234,50" (space thousands, comma decimal), "1.234,50" (dot
 * thousands), plain "1234.50", non-breaking spaces, a "kr"/"SEK" suffix, and
 * both leading and trailing minus signs. Returns null if there is no number.
 */
export function parseSwedishAmount(raw: string): number | null {
  if (raw == null) return null

  // \s already covers the non-breaking spaces SEB uses for thousands grouping.
  let value = raw
    .replace(/\s/g, '')
    .replace(/kr|sek/gi, '')
    .trim()

  if (value === '') return null

  // Some exports put the minus sign after the number.
  let negative = false
  if (value.endsWith('-')) {
    negative = true
    value = value.slice(0, -1)
  }
  if (value.startsWith('-')) {
    negative = true
    value = value.slice(1)
  } else if (value.startsWith('+')) {
    value = value.slice(1)
  }

  const lastComma = value.lastIndexOf(',')
  const lastDot = value.lastIndexOf('.')

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: whichever comes last is the decimal separator.
    const decimalAt = Math.max(lastComma, lastDot)
    const thousandsChar = decimalAt === lastComma ? '.' : ','
    value = value.split(thousandsChar).join('')
    value = value.replace(/[,.]/, '.')
  } else if (lastComma !== -1) {
    // Comma only — a decimal separator in Swedish, unless it groups thousands.
    value = isThousandsGrouping(value, ',') ? value.split(',').join('') : value.replace(',', '.')
  } else if (lastDot !== -1) {
    value = isThousandsGrouping(value, '.') ? value.split('.').join('') : value
  }

  if (!/^\d+(\.\d+)?$/.test(value)) return null

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null

  // Round at the milliunit boundary so no float error reaches YNAB.
  const milliunits = Math.round(parsed * 1000)
  return negative ? -milliunits : milliunits
}

/**
 * True when every group after a separator is exactly three digits and there is
 * more than one of them ("1.234.567"), which makes it thousands grouping rather
 * than a decimal point.
 */
function isThousandsGrouping(value: string, separator: string): boolean {
  const parts = value.split(separator)
  if (parts.length < 3) return false
  return parts.slice(1).every((part) => /^\d{3}$/.test(part))
}

/**
 * Normalise the date formats SEB has been seen to emit into ISO YYYY-MM-DD.
 */
function parseSebDate(raw: string): string | null {
  const value = raw.trim()

  let match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (match) {
    const [, year, month, day] = match
    return toIsoDate(Number(year), Number(month), Number(day))
  }

  // Bare YYMMDD, still used by some SEB statement exports.
  match = value.match(/^(\d{2})(\d{2})(\d{2})$/)
  if (match) {
    const [, year, month, day] = match
    return toIsoDate(2000 + Number(year), Number(month), Number(day))
  }

  return null
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const padded = (n: number) => String(n).padStart(2, '0')
  return `${year}-${padded(month)}-${padded(day)}`
}

/**
 * Build the dedupe key YNAB uses for imported transactions:
 * `YNAB:<milliunits>:<iso date>:<occurrence>`.
 *
 * This is the same scheme YNAB's own File Based Import generates, so importing
 * a file through this app and then through YNAB directly collapses into one
 * transaction instead of two. YNAB scopes the key per account and reports any
 * it already holds in `duplicate_import_ids`.
 */
export function buildImportId(amountMilliunits: number, date: string, occurrence: number): string {
  return `YNAB:${amountMilliunits}:${date}:${occurrence}`
}

/**
 * Locate the header row and map each needed field to a column index.
 * Returns null when no row looks like a header.
 */
function findHeader(rows: string[][]): { index: number; columns: ColumnMap } | null {
  const limit = Math.min(rows.length, MAX_HEADER_SCAN_ROWS)

  for (let i = 0; i < limit; i++) {
    const found: Partial<Record<string, number>> = {}

    rows[i].forEach((cell, columnIndex) => {
      const normalised = normaliseHeader(cell)
      if (normalised === '') return
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (found[field] === undefined && aliases.includes(normalised)) {
          found[field] = columnIndex
        }
      }
    })

    // A date and an amount are the minimum needed to build a transaction.
    if (found.date !== undefined && found.amount !== undefined) {
      return { index: i, columns: { ...found, date: found.date, amount: found.amount } }
    }
  }

  return null
}

export function parseSebCsv(text: string): SebParseResult {
  const transactions: SebTransaction[] = []
  const skipped: SebSkippedRow[] = []

  // Strip a UTF-8 byte order mark without embedding a literal one in source.
  const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rawLines = cleaned.split(/\r\n|\n|\r/)
  const nonEmpty = rawLines.filter((line) => line.trim() !== '')

  if (nonEmpty.length === 0) {
    return { transactions, skipped, detected: { delimiter: DELIMITERS[0], headerRow: null } }
  }

  const delimiter = sniffDelimiter(nonEmpty)
  const rows = rawLines.map((line) => splitLine(line, delimiter))

  const header = findHeader(rows)
  const columns = header ? header.columns : FALLBACK_COLUMNS
  const firstDataRow = header ? header.index + 1 : FALLBACK_HEADER_ROWS

  // Occurrence counter per date+amount, matching YNAB's import_id scheme.
  const occurrences = new Map<string, number>()

  for (let i = firstDataRow; i < rawLines.length; i++) {
    const raw = rawLines[i]
    if (raw.trim() === '') continue

    const line = i + 1
    const cells = rows[i]

    const date = parseSebDate(cells[columns.date] ?? '')
    if (date == null) {
      skipped.push({ line, raw, reason: 'Could not read a date' })
      continue
    }

    const amount = parseSwedishAmount(cells[columns.amount] ?? '')
    if (amount == null) {
      skipped.push({ line, raw, reason: 'Could not read an amount' })
      continue
    }

    const key = `${date}|${amount}`
    const occurrence = (occurrences.get(key) ?? 0) + 1
    occurrences.set(key, occurrence)

    const reference =
      columns.reference !== undefined ? (cells[columns.reference]?.trim() ?? '') : ''

    transactions.push({
      date,
      text: columns.text !== undefined ? (cells[columns.text] ?? '').trim() : '',
      reference: reference === '' ? null : reference,
      amount,
      importId: buildImportId(amount, date, occurrence)
    })
  }

  return {
    transactions,
    skipped,
    detected: { delimiter, headerRow: header ? header.index + 1 : null }
  }
}

/**
 * Read a dropped file as text, falling back to Windows-1252 when UTF-8 decoding
 * produces replacement characters — SEB has historically exported Latin-1, and
 * without this å/ä/ö arrive as mojibake in payee names.
 */
export async function readSebFile(file: File): Promise<string> {
  const utf8 = await file.text()
  if (!utf8.includes('�')) return utf8
  return new TextDecoder('windows-1252').decode(await file.arrayBuffer())
}
