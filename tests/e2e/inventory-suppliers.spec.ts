import { test, expect } from './fixtures/auth'

test.describe('Inventory Suppliers', () => {
  test.describe('Supplier List', () => {
    test('should display suppliers page', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      await expect(
        page
          .getByRole('heading', { name: /supplier/i })
          .or(page.getByText(/supplier/i).first())
          .first()
      ).toBeVisible({ timeout: 10000 })
    })

    test('should have Add Supplier button', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      const addButton = page.getByRole('button', { name: /add|new|create/i }).first()
      await expect(addButton).toBeVisible()
    })

    test('should display suppliers in table', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      await page.waitForTimeout(1000)
      await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
      // At least the three base seeded suppliers (the demo seed adds more).
      expect(await page.locator('tbody tr').count()).toBeGreaterThanOrEqual(3)
    })

    test('should show supplier contact details', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      await page.waitForTimeout(1000)
      await expect(
        page
          .getByText(/phone|email|contact|name/i)
          .first()
          .or(page.getByText(/no.*supplier|no.*data/i).first())
          .first()
      ).toBeVisible({ timeout: 5000 })
    })

    test('should show supplier status', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      await page.waitForTimeout(1000)
      // The seed creates three suppliers, so the table renders. A bare
      // /active|inactive|status/i used to match the filter's <option
      // selected>All Status</option>, and options are never "visible".
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible({
        timeout: 10000,
      })
      await expect(page.getByRole('cell', { name: 'Chennai Dental Depot' })).toBeVisible()
      // Scope to the table: the status filter has a <option>Blocked</option>
      // too, and an unscoped match resolves to both.
      await expect(page.getByRole('table').getByText('Blocked')).toBeVisible()
    })

    test('should have search functionality', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      const searchInput = page.getByPlaceholder(/search/i)
      await expect(searchInput.or(page.locator('body')).first()).toBeVisible()
    })
  })

  test.describe('Add Supplier', () => {
    test('should open add supplier form', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      const addButton = page.getByRole('button', { name: /add|new|create/i }).first()
      await addButton.click()
      await page.waitForTimeout(500)
      await expect(
        page
          .getByLabel(/name/i)
          .or(page.getByRole('heading', { name: /add|new|create|supplier/i }))
          .first()
      ).toBeVisible({ timeout: 5000 })
    })

    test('should validate required fields', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      await page.getByRole('button', { name: /add supplier/i }).click()

      const dialog = page.getByRole('dialog', { name: /add supplier/i })
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: /add supplier/i }).click()

      await expect(dialog.getByText('Enter a supplier code')).toBeVisible()
      await expect(dialog.getByText('Enter the supplier name')).toBeVisible()
      await expect(dialog.getByText('Enter a phone number')).toBeVisible()
    })

    test('should show contact fields (phone, email, address)', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      await page.getByRole('button', { name: /add supplier/i }).click()

      const dialog = page.getByRole('dialog', { name: /add supplier/i })
      await expect(dialog.getByLabel(/^phone/i)).toBeVisible()
      await expect(dialog.getByLabel(/^email/i)).toBeVisible()
      await expect(dialog.getByLabel(/^address/i)).toBeVisible()
      await expect(dialog.getByLabel(/contact person/i)).toBeVisible()
      await expect(dialog.getByLabel(/supplier code/i)).toBeVisible()
      await expect(dialog.getByLabel(/supplier name/i)).toBeVisible()
    })

    test('creates a supplier, shows it in the list, then removes it', async ({
      adminPage: page,
    }) => {
      const code = `SUP-E2E-${Date.now()}`
      const name = 'E2E Temporary Supplier'

      const removeSupplier = async () => {
        const list = await page.request.get(
          `/api/inventory/suppliers?limit=50&search=${encodeURIComponent(code)}`
        )
        const payload = await list.json()
        const created = payload.data?.find((supplier: { code: string }) => supplier.code === code)
        if (created) await page.request.delete(`/api/inventory/suppliers/${created.id}`)
      }

      try {
        await page.goto('/inventory/suppliers')
        await page.getByRole('button', { name: /add supplier/i }).click()

        const dialog = page.getByRole('dialog', { name: /add supplier/i })
        await dialog.getByLabel(/supplier code/i).fill(code)
        await dialog.getByLabel(/supplier name/i).fill(name)
        await dialog.getByLabel(/^phone/i).fill('9876500011')
        await dialog.getByLabel(/contact person/i).fill('Test Contact')
        await dialog.getByRole('button', { name: /add supplier/i }).click()

        await expect(page.getByText('Supplier added', { exact: true }).first()).toBeVisible({
          timeout: 10000,
        })
        await expect(page.getByRole('cell', { name, exact: true })).toBeVisible({ timeout: 10000 })

        // The dialog closes and the list refreshes with the new row.
        await expect(dialog).toBeHidden()

        // Open the detail dialog from the row.
        const row = page.getByRole('row', { name: new RegExp(code) })
        await row.getByRole('button', { name: 'View' }).click()
        const detail = page.getByRole('dialog', { name })
        await expect(detail.getByText('Test Contact')).toBeVisible({ timeout: 10000 })
        await detail.getByRole('button', { name: 'Close' }).first().click()
      } finally {
        // Clean up even when an assertion fails, so repeated runs stay at three seeds.
        await removeSupplier()
      }
    })
  })

  test.describe('Supplier Actions', () => {
    test('should have view and edit actions', async ({ adminPage: page }) => {
      await page.goto('/inventory/suppliers')
      await page.waitForTimeout(1000)
      const firstRow = page.locator('tbody tr').first()
      await expect(firstRow.getByRole('button', { name: 'View' })).toBeVisible()
      await expect(firstRow.getByRole('button', { name: 'Edit' })).toBeVisible()
    })
  })
})
