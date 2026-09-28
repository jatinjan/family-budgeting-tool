import { expect, test, type Page } from "@playwright/test"
import {
  assertSafeRemoteTarget,
  collectRuntimeFailures,
  hasPrimaryCredentials,
  login,
  makeRunId,
  primaryCredentials,
  waitForSync,
} from "../helpers"

function adminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  return email && password ? { email, password } : null
}

async function adminLogin(page: Page, credentials: { email: string; password: string }) {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" })
  await page.locator("#admin-email").fill(credentials.email)
  await page.locator("#admin-password").fill(credentials.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 })
}

async function openFamily(page: Page, familyEmail: string) {
  await page.goto("/admin")
  await page.getByRole("row").filter({ hasText: familyEmail }).first().click()
  await expect(page).toHaveURL(/\/admin\/families\/[0-9a-f-]+$/, { timeout: 30_000 })
}

test.describe("@coach assist mode: one writer at a time", () => {
  test.describe.configure({ retries: 0 })

  test("coach edits while the family app is view-only, then family sees the changes", async (
    { browser, page },
    testInfo,
  ) => {
    test.setTimeout(300_000)
    test.skip(testInfo.project.name !== "desktop-chromium", "Creates its own coach context.")
    test.skip(!hasPrimaryCredentials(), "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.")
    const admin = adminCredentials()
    test.skip(!admin, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.")
    assertSafeRemoteTarget()

    const family = primaryCredentials()
    const adultName = `${makeRunId()}-coach-adult`
    const familyFailures = collectRuntimeFailures(page)
    const coachContext = await browser.newContext({ baseURL: String(testInfo.project.use.baseURL) })
    const coach = await coachContext.newPage()

    try {
      await login(page, family)
      await adminLogin(coach, admin!)
      await openFamily(coach, family.email)

      await coach.getByRole("button", { name: "Ask to help edit" }).click()
      await expect(coach.getByText(/Waiting for the family to accept/)).toBeVisible()

      await page.getByRole("button", { name: /^Let .+ help$/ }).click({ timeout: 60_000 })
      await expect(page.getByText(/is filling in your budget/)).toBeVisible({ timeout: 30_000 })

      await coach.getByRole("button", { name: "Edit budget" }).click({ timeout: 30_000 })
      await expect(coach.getByRole("heading", { name: /^Editing .+ budget$/ })).toBeVisible()
      await coach.getByRole("tab", { name: /Adults/ }).click()
      await coach.getByRole("button", { name: "Add adult" }).click()
      await coach.locator("#entity-name").fill(adultName)
      await coach.locator("#entity-age").fill("40")
      await coach.getByRole("button", { name: "Save" }).click()
      await expect(coach.getByRole("heading", { name: adultName })).toBeVisible({ timeout: 30_000 })

      await coach.getByRole("button", { name: "Done" }).click()
      await expect(page.getByText(/is filling in your budget/)).toHaveCount(0, { timeout: 60_000 })
      await waitForSync(page)

      await page.goto("/adults")
      await expect(page.getByRole("heading", { name: adultName, exact: true })).toBeVisible({ timeout: 45_000 })
      expect(familyFailures).toEqual([])
    } finally {
      await page.goto("/adults").catch(() => undefined)
      const card = page
        .getByRole("heading", { name: adultName, exact: true })
        .locator("xpath=ancestor::*[.//button[normalize-space()='View Budget']][1]")
      if (await card.count().catch(() => 0)) {
        await card.getByRole("button").last().click().catch(() => undefined)
        await page.getByRole("button", { name: "Delete", exact: true }).click().catch(() => undefined)
        await waitForSync(page).catch(() => undefined)
      }
      await coachContext.close().catch(() => undefined)
    }
  })
})
