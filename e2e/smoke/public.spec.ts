import { expect, test } from "@playwright/test"

test.describe("@smoke public and route protection", () => {
  test("protected customer route redirects to family login", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/)
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled()
  })

  test("login page has no server or browser runtime failure", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))

    const response = await page.goto("/login")

    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
    expect(pageErrors).toEqual([])
  })
})
