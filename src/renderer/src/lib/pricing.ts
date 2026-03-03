// ── Pricing configuration for Analytics ────────────────────────────────────
// Prices in USD per million tokens (MTok).
// Source: https://platform.claude.com/docs/en/about-claude/pricing

export interface ModelPrice {
  input: number   // $ per MTok
  output: number  // $ per MTok
}

export type DiscountTier = 'none' | '2pct' | '5pct' | '9pct' | 'custom'

export interface PricingConfig {
  models: Record<string, ModelPrice>
  discountTier: DiscountTier
  customDiscountPct: number   // 0–100, used when tier === 'custom'
  lastFetched: string | null  // ISO timestamp
}

// ── Defaults (matches live pricing as of Mar 2026) ──────────────────────────

export const DISCOUNT_TIERS: Record<DiscountTier, { label: string; pct: number; desc: string }> = {
  none:   { label: 'No discount',    pct: 0,   desc: 'Standard list pricing' },
  '2pct': { label: '2% off',         pct: 2,   desc: 'Commitments $100k – $500k' },
  '5pct': { label: '5% off',         pct: 5,   desc: 'Commitments $500k – $1M' },
  '9pct': { label: '9% off',         pct: 9,   desc: 'Commitments over $1M' },
  custom: { label: 'Custom',         pct: 0,   desc: 'Enter your negotiated rate' },
}

export const DEFAULT_MODELS: Record<string, ModelPrice> = {
  'claude-opus-4-6':              { input: 5,    output: 25   },
  'claude-opus-4-5':              { input: 5,    output: 25   },
  'claude-opus-4':                { input: 15,   output: 75   },
  'claude-sonnet-4-6':            { input: 3,    output: 15   },
  'claude-sonnet-4-5':            { input: 3,    output: 15   },
  'claude-sonnet-4-5-20250929':   { input: 3,    output: 15   },
  'claude-sonnet-4':              { input: 3,    output: 15   },
  'claude-haiku-4-5':             { input: 1,    output: 5    },
  'claude-haiku-4-5-20251001':    { input: 1,    output: 5    },
  'claude-haiku-3-5':             { input: 0.80, output: 4    },
  'claude-haiku-3':               { input: 0.25, output: 1.25 },
}

const STORAGE_KEY = 'claude-gui-pricing'

export function getPricingConfig(): PricingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PricingConfig
      // Merge defaults for any models not in stored config
      return {
        ...parsed,
        models: { ...DEFAULT_MODELS, ...parsed.models },
      }
    }
  } catch { /* ignore */ }
  return {
    models: { ...DEFAULT_MODELS },
    discountTier: 'none',
    customDiscountPct: 0,
    lastFetched: null,
  }
}

export function savePricingConfig(config: PricingConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

// ── Discount math ────────────────────────────────────────────────────────────

export function getDiscountPct(config: PricingConfig): number {
  if (config.discountTier === 'custom') return Math.max(0, Math.min(100, config.customDiscountPct))
  return DISCOUNT_TIERS[config.discountTier].pct
}

export function applyDiscount(cost: number, config: PricingConfig): number {
  const pct = getDiscountPct(config)
  return cost * (1 - pct / 100)
}

// ── Live pricing fetch ───────────────────────────────────────────────────────

// Maps display names from the Anthropic docs page to our model key patterns
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    // Handle common abbreviations on the page
    .replace('claude-', '')
}

function parsePrice(cell: string): number | null {
  const m = cell.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/)
  return m ? parseFloat(m[1]) : null
}

// Strip HTML tags from a string
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}

export async function fetchLatestPricing(): Promise<Partial<Record<string, ModelPrice>> | null> {
  const PRICING_URL = 'https://platform.claude.com/docs/en/about-claude/pricing'

  try {
    const html = await fetch(PRICING_URL, { cache: 'no-store' }).then(r => r.text())

    // Strategy 1: parse <table> tags (static HTML)
    const result: Record<string, ModelPrice> = {}

    // Find the first table (Model pricing table)
    const tableMatch = html.match(/<table[\s\S]*?<\/table>/)
    if (tableMatch) {
      const rows = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/gi) || []
      for (const row of rows.slice(1)) { // skip header
        const cells = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map(c => stripTags(c))
        if (cells.length >= 2) {
          const rawName = cells[0].replace(/\(deprecated\)/gi, '').trim()
          const inputPrice = parsePrice(cells[1])
          const outputPrice = parsePrice(cells[cells.length - 1])
          if (rawName && inputPrice !== null && outputPrice !== null) {
            // Try to find which default model key this matches
            const normalizedInput = rawName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            for (const key of Object.keys(DEFAULT_MODELS)) {
              if (normalizedInput.includes(normalizeName(key)) || key.includes(normalizedInput)) {
                result[key] = { input: inputPrice, output: outputPrice }
              }
            }
          }
        }
      }
    }

    // Strategy 2: look for markdown-style table in script/pre blocks
    if (Object.keys(result).length === 0) {
      // Match lines like: | Claude Opus 4.6 | $5 / MTok | ... | $25 / MTok |
      const tableRows = html.match(/\|\s*Claude[^|]+\|\s*\$[^|]+\|[^|]*\|[^|]*\|\s*\$[^|]+\|/g) || []
      for (const row of tableRows) {
        const parts = row.split('|').map(p => stripTags(p).trim()).filter(Boolean)
        if (parts.length >= 2) {
          const rawName = parts[0].replace(/\(deprecated\)/gi, '').trim()
          const inputPrice = parsePrice(parts[1])
          const outputPrice = parsePrice(parts[parts.length - 1])
          if (rawName && inputPrice !== null && outputPrice !== null) {
            const normalizedInput = rawName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            for (const key of Object.keys(DEFAULT_MODELS)) {
              if (normalizedInput.includes(normalizeName(key)) || key.includes(normalizedInput)) {
                result[key] = { input: inputPrice, output: outputPrice }
              }
            }
          }
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null
  } catch {
    return null
  }
}
