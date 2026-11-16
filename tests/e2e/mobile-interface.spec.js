import { test, expect } from '@playwright/test'
import { makeDemo, blockPlaces } from '../../src/model.js'

async function loadFullBlock(page) {
  const event = makeDemo()
  event.places = blockPlaces('mladost', 'A1')
  await page.goto('/')
  await page.evaluate(
    (event) =>
      localStorage.setItem('ynet-aktivity-v1', JSON.stringify({ version: 1, events: [event] })),
    event,
  )
  await page.reload()
  await page.getByRole('link', { name: 'Otvoriť aktivitu' }).click()
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
}

test('všetkých osem poschodí a serverovňa sú dostupné bez posúvania dialógu', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await loadFullBlock(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveAccessibleName('Vyberte poschodie')
  await expect(dialog.locator('.picker-option')).toHaveCount(9)
  await expect(dialog.getByRole('textbox')).toHaveCount(0)
  expect(await dialog.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
  const positions = await dialog.locator('.picker-option').evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom }
    }),
  )
  expect(positions.every((p) => p.top >= 0 && p.bottom <= 568)).toBe(true)
  await dialog.getByRole('button', { name: /8\. poschodie/ }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Izba 85\/2/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Izba 85/2', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Späť na výber izby' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Serverovňa/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Serverovňa', exact: true })).toBeVisible()
})

test('pri vytváraní aktivity sú naraz zobrazené všetky izby celého bloku', async ({ page }) => {
  await page.goto('/#/new')
  await page.getByLabel(/Názov aktivity/).fill('Mobilný výber')
  await page.getByRole('button', { name: 'Pokračovať', exact: true }).click()
  await expect(page.locator('.floor-row:visible')).toHaveCount(8)
  await expect(page.locator('.room-chip:visible')).toHaveCount(64)
  await expect(page.locator('.server-select')).toBeVisible()
  await page.getByRole('button', { name: '85/2', exact: true }).click()
  await page.getByRole('button', { name: '11/1', exact: true }).click()
  await expect(page.getByRole('button', { name: '85/2', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.selection-summary')).toContainText('2 izieb')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('svetlá téma používa dodaný SVG súbor a teplú paletu portálu', async ({ page }) => {
  const external = []
  page.on('request', (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(request.url())
  })
  await page.goto('/')
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('.theme-toggle')).toBeEnabled()
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(245, 242, 238)')
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', 'rgb(245, 242, 238)')
  await expect(page.locator('.stat-card').first()).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  )
  const logo = page.getByRole('img', { name: 'Ynet Portal', exact: true })
  await expect(logo.locator('svg')).toHaveAttribute('viewBox', '0 0 1262.3 320')
  await expect(logo.locator('.st0').first()).toHaveCSS('fill', 'rgb(255, 128, 8)')
  expect(external).toEqual([])
})

test('zmena témy odhalí kruh od stlačenej ikony až po okraje obrazovky', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.__themeReveals = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function (frames, options) {
      if (options?.pseudoElement === '::view-transition-new(root)')
        window.__themeReveals.push({ frames, options })
      return animate.call(this, frames, options)
    }
  })
  const button = page.locator('.theme-toggle')
  const bounds = await button.boundingBox()
  await button.click()
  await expect.poll(() => page.evaluate(() => window.__themeReveals.length)).toBe(1)
  const reveal = await page.evaluate(() => window.__themeReveals[0])
  const [start, end] = reveal.frames.clipPath
  const match = start.match(/^circle\(0px at ([\d.]+)px ([\d.]+)px\)$/)
  expect(match).not.toBeNull()
  const x = Number(match[1]),
    y = Number(match[2])
  expect(Math.abs(x - (bounds.x + bounds.width / 2))).toBeLessThan(1)
  expect(Math.abs(y - (bounds.y + bounds.height / 2))).toBeLessThan(1)
  const radius = Number(end.match(/^circle\(([\d.]+)px/)[1])
  const viewport = page.viewportSize()
  expect(radius).toBeGreaterThanOrEqual(
    Math.hypot(Math.max(x, viewport.width - x), Math.max(y, viewport.height - y)),
  )
  await expect(button).toBeEnabled()
  await button.click()
  await expect.poll(() => page.evaluate(() => window.__themeReveals.length)).toBe(2)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('obmedzený pohyb a prehliadač bez View Transitions prepínajú tému okamžite', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('.theme-toggle')).toBeEnabled()
  await page.evaluate(() => {
    document.startViewTransition = undefined
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.theme-toggle')).toBeEnabled()
})
