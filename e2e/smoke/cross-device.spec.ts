import { devices, expect, test, type Page } from "@playwright/test"
import {
  assertSafeRemoteTarget,
  collectRuntimeFailures,
  hasPrimaryCredentials,
  login,
  makeRunId,
  openRadixSelect,
  primaryCredentials,
  waitForSync,
} from "../helpers"

type EntityKind = "adult" | "child" | "household"

function entityCard(page: Page, _kind: EntityKind, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::*[.//button[normalize-space()='View Budget']][1]")
}

async function createAdult(page: Page, name: string): Promise<void> {
  await page.goto("/adults")
  await page.getByRole("button", { name: /Add an Adult|Add Your First Adult/ }).first().click()
  await page.locator("#name").fill(name)
  await page.locator("#age").fill("37")
  await page.getByRole("button", { name: "Add Adult", exact: true }).click()
  await expect(entityCard(page, "adult", name)).toBeVisible()
  await waitForSync(page)
}

async function createChild(page: Page, name: string): Promise<void> {
  await page.goto("/children")
  await page.getByRole("button", { name: /Add a Child|Add Your First Child/ }).first().click()
  await page.locator("#name").fill(name)
  await page.locator("#age").fill("9")
  await openRadixSelect(page, "#schoolLevel", "Primary School")
  await page.getByRole("button", { name: "Add Child", exact: true }).click()
  await expect(entityCard(page, "child", name)).toBeVisible()
  await waitForSync(page)
}

async function ensureHousehold(page: Page, name: string): Promise<{ created: boolean; name: string }> {
  await page.goto("/household")
  const existingHeading = page.getByRole("heading", { name: "Your Household" })
  const addButton = page.getByRole("button", { name: /Add Your Household/ }).first()
  await expect(existingHeading.or(addButton)).toBeVisible({ timeout: 30_000 })
  if (await existingHeading.isVisible()) {
    const currentName = (await page.getByRole("heading", { level: 3 }).first().innerText()).trim()
    if (currentName.startsWith("e2e-")) {
      await deleteEntityIfPresent(page, "/household", "household", [currentName])
    } else {
      return { created: false, name: currentName }
    }
  }
  await addButton.click()
  await page.locator("#name").fill(name)
  await openRadixSelect(page, "#housingType", "House - Owned")
  await page.locator("#members").fill("3")
  await page.getByRole("button", { name: "Add Household", exact: true }).click()
  await expect(entityCard(page, "household", name)).toBeVisible()
  await waitForSync(page)
  return { created: true, name }
}

async function openEntityBudget(page: Page, kind: EntityKind, entityName: string): Promise<void> {
  const listRoute = kind === "adult" ? "/adults" : kind === "child" ? "/children" : "/household"
  await page.goto(listRoute, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: entityName, exact: true })).toBeVisible({
    timeout: 30_000,
  })
  await entityCard(page, kind, entityName).getByRole("button", { name: "View Budget" }).click()
  const budgetTitle = kind === "household" ? `${entityName} Budget` : `${entityName}'s Budget`
  await expect(page.getByRole("heading", { name: budgetTitle })).toBeVisible({ timeout: 30_000 })
}

async function revealAddItemButton(page: Page, category: string) {
  const addItem = page.getByRole("button", { name: `Add Item to ${category}` })
  await expect(async () => {
    if (await addItem.isVisible()) return
    const heading = page.getByRole("heading", { name: category, exact: true })
    await expect(heading).toBeVisible()
    await heading.click()
    await expect(addItem).toBeVisible()
  }).toPass({ timeout: 45_000 })
  return addItem
}

async function addExpenseItem(
  page: Page,
  kind: EntityKind,
  entityName: string,
  itemName: string
): Promise<void> {
  await openEntityBudget(page, kind, entityName)
  const preferred = kind === "household" ? "Housing" : "Education"
  const addItem = await revealAddItemButton(page, preferred)
  await addItem.click()
  await page.locator("#itemName").fill(itemName)
  await page.locator("#cost").fill("42")
  await page.getByRole("button", { name: "Add Item", exact: true }).click()
  await expect(page.getByText(itemName, { exact: true })).toBeVisible()
  await waitForSync(page)
}

async function verifyEntityAndItem(
  page: Page,
  route: string,
  kind: EntityKind,
  entityName: string,
  itemName: string
): Promise<void> {
  await openEntityBudget(page, kind, entityName)
  await waitForSync(page)
  const item = page.getByText(itemName, { exact: true })
  const preferred = route.includes("household") ? ["Housing", "Education"] : ["Education", "Housing"]
  const expandPreferred = async () => {
    for (const category of preferred) {
      if (await item.isVisible()) return
      const trigger = page
        .locator("button")
        .filter({ has: page.getByRole("heading", { name: category, exact: true }) })
        .first()
      if (!(await trigger.count())) continue
      if ((await trigger.getAttribute("data-state")) !== "open") {
        await trigger.click()
      }
    }
  }
  await expandPreferred()
  if (!(await item.isVisible().catch(() => false))) {
    await page.reload({ waitUntil: "domcontentloaded" })
    const budgetTitle = kind === "household" ? `${entityName} Budget` : `${entityName}'s Budget`
    await expect(page.getByRole("heading", { name: budgetTitle })).toBeVisible({ timeout: 20_000 })
    await expandPreferred()
  }
  await expect(item).toBeVisible({ timeout: 20_000 })
}

