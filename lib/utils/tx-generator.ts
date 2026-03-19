// lib/utils/tx-generator.ts
import type { Currency, TxType, GeneratedTransaction } from '@/types'

// ── Static lookup tables ──────────────────────────────────────────────────────

const MERCHANTS: Record<TxType, readonly string[]> = {
  card_payment:   ['Amazon','Spotify','Netflix','Uber','Bolt','H&M','Zara','McDonald\'s','Starbucks','Apple','Google','Steam','IKEA','Airbnb','Booking.com','Deliveroo','Glovo','Aldi','Lidl','Rewe','Zalando','AboutYou','Decathlon','MediaMarkt','Saturn'],
  atm_withdrawal: ['ATM Withdrawal'],
  sepa_transfer:  ['Invoice Payment','Rent Payment','Freelance Income','Contractor Payment','Salary Transfer','Business Transfer','Bank Transfer'],
  fx_exchange:    ['Currency Exchange','FX Conversion','Wise Transfer','Revolut Exchange','Currency Swap'],
  standing_order: ['Monthly Subscription','Gym Membership','Insurance Premium','Magazine Subscription','Streaming Bundle'],
  direct_debit:   ['Electricity Bill','Gas Bill','Internet Provider','Phone Bill','Water Bill','Council Tax','TV Licence'],
  salary:         ['Monthly Salary','Employment Income','Wages','Contract Payment','Bonus Payment'],
  refund:         ['Refund','Cashback','Return Credit','Chargeback','Compensation'],
  fee:            ['Account Fee','Transfer Fee','FX Fee','Card Replacement Fee','Overdraft Fee'],
  interest:       ['Interest Credit','Savings Interest','Overdraft Interest Charge'],
} as const

const CATEGORIES: Record<TxType, string> = {
  card_payment:   'Shopping',
  atm_withdrawal: 'Cash',
  sepa_transfer:  'Transfer',
  fx_exchange:    'Currency',
  standing_order: 'Subscription',
  direct_debit:   'Bills',
  salary:         'Income',
  refund:         'Income',
  fee:            'Banking',
  interest:       'Banking',
}

const AMOUNT_RANGES: Record<TxType, readonly [number, number]> = {
  card_payment:   [3,    800],
  atm_withdrawal: [20,   500],
  sepa_transfer:  [50,   5_000],
  fx_exchange:    [100,  3_000],
  standing_order: [5,    200],
  direct_debit:   [30,   300],
  salary:         [1_500, 8_000],
  refund:         [5,    500],
  fee:            [0.5,  25],
  interest:       [0.01, 50],
}

const TYPE_WEIGHTS: readonly [TxType, number][] = [
  ['card_payment',   40],
  ['sepa_transfer',  15],
  ['direct_debit',   12],
  ['atm_withdrawal', 10],
  ['salary',          8],
  ['standing_order',  7],
  ['fx_exchange',     4],
  ['refund',          2],
  ['fee',             1],
  ['interest',        1],
]

const CREDIT_TYPES = new Set<TxType>(['salary', 'refund', 'interest'])

// ── Pure helpers ──────────────────────────────────────────────────────────────

function weightedRandom(pairs: readonly (readonly [TxType, number])[]): TxType {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [item, weight] of pairs) {
    r -= weight
    if (r <= 0) return item
  }
  return pairs[pairs.length - 1]![0]
}

function randomBetween(min: number, max: number): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(2))
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randomDate(from: Date, to: Date): Date {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))
}

function generateReference(): string {
  return `REF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function buildDescription(type: TxType, merchant: string, currency: Currency): string {
  const prefixes: Partial<Record<TxType, string>> = {
    sepa_transfer:   'SEPA',
    fx_exchange:     `FX ${currency}`,
    standing_order:  'SO',
    direct_debit:    'DD',
  }
  const prefix = prefixes[type]
  return prefix ? `${prefix} · ${merchant}` : merchant
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface GeneratorOptions {
  dateFrom: Date
  dateTo: Date
  currencies: Currency[]
  types: TxType[]          // empty array = all types
  minAmount: number
  maxAmount: number
  count: number
}

export function generateTransactions(opts: GeneratorOptions): GeneratedTransaction[] {
  const { dateFrom, dateTo, currencies, types, minAmount, maxAmount, count } = opts

  const effectiveWeights = types.length > 0
    ? TYPE_WEIGHTS.filter(([t]) => types.includes(t))
    : TYPE_WEIGHTS

  if (effectiveWeights.length === 0) {
    throw new Error('No valid transaction types after filtering')
  }

  return Array.from({ length: count }, () => {
    const type = weightedRandom(effectiveWeights)
    const currency = randomFrom(currencies)
    const merchant = randomFrom(MERCHANTS[type])
    const [rMin, rMax] = AMOUNT_RANGES[type]

    const clampedMin = Math.max(minAmount, rMin)
    const clampedMax = Math.min(maxAmount, rMax)
    const rawAmount = randomBetween(
      clampedMin > clampedMax ? rMin : clampedMin,
      clampedMin > clampedMax ? rMax : clampedMax,
    )

    const isCredit = CREDIT_TYPES.has(type)
    const amount = isCredit ? rawAmount : -rawAmount

    return {
      id:          crypto.randomUUID(),
      date:        randomDate(dateFrom, dateTo).toISOString(),
      description: buildDescription(type, merchant, currency),
      amount,
      currency,
      type,
      merchant,
      category:    CATEGORIES[type],
      reference:   generateReference(),
      metadata: {
        source:      'history-generator',
        generatedAt: new Date().toISOString(),
      },
    } satisfies GeneratedTransaction
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
