import { test, expect } from '@playwright/test'

test('tmavá téma je predvolená a prepnutie zachová aktivity aj uloženú voľbu', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(9, 9, 11)')
  await expect(page.locator('.stat-card').first()).toHaveCSS('background-color', 'rgb(20, 20, 22)')
  await page.getByRole('button', { name: 'Najprv si pozrieť ukážku' }).click()
  const before = await page.evaluate(() => localStorage.getItem('ynet-aktivity-v1'))
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('.theme-toggle')).toHaveAccessibleName('Zapnúť tmavú tému')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('.event-progress')).toContainText('3 / 9 miest')
  expect(await page.evaluate(() => localStorage.getItem('ynet-aktivity-v1'))).toBe(before)
  await page.locator('.theme-toggle').click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => localStorage.getItem('ynet-theme'))).toBe('dark')
})

test('dialógy a poznámky používajú tmavé plochy a téma sa zosúladí medzi kartami', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Najprv si pozrieť ukážku' }).click()
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(20, 20, 22)')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /1\. poschodie/ })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Izba 11\/1/ })
    .click()
  await expect(page.getByLabel('Poznámka')).toHaveCSS('background-color', 'rgb(17, 17, 19)')
  await page.getByLabel('Poznámka').fill('Poznámka zostáva aj pri zmene témy.')
  const other = await context.newPage()
  await other.goto('/')
  await other.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Poznámka')).toHaveValue('Poznámka zostáva aj pri zmene témy.')
  await other.close()
})

test('uložená svetlá téma sa načíta aj pred spustením Vue', async ({ page }) => {
  await page.goto('/')
  await page.locator('.theme-toggle').click()
  await page.route('**/src/main.js', (route) => route.abort())
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(247, 248, 245)')
})