async function clickLabeledOrNth(
  page: Page,
  name: string,
  fallbackLocator: ReturnType<Page["getByRole"]>,
  fallbackIndex: number | "last"
): Promise<void> {
  const labeled = page.getByRole("button", { name })
  if (await labeled.count()) {
    await labeled.click()
    return
  }
  if (fallbackIndex === "last") {
    await fallbackLocator.last().click()
    return
  }
  await fallbackLocator.nth(fallbackIndex).click()
}

async function deleteExpenseItemIfPresent(
  page: Page,
  route: string,
  kind: EntityKind,
  entityName: string,
  itemName: string
): Promise<void> {
  await page.goto(route)
  const card = entityCard(page, kind, entityName)
  if (!(await card.count())) return
  await card.getByRole("button", { name: "View Budget" }).click()
  const deleteButton = page.getByRole("button", { name: `Delete expense item ${itemName}` })
  if (await deleteButton.count()) {
    await deleteButton.click()
  } else if (await page.getByText(itemName, { exact: true }).count()) {
    await page
      .getByText(itemName, { exact: true })
      .locator("xpath=ancestor::div[contains(@class,'flex')][1]")
      .getByRole("button")
      .last()
      .click()
  } else {
    return
  }
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByText(itemName, { exact: true })).toHaveCount(0)
  await waitForSync(page)
}

async function captureIntention(page: Page) {
  await page.goto("/")
  const checked = page.getByRole("radio", { checked: true })
  return {
    goal: (await checked.count()) ? (await checked.innerText()).trim() : "",
    yearly: await page.locator("#yearly-goal").inputValue(),
    monthly: await page.locator("#monthly-buffer").inputValue(),
  }
}

async function restoreIntention(
  page: Page,
  previous: { goal: string; yearly: string; monthly: string }
): Promise<void> {
  await page.goto("/")
  if (previous.goal) {
    await page.getByRole("radio", { name: previous.goal }).click()
  }
  await page.locator("#yearly-goal").fill(previous.yearly)
  await page.locator("#monthly-buffer").fill(previous.monthly)
  if (previous.goal || previous.yearly || previous.monthly) {
    await page.getByRole("button", { name: "Set your intention" }).click()
    await expect(page.getByText("Saved", { exact: true })).toBeVisible()
  }
}

async function deletePrefixedTestEntities(page: Page): Promise<void> {
  for (const [route, kind] of [
    ["/adults", "adult"],
    ["/children", "child"],
    ["/household", "household"],
  ] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" })
    await page.getByRole("button", { name: /Add (an Adult|a Child)|Add Your First|Add Your Household/ }).first().waitFor({ timeout: 20_000 }).catch(() => undefined)
    await page.waitForTimeout(2_000)
    const names = (await page.getByRole("heading", { level: 3 }).allInnerTexts())
      .map((name) => name.trim())
      .filter((name) => name.startsWith("e2e-"))
    if (names.length) {
      await deleteEntityIfPresent(page, route, kind, names)
    }
  }
}

async function deleteEntityIfPresent(
  page: Page,
  route: string,
  kind: EntityKind,
  names: string[]
): Promise<void> {
  await page.goto(route)
  for (const name of names) {
    const card = entityCard(page, kind, name)
    if (!(await card.count())) continue
    const labeled = card.getByRole("button", { name: `Delete ${kind} ${name}` })
    if (await labeled.count()) {
      await labeled.click()
    } else {
      await card.getByRole("button").last().click()
    }
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(card).toHaveCount(0)
    await waitForSync(page)
  }
}

