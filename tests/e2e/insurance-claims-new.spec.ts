import { test, expect } from './fixtures/auth'

test.describe('New Insurance Claim', () => {
  test('shows the claim form with a disabled submit until a patient is chosen', async ({
    adminPage: page,
  }) => {
    await page.goto('/billing/insurance/new')
    await expect(page.getByRole('heading', { name: /new insurance claim/i })).toBeVisible()

    const submit = page.getByRole('button', { name: /create draft claim/i })
    await expect(submit).toBeDisabled()

    await expect(page.getByLabel(/insurance provider/i)).toBeVisible()
    await expect(page.getByLabel(/policy number/i)).toBeVisible()
    await expect(page.getByLabel(/claim amount/i)).toBeVisible()
  })

  test('searches for a patient and loads their billing context', async ({ adminPage: page }) => {
    await page.goto('/billing/insurance/new')

    const search = page.getByLabel(/search patients/i)
    await search.fill('Rahul')

    const result = page.getByRole('button', { name: /Rahul Sharma/i })
    await expect(result).toBeVisible({ timeout: 10000 })
    await result.click()

    // The selected patient replaces the search box.
    await expect(page.getByLabel(/search patients/i)).toHaveCount(0)
    await expect(page.getByText(/Rahul Sharma/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /create draft claim/i })).toBeEnabled()
    await expect(page.getByRole('heading', { name: /attach invoices/i })).toBeVisible()
    await expect(
      page
        .getByRole('checkbox')
        .first()
        .or(page.getByText(/no invoices yet/i))
    ).toBeVisible({ timeout: 10000 })
  })

  test('links back to the claims list', async ({ adminPage: page }) => {
    await page.goto('/billing/insurance/new')
    await page.getByRole('link', { name: /back to insurance claims/i }).click()
    await expect(page).toHaveURL(/\/billing\/insurance/)
  })

  test('creates a draft claim and shows it in the claims list', async ({ adminPage: page }) => {
    const policy = `E2E-POL-${Date.now()}`
    const provider = 'E2E Health Insurance'

    await page.goto('/billing/insurance/new')
    await page.getByLabel(/search patients/i).fill('Rahul')
    await page.getByRole('button', { name: /Rahul Sharma/i }).click()

    await page.getByLabel(/insurance provider/i).fill(provider)
    await page.getByLabel(/policy number/i).fill(policy)
    await page.getByLabel(/claim amount/i).fill('500')

    await page.getByRole('button', { name: /create draft claim/i }).click()

    await expect(page).toHaveURL(/\/billing\/insurance$/, { timeout: 15000 })
    await expect(page.getByRole('cell', { name: provider, exact: true })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(`Policy: ${policy}`)).toBeVisible()

    // Drafts can be deleted, so remove the claim rather than leaving it behind.
    const response = await page.request.get(
      `/api/insurance-claims?limit=20&search=${encodeURIComponent(policy)}`
    )
    const payload = await response.json()
    const created = payload.claims?.find(
      (claim: { policyNumber: string }) => claim.policyNumber === policy
    )
    if (created) await page.request.delete(`/api/insurance-claims/${created.id}`)
  })
})
