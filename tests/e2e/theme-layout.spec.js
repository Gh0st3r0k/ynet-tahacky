import { test, expect } from '@playwright/test'

const common = [
  'main',
  '.sidebar',
  '.brand',
  '.brand-logo',
  '.topbar',
  '.page-heading',
  '.page-heading h1',
  '.page-heading p',
  '.page-heading .button',
  '.page-footer',
]
async function layout(page, selectors) {
  await page.evaluate(async () => {
    await document.fonts.ready
    window.scrollTo(0, 0)
  })
  return page.evaluate((selectors) => {
    const geometry = [
      'display',
      'position',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'lineHeight',
      'letterSpacing',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderRadius',
      'gap',
      'gridTemplateColumns',
      'alignItems',
      'justifyContent',
    ]
    return {
      height: document.documentElement.scrollHeight,
      elements: Object.fromEntries(
        selectors.map((selector) => [
          selector,
          [...document.querySelectorAll(selector)]
            .filter((el) => el.getClientRects().length)
            .map((el) => {
              const rect = el.getBoundingClientRect(),
                style = getComputedStyle(el)
              return {
                rect: [rect.x, rect.y, rect.width, rect.height].map((n) => Number(n.toFixed(2))),
                styles: Object.fromEntries(geometry.map((key) => [key, style[key]])),
              }
            }),
        ]),
      ),
    }
  }, selectors)
}
async function sameLayoutInBothThemes(page, selectors) {
  const before = await layout(page, [...common, ...selectors])
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await layout(page, [...common, ...selectors])).toEqual(before)
  await page.locator('.theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await layout(page, [...common, ...selectors])).toEqual(before)
}

test('prepnutie palety nemení rozloženie prehľadu, aktivity, izby ani správy dát', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await sameLayoutInBothThemes(page, [
    '.stats-grid',
    '.stat-card',
    '.stat-icon',
    '.filter-tabs',
    '.search-input',
    '.welcome-card',
    '.welcome-copy h2',
    '.welcome-copy p',
    '.welcome-art',
    '.how-grid',
    '.how-card',
  ])
  await page.getByRole('button', { name: 'Najprv si pozrieť ukážku' }).click()
  await sameLayoutInBothThemes(page, [
    '.event-overview',
    '.progress-ring',
    '.event-actions',
    '.places-panel',
    '.place-row',
    '.place-filters',
    '.place-filters select',
  ])
  await page.locator('.place-row').first().click()
  await sameLayoutInBothThemes(page, [
    '.room-title',
    '.room-work-grid',
    '.task-panel',
    '.task-item',
    '.flags-panel',
    '.notes-panel',
    '.notes-panel textarea',
    '.back-to-picker',
  ])
  await page.goto('/#/data')
  await sameLayoutInBothThemes(page, ['.data-intro', '.data-grid', '.data-card', '.danger-zone'])
})

test('formuláre, výber miest a dialóg majú v oboch témach rovnaké rozmery', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/new')
  await page.getByLabel(/Názov aktivity/).fill('Rovnaký dizajn')
  await sameLayoutInBothThemes(page, [
    '.wizard-steps',
    '.basic-form',
    '.field',
    '.field input',
    '.field textarea',
    '.info-strip',
    '.wizard-footer',
  ])
  await page.getByRole('button', { name: 'Pokračovať', exact: true }).click()
  await page.getByRole('button', { name: 'Vybrať celý blok A1', exact: true }).click()
  await sameLayoutInBothThemes(page, [
    '.dorm-options',
    '.dorm-option',
    '.block-grid',
    '.block-cell',
    '.pattern-panel',
    '.pattern-controls',
    '.floor-tabs',
    '.floor-tabs button',
    '.floor-editor',
    '.room-chip',
    '.server-select',
    '.selection-summary',
    '.wizard-footer',
  ])
  await page.getByRole('button', { name: 'Pokračovať', exact: true }).click()
  await sameLayoutInBothThemes(page, [
    '.template-grid',
    '.template-panel',
    '.template-heading',
    '.template-input',
    '.creation-review',
    '.wizard-footer',
  ])
  await page.getByRole('button', { name: 'Vytvoriť aktivitu', exact: true }).click()
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
  const selectors = [
    '.modal-panel',
    '.modal-header',
    '.modal-header h2',
    '.picker-content',
    '.picker-context',
    '.picker-options',
    '.picker-option',
    '.picker-option strong',
  ]
  const before = await layout(page, selectors)
  await page.getByRole('button', { name: 'Zavrieť dialóg', exact: true }).click()
  await page.locator('.theme-toggle').click()
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
  expect(await layout(page, selectors)).toEqual(before)
})
