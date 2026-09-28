import { expect, type Page } from "@playwright/test"

export type Credentials = {
  email: string
  password: string
}

export function primaryCredentials(): Credentials {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD
  if (!email || !password) {
    throw new Error(
      "Set E2E_USER_EMAIL and E2E_USER_PASSWORD in .env.e2e.local or CI secrets."
    )
  }
  return { email, password }
}

export function secondCredentials(): Credentials | null {
  const email = process.env.E2E_SECOND_USER_EMAIL
  const password = process.env.E2E_SECOND_USER_PASSWORD
  return email && password ? { email, password } : null
}

export function hasPrimaryCredentials(): boolean {
  return Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD)
}

export function assertSafeRemoteTarget(): void {
  const baseUrl = process.env.E2E_BASE_URL || ""
  if (baseUrl && process.env.E2E_ALLOW_LIVE_BACKEND !== "true") {
    throw new Error(
      "Remote E2E is blocked. Set E2E_ALLOW_LIVE_BACKEND=true only for dedicated test accounts."
    )
  }
}

export function makeRunId(): string {
  const suffix = Math.random().toString(36).slice(2, 7)
  return `e2e-${Date.now()}-${suffix}`
}

export async function login(page: Page, credentials: Credentials): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.locator("#email").fill(credentials.email)
  await page.locator("#password").fill(credentials.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({
    timeout: 30_000,
  })
  await waitForSync(page)
}

export async function waitForSync(page: Page, timeout = 45_000): Promise<void> {
  const probe = page.getByTestId("sync-probe")
  if ((await probe.count()) === 0) {
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()
    await page.waitForLoadState("networkidle", { timeout: Math.min(timeout, 20_000) }).catch(() => undefined)
    await page.waitForTimeout(3_000)
    return
  }
  await expect(probe).toBeAttached()
  await expect
    .poll(async () => probe.getAttribute("data-sync-state"), {
      timeout,
      message: "Expected sync to leave the SYNCING state",
    })
    .not.toBe("SYNCING")
}

export async function waitForSyncState(
  page: Page,
  state: "PENDING" | "FAILED" | "CONFLICT",
  timeout = 45_000
): Promise<void> {
  const probe = page.getByTestId("sync-probe")
  await expect(probe).toBeAttached()
  await expect
    .poll(() => probe.getAttribute("data-sync-state"), {
      timeout,
      message: `Expected sync state ${state}`,
    })
    .toBe(state)
}

export async function openRadixSelect(
  page: Page,
  triggerSelector: string,
  optionName: string
): Promise<void> {
  await page.locator(triggerSelector).click()
  await page.getByRole("option", { name: optionName, exact: true }).click()
}

export function collectRuntimeFailures(page: Page): string[] {
  const failures: string[] = []
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`))
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failures.push(`${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })
  return failures
}