test.describe("@smoke cloud-first cross-device acceptance", () => {
  test.describe.configure({ retries: 0 })
  test("desktop and mobile converge without chart flicker", async (
    { browser, page },
    testInfo
  ) => {
    test.setTimeout(360_000)
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "This scenario creates its own desktop and mobile contexts."
    )
    test.skip(!hasPrimaryCredentials(), "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run authenticated smoke.")
    assertSafeRemoteTarget()

    const credentials = primaryCredentials()
    const runId = makeRunId()
    const adultName = `${runId}-adult`
    const adultUpdatedName = `${adultName}-mobile`
    const adultFinalName = `${adultName}-chart`
    const childName = `${runId}-child`
    const householdName = `${runId}-home`
    const adultItem = `${runId}-adult-item`
    const childItem = `${runId}-child-item`
    const householdItem = `${runId}-home-item`
    const runtimeFailures = collectRuntimeFailures(page)

    const baseURL = String(testInfo.project.use.baseURL)
    const mobileContext = await browser.newContext({
      ...devices["Pixel 7"],
      baseURL,
    })
    const mobile = await mobileContext.newPage()
    const mobileRuntimeFailures = collectRuntimeFailures(mobile)
    let household: { created: boolean; name: string } | null = null
    let previousIntention: { goal: string; yearly: string; monthly: string } | null = null

    try {
      await login(page, credentials)
      previousIntention = await captureIntention(page)
      await deletePrefixedTestEntities(page)

      await createAdult(page, adultName)
      await addExpenseItem(page, "adult", adultName, adultItem)

      await createChild(page, childName)
      await addExpenseItem(page, "child", childName, childItem)

      household = await ensureHousehold(page, householdName)
      await addExpenseItem(page, "household", household.name, householdItem)

      await login(mobile, credentials)
      await mobile.goto("/adults", { waitUntil: "domcontentloaded" })
      await expect(mobile.getByRole("heading", { name: adultName, exact: true })).toBeVisible({
        timeout: 45_000,
      })
      await verifyEntityAndItem(mobile, "/adults", "adult", adultName, adultItem)
      await verifyEntityAndItem(mobile, "/children", "child", childName, childItem)
      await verifyEntityAndItem(
        mobile,
        "/household",
        "household",
        household.name,
        householdItem
      )

      await mobile.goto("/adults")
      await clickLabeledOrNth(
        mobile,
        `Edit adult ${adultName}`,
        entityCard(mobile, "adult", adultName).getByRole("button"),
        2
      )
      await mobile.locator("#name").fill(adultUpdatedName)
      await mobile.getByRole("button", { name: "Update Adult" }).click()
      await waitForSync(mobile)

      await page.goto("/adults")
      await expect(entityCard(page, "adult", adultUpdatedName)).toBeVisible()

      await page.goto("/")
      await page.getByRole("radio", { name: "Build a safety buffer" }).click()
      await page.locator("#yearly-goal").fill("2400")
      await page.locator("#monthly-buffer").fill("200")
      await page.getByRole("button", { name: "Set your intention" }).click()
      await expect(page.getByText("Saved", { exact: true })).toBeVisible()

      const cleanContext = await browser.newContext({
        ...devices["iPhone 14"],
        baseURL,
      })
      const cleanDevice = await cleanContext.newPage()
      try {
        await login(cleanDevice, credentials)
        await expect(
          cleanDevice.getByRole("radio", { name: "Build a safety buffer" })
        ).toHaveAttribute("aria-checked", "true")
        await expect(cleanDevice.locator("#yearly-goal")).toHaveValue("2400")
        await expect(cleanDevice.locator("#monthly-buffer")).toHaveValue("200")
      } finally {
        await cleanContext.close()
      }

      await page.goto("/dashboard")
      const chart = page.getByTestId("dashboard-overview-chart").or(
        page.getByRole("heading", { name: "Family Spending Overview" }).locator("xpath=ancestor::div[contains(@class,'rounded')][1]")
      )
      await expect(chart).toBeVisible()
      const originalChart = await chart.elementHandle()
      expect(originalChart).not.toBeNull()

      await mobile.goto("/adults")
      await clickLabeledOrNth(
        mobile,
        `Edit adult ${adultUpdatedName}`,
        entityCard(mobile, "adult", adultUpdatedName).getByRole("button"),
        2
      )
      await mobile.locator("#name").fill(adultFinalName)
      await mobile.getByRole("button", { name: "Update Adult" }).click()
      await waitForSync(mobile)
      await page.waitForTimeout(3_000)
      expect(await originalChart!.evaluate((node) => node.isConnected)).toBe(true)
      await expect(chart.locator(".recharts-responsive-container")).toBeVisible()

      await mobile.goto("/children")
      await entityCard(mobile, "child", childName)
        .getByRole("button", { name: "View Budget" })
        .click()
      await clickLabeledOrNth(
        mobile,
        `Delete expense item ${childItem}`,
        mobile.getByText(childItem, { exact: true }).locator("xpath=ancestor::div[contains(@class,'flex')][1]").getByRole("button"),
        "last"
      )
      await mobile.getByRole("button", { name: "Delete", exact: true }).click()
      await waitForSync(mobile)

      await page.goto("/children")
      await entityCard(page, "child", childName)
        .getByRole("button", { name: "View Budget" })
        .click()
      await expect(page.getByText(childItem, { exact: true })).toHaveCount(0)

      expect([...runtimeFailures, ...mobileRuntimeFailures]).toEqual([])
    } finally {
      if (!page.isClosed()) {
        if (previousIntention) {
          await restoreIntention(page, previousIntention).catch(() => undefined)
        }
        await deleteEntityIfPresent(page, "/children", "child", [childName]).catch(() => undefined)
        await deleteEntityIfPresent(page, "/adults", "adult", [
          adultName,
          adultUpdatedName,
          adultFinalName,
        ]).catch(() => undefined)
        if (household?.created) {
          await deleteEntityIfPresent(page, "/household", "household", [household.name]).catch(
            () => undefined
          )
        } else if (household) {
          await deleteExpenseItemIfPresent(
            page,
            "/household",
            "household",
            household.name,
            householdItem
          ).catch(() => undefined)
        }
      }
      await mobileContext.close().catch(() => undefined)
    }
  })
})
