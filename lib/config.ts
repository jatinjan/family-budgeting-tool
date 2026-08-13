export const APP_CONFIG = {
  APP_NAME: "My Balanced Family Finances",
  APP_TAGLINE: "Creating balanced families through informed financial decisions",
  CTA_TEXT: "Book a Free Workshop",
  CTA_URL: "#workshop",
  LOCATION: "Australia",
  CURRENCY: {
    code: "AUD",
    symbol: "$",
    locale: "en-AU",
  },
  THEME: {
    primary: "hsl(180, 27%, 49%)", // Soft green teal
    secondary: "hsl(340, 75%, 65%)", // Coral pink
    accent: "hsl(200, 70%, 60%)", // Sky blue
  },
} as const

/** Family app home after sign-in (Balance tab). */
export const POST_LOGIN_PATH = '/'

/** First-time setup after signup / email confirmation. */
export const POST_SIGNUP_PATH = '/household'

/**
 * Allow only same-origin app paths. Reject protocol-relative and off-site URLs.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback: string = POST_LOGIN_PATH
): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  return value
}

// Currency formatting helper
export function formatCurrency(amount: number, showDecimals = true): string {
  return new Intl.NumberFormat(APP_CONFIG.CURRENCY.locale, {
    style: "currency",
    currency: APP_CONFIG.CURRENCY.code,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount)
}
