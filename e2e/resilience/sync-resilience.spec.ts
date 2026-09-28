import { devices, expect, test, type Page } from "@playwright/test"
import {
  assertSafeRemoteTarget,
  hasPrimaryCredentials,
  login,
  makeRunId,
  primaryCredentials,
  secondCredentials,
  waitForSync,
  waitForSyncState,
} from "../helpers"

function adultCard(page: Page, name: string) {
  return page.getByTestId("adult-card").filter({ hasText: name })
}

async function createAdult(page: Page, name: string): Promise<void> {
  await page.goto("/adults")
  await page.getByRole("button", { name: /Add an Adult|Add Your First Adult/ }).first().click()
  await page.locator("#name").fill(name)
  await page.locator("#age").fill("40")
  await page.getByRole("button", { name: "Add Adult", exact: true }).click()
  await expect(adultCard(page, name)).toBeVisible()
}

async function editAdult(page: Page, currentName: string, nextName: string): Promise<void> {
  await page.goto("/adults")
  await page.getByRole("button", { name: `Edit adult ${currentName}` }).click()
  await page.locator("#name").fill(nextName)
  await page.getByRole("button", { name: "Update Adult" }).click()
  await expect(adultCard(page, nextName)).toBeVisible()
}

async function deleteAdult(page: Page, name: string): Promise<void> {
  await page.goto("/adults")
  const card = adultCard(page, name)
  if (!(await card.count())) return
  await page.getByRole("button", { name: `Delete adult ${name}` }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(card).toHaveCount(0)
  await waitForSync(page)
}

async function addAdultExpenseItem(
  page: Page,
  adultName: string,
  itemName: string
): Promise<void> {
  await page.goto("/adults")
  await adultCard(page, adultName)
    .getByRole("button", { name: "View Budget" })
    .click()
  await page.getByRole("button", { name: /Add Item to/ }).first().click()
  await page.locator("#itemName").fill(itemName)
  await page.locator("#cost").fill("25")
  await page.getByRole("button", { name: "Add Item", exact: true }).click()
  await expect(page.getByText(itemName, { exact: true })).toBeVisible()
  await waitForSync(page)
}

async function indexedDbOutboxSnapshot(page: Page, adultName: string) {
  return page.evaluate(async (expectedName) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("FamilyBudgetingApp")
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    try {
      const transaction = database.transaction(["adults", "syncQueue"], "readonly")
      const readAll = (store: string) =>
        new Promise<Record<string, unknown>[]>((resolve, reject) => {
          const request = transaction.objectStore(store).getAll()
          request.onsuccess = () => resolve(request.result as Record<string, unknown>[])
          request.onerror = () => reject(request.error)
        })
      const [adults, queue] = await Promise.all([readAll("adults"), readAll("syncQueue")])
      const adult = adults.find((row) => row.name === expectedName)
      return {
        adultStatus: adult?.syncStatus,
        pendingOperation: adult?.pendingOperation,
        queueEntries: queue.filter((row) => row.recordId === adult?.id).length,
      }
    } finally {
      database.close()
    }
  }, adultName)
}

async function injectMissingParentFailure(page: Page, itemName: string): Promise<void> {
  await page.evaluate(async (expectedName) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("FamilyBudgetingApp")
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        ["adultItems", "settings", "syncQueue"],
        "readwrite"
      )
      const itemsStore = transaction.objectStore("adultItems")
      const settingsStore = transaction.objectStore("settings")
      const queueStore = transaction.objectStore("syncQueue")
      const itemsRequest = itemsStore.getAll()
      const ownerRequest = settingsStore.get("__sync_owner_user_id")

      let items: Record<string, unknown>[] | null = null
      let owner: { value?: string } | null | undefined

      const enqueueFailure = () => {
        if (!items || owner === undefined) return
        const item = items.find((row) => row.name === expectedName)
        if (!item || typeof item.id !== "number" || !owner?.value) {
          transaction.abort()
          reject(new Error("Could not locate the synced E2E item or cache owner."))
          return
        }

        const now = Date.now()
        item.categoryId = 2_147_483_000
        item.syncStatus = "PENDING"
        item.pendingOperation = "UPDATE"
        item.lastModified = now
        itemsStore.put(item)
        queueStore.add({
          table: "adultItems",
          operation: "UPDATE",
          recordId: item.id,
          cloudId: item.cloudId ?? null,
          ownerUserId: owner.value,
          expectedUpdatedAt: item.serverUpdatedAt ?? null,
          timestamp: now,
          attempts: 0,
          lastError: null,
        })
      }

      itemsRequest.onsuccess = () => {
        items = itemsRequest.result as Record<string, unknown>[]
        enqueueFailure()
      }
      ownerRequest.onsuccess = () => {
        owner = ownerRequest.result as { value?: string } | null
        enqueueFailure()
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB aborted"))
    })

    database.close()
  }, itemName)
}

