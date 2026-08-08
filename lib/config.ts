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

// Currency formatting helper
export function formatCurrency(amount: number, showDecimals = true): string {
  return new Intl.NumberFormat(APP_CONFIG.CURRENCY.locale, {
    style: "currency",
    currency: APP_CONFIG.CURRENCY.code,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount)
}
