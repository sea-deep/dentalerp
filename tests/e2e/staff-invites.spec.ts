import { test, expect } from './fixtures/auth'

test.describe('Staff Invitations', () => {
  test('shows the invitations page with an invite action', async ({ adminPage: page }) => {
    await page.goto('/staff/invites')
    await expect(page.getByRole('heading', { name: /staff invitations/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /invite staff/i })).toBeVisible()
  })

  test('lists invites or an empty state', async ({ adminPage: page }) => {
    await page.goto('/staff/invites')
    await expect(
      page
        .locator('table')
        .or(page.getByText(/no invitations yet/i))
        .first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('opens the invite dialog and validates required fields', async ({ adminPage: page }) => {
    await page.goto('/staff/invites')
    await page
      .getByRole('button', { name: /invite staff/i })
      .first()
      .click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/invite a team member/i)).toBeVisible()

    const name = dialog.getByLabel(/full name/i)
    const email = dialog.getByLabel(/work email/i)
    await expect(name).toBeVisible()
    await expect(email).toBeVisible()

    // The form uses native required validation — submitting empty must not close it.
    await dialog.getByRole('button', { name: /send invitation/i }).click()
    await expect(dialog).toBeVisible()
    await expect(name).toBeFocused()
  })

  test('staff page links to invitations', async ({ adminPage: page }) => {
    await page.goto('/staff')
    await page.getByRole('link', { name: /invitations/i }).click()
    await expect(page).toHaveURL(/\/staff\/invites/)
  })
})