test.describe("@resilience durable outbox and conflict handling", () => {
  test("offline create is durable, idempotent, and reaches a second device", async (
    { browser, context, page },
    testInfo
  ) => {
    test.skip(testInfo.project.name !== "desktop-chromium")
    test.skip(!hasPrimaryCredentials(), "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.")
    assertSafeRemoteTarget()
    const credentials = primaryCredentials()
    const runId = makeRunId()
    const name = `${runId}-offline-adult`
    const baseURL = String(testInfo.project.use.baseURL)
    const secondContext = await browser.newContext({ ...devices["Pixel 7"], baseURL })
    const secondPage = await secondContext.newPage()

    try {
      await login(page, credentials)
      await login(secondPage, credentials)
      await page.goto("/adults")

      await context.setOffline(true)
      await createAdult(page, name)
      await waitForSyncState(page, "PENDING")

      await expect
        .poll(() => indexedDbOutboxSnapshot(page, name))
        .toEqual({
          adultStatus: "PENDING",
          pendingOperation: "CREATE",
          queueEntries: 1,
        })

      await context.setOffline(false)
      await waitForSync(page)

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await context.setOffline(true)
        await page.waitForTimeout(100)
        await context.setOffline(false)
        await waitForSync(page)
      }

      await secondPage.goto("/adults")
      await secondPage.reload()
      await expect(adultCard(secondPage, name)).toHaveCount(1)
    } finally {
      await context.setOffline(false)
      await deleteAdult(page, name)
      await secondContext.close()
    }
  })

  test("stale offline update reports conflict and cannot overwrite cloud", async (
    { browser, context, page },
    testInfo
  ) => {
    test.skip(testInfo.project.name !== "desktop-chromium")
    test.skip(!hasPrimaryCredentials(), "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.")
    assertSafeRemoteTarget()
    const credentials = primaryCredentials()
    const runId = makeRunId()
    const original = `${runId}-conflict-adult`
    const offlineName = `${original}-offline`
    const cloudName = `${original}-cloud`
    const baseURL = String(testInfo.project.use.baseURL)
    const secondContext = await browser.newContext({ ...devices["Pixel 7"], baseURL })
    const secondPage = await secondContext.newPage()

    try {
      await login(page, credentials)
      await createAdult(page, original)
      await waitForSync(page)

      await login(secondPage, credentials)
      await secondPage.goto("/adults")
      await expect(adultCard(secondPage, original)).toBeVisible()

      await context.setOffline(true)
      await editAdult(page, original, offlineName)
      await waitForSyncState(page, "PENDING")

      await editAdult(secondPage, original, cloudName)
      await waitForSync(secondPage)

      await context.setOffline(false)
      await waitForSyncState(page, "CONFLICT")

      await secondPage.reload()
      await expect(adultCard(secondPage, cloudName)).toBeVisible()
      await expect(adultCard(secondPage, offlineName)).toHaveCount(0)
    } finally {
      await context.setOffline(false)
      await deleteAdult(secondPage, cloudName)
      await secondContext.close()
    }
  })

  test("failed mutation does not block unrelated cloud hydration", async (
    { browser, context, page },
    testInfo
  ) => {
    test.skip(testInfo.project.name !== "desktop-chromium")
    test.skip(!hasPrimaryCredentials(), "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.")
    test.skip(
      process.env.E2E_DESTRUCTIVE_STAGING !== "true",
      "Requires a separate staging Supabase project."
    )
    assertSafeRemoteTarget()

    const credentials = primaryCredentials()
    const runId = makeRunId()
    const original = `${runId}-failed-row`
    const cloudName = `${original}-cloud`
    const itemName = `${runId}-orphan-item`
    const baseURL = String(testInfo.project.use.baseURL)
    const secondContext = await browser.newContext({ ...devices["Pixel 7"], baseURL })
    const secondPage = await secondContext.newPage()

    try {
      await login(page, credentials)
      await createAdult(page, original)
      await waitForSync(page)
      await addAdultExpenseItem(page, original, itemName)
      await login(secondPage, credentials)

      await context.setOffline(true)
      await injectMissingParentFailure(page, itemName)
      await context.setOffline(false)
      await waitForSyncState(page, "FAILED")

      await editAdult(secondPage, original, cloudName)
      await waitForSync(secondPage)

      await page.goto("/adults")
      await expect(adultCard(page, cloudName)).toBeVisible()
      await expect(page.getByTestId("sync-probe")).toHaveAttribute(
        "data-sync-state",
        "FAILED"
      )
    } finally {
      await context.setOffline(false)
      await deleteAdult(secondPage, cloudName)
      await secondContext.close()
    }
  })
})

test.describe("@resilience account isolation", () => {
  test("switching accounts never exposes the previous family cache", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium")
    test.skip(!hasPrimaryCredentials(), "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.")
    assertSafeRemoteTarget()
    const first = primaryCredentials()
    const second = secondCredentials()
    test.skip(!second, "Set E2E_SECOND_USER_EMAIL and E2E_SECOND_USER_PASSWORD.")

    const runId = makeRunId()
    const firstName = `${runId}-first-account`
    const secondName = `${runId}-second-account`

    await login(page, first)
    await createAdult(page, firstName)
    await waitForSync(page)
    await page.getByRole("button", { name: "Sign out" }).click()

    await login(page, second!)
    await page.goto("/adults")
    await expect(adultCard(page, firstName)).toHaveCount(0)
    await createAdult(page, secondName)
    await waitForSync(page)
    await page.getByRole("button", { name: "Sign out" }).click()

    await login(page, first)
    await page.goto("/adults")
    await expect(adultCard(page, firstName)).toBeVisible()
    await expect(adultCard(page, secondName)).toHaveCount(0)
    await deleteAdult(page, firstName)
    await page.getByRole("button", { name: "Sign out" }).click()

    await login(page, second!)
    await deleteAdult(page, secondName)
  })
})
