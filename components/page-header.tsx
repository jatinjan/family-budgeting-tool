import { APP_CONFIG } from "@/lib/config"

export function PageHeader() {
  return (
    <div className="mb-6 text-center">
      <h1 className="mb-1 font-serif text-2xl font-bold text-balance text-primary">
        {APP_CONFIG.APP_NAME}
      </h1>
      <p className="text-sm text-muted-foreground text-balance">
        {APP_CONFIG.APP_TAGLINE}
      </p>
    </div>
  )
}
