import { test, expect } from '@playwright/test'

async function begin(page, name = 'Kontrola pripojenia') {
  await page.goto('/#/new')
  await page.getByLabel(/Názov aktivity/).fill(name)
  await page.getByRole('button', { name: 'Pokračovať', exact: true }).click()
}
async function finish(page) {
  await page.getByRole('button', { name: 'Pokračovať', exact: true }).click()
  await page.getByRole('button', { name: 'Vytvoriť aktivitu', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Vybrať izbu', exact: true })).toBeVisible()
}
async function createSmall(page, server = true) {
  await begin(page)
  await page.getByRole('button', { name: '1. poschodie', exact: true }).click()
  if (server) await page.locator('.server-select').click()
  await finish(page)
}

test('celý postup: výber, úlohy, príznaky, poznámka a uloženie', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await createSmall(page)
  await expect(page.locator('.event-progress')).toContainText('/ 9 miest')
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Vyberte poschodie')
  await page.getByRole('button', { name: /1\. poschodie.*0 \/ 8 hotovo/ }).click()
  await page.getByRole('button', { name: /Izba 11\/1.*0 \/ 1 hotovo/ }).click()
  await expect(page.getByRole('heading', { name: 'Izba 11/1', exact: true })).toBeVisible()
  await page.screenshot({ path: `/tmp/ynet-room-${page.viewportSize().width}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Označiť všetky', exact: true }).click()
  await page.getByLabel('Otvorené generálnym kľúčom').check()
  await page.getByLabel('Presúvalo sa vybavenie').check()
  await page.getByLabel('Poznámka').fill('Kábel vymenený, pripojenie funguje.')
  await page.getByRole('button', { name: 'Označiť miesto ako hotové' }).click()
  await page.reload()
  await expect(page.getByLabel('Poznámka')).toHaveValue('Kábel vymenený, pripojenie funguje.')
  await expect(page.getByLabel('Otvorené generálnym kľúčom')).toBeChecked()
  await expect(page.getByRole('button', { name: 'Znova otvoriť miesto' })).toBeVisible()
  await page.getByRole('button', { name: 'Späť na výber izby' }).click()
  await page.getByRole('button', { name: /Serverovňa.*0 \/ 1 hotovo/ }).click()
  await expect(page.getByRole('heading', { name: 'Serverovňa', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Skontrolovať aktívne prvky' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Skontrolovať sieťovú zásuvku' })).toHaveCount(0)
  await expect(page.getByLabel('Otvorené generálnym kľúčom')).not.toBeChecked()
  await expect(page.getByLabel('Poznámka')).toHaveValue('')
  expect(errors).toEqual([])
})

test('výber všetkých blokov, zrušenie a výber celých internátov', async ({ page }) => {
  await begin(page)
  await page.getByRole('button', { name: 'Vybrať všetky bloky', exact: true }).click()
  await expect(page.locator('.selection-summary')).toContainText('1024 izieb')
  await expect(page.locator('.selection-summary')).toContainText('16 serverovní')
  await page.getByRole('button', { name: 'Zrušiť výber blokov', exact: true }).click()
  await expect(page.locator('.selection-summary')).toContainText('0 izieb')
  await page.getByRole('button', { name: 'Vybrať úplne všetko' }).click()
  await expect(page.locator('.selection-summary')).toContainText('1280 izieb')
  await expect(page.locator('.selection-summary')).toContainText('20 serverovní')
  await page.getByRole('button', { name: 'Zrušiť celý výber', exact: true }).click()
  await expect(page.locator('.selection-summary')).toContainText('0 izieb')
  await page.getByRole('button', { name: 'Pokračovať', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Vyberte aspoň jednu izbu')
})

test('jediná serverovňa preskočí všetky kroky výberu', async ({ page }) => {
  await begin(page, 'Kontrola serverovne')
  await page.locator('.server-select').click()
  await finish(page)
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Serverovňa', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('šablóny zachovajú postup a nová úloha znovu otvorí izbu', async ({ page }) => {
  await createSmall(page, false)
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Izba 11\/1/ })
    .click()
  await page.getByRole('button', { name: 'Označiť všetky', exact: true }).click()
  await page.getByRole('button', { name: 'Označiť miesto ako hotové' }).click()
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.getByRole('button', { name: 'Upraviť šablóny úloh' }).click()
  const rooms = page.getByRole('dialog').locator('.template-panel').first()
  await rooms.getByRole('button', { name: 'Pridať úlohu' }).click()
  await rooms.getByLabel('Izba: úloha 4').fill('Vymeniť poškodený kábel')
  await page.getByRole('button', { name: 'Uložiť šablóny' }).click()
  await expect(page.locator('.event-progress')).toContainText('0 / 8 miest')
  await page.locator('.place-row').first().click()
  await expect(
    page.getByRole('checkbox', { name: 'Skontrolovať sieťovú zásuvku' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('checkbox', { name: 'Vymeniť poškodený kábel' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

test('export, bezpečný import a potvrdenie odstránenia', async ({ page }) => {
  await createSmall(page)
  await page.goto('/#/data')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportovať všetky dáta' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^ynet-zaloha-/)
  const path = await download.path()
  await page.getByRole('button', { name: 'Vymazať všetky dáta', exact: true }).click()
  await page.getByRole('button', { name: 'Zrušiť', exact: true }).click()
  await expect(page.locator('.data-intro')).toContainText('1 aktivít')
  await page.getByRole('button', { name: 'Vymazať všetky dáta', exact: true }).click()
  await page.getByRole('button', { name: 'Áno, vymazať všetko' }).click()
  await expect(page.locator('.data-intro')).toContainText('0 aktivít')
  await page.locator('input[type=file]').setInputFiles(path)
  await expect(page.getByRole('dialog')).toContainText('1 aktivít')
  await page.getByRole('button', { name: 'Obnoviť dáta', exact: true }).click()
  await expect(page.locator('.data-intro')).toContainText('1 aktivít')
  await page.locator('input[type=file]').setInputFiles({
    name: 'zle.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":7}'),
  })
  await expect(page.getByRole('alert')).toContainText('Nepodporovaný formát')
  await page.goto('/#/')
  await page.getByRole('link', { name: 'Otvoriť aktivitu' }).click()
  await page.getByRole('button', { name: 'Odstrániť aktivitu', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Odstrániť aktivitu', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: /Veľké plány/ })).toBeVisible()
})

test('viac internátov, vlastný blok a návrat vo výbere', async ({ page }) => {
  await begin(page)
  await page.locator('.server-select').click()
  await page.getByRole('button', { name: 'Jura Hronca', exact: true }).click()
  await page.getByLabel('Názov ďalšieho bloku').fill('Blok J')
  await page.getByRole('button', { name: 'Pridať blok', exact: true }).click()
  await page.getByRole('button', { name: '1. poschodie', exact: true }).click()
  await finish(page)
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Vyberte internát')
  await page.getByRole('button', { name: /Jura Hronca.*0 \/ 8/ }).click()
  await expect(page.getByRole('dialog')).toContainText('Vyberte izbu')
  await page.getByRole('button', { name: 'O krok späť' }).click()
  await expect(page.getByRole('dialog')).toContainText('Vyberte internát')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('mobil a počítač bez horizontálneho posúvania a chýb', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Aktivity.', exact: true })).toBeVisible()
  await page.screenshot({
    path: `/tmp/ynet-${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Najprv si pozrieť ukážku' }).click()
  await expect(page.locator('.event-progress')).toContainText('3 / 9 miest')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `/tmp/ynet-${testInfo.project.name}-activity.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('nečitateľné uložené dáta sa neprepíšu', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('ynet-aktivity-v1', 'poškodená záloha'))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Pôvodné dáta neprepisujeme')
  expect(await page.evaluate(() => localStorage.getItem('ynet-aktivity-v1'))).toBe(
    'poškodená záloha',
  )
})

test('viac blokov ponúkne blok a jednotlivá izba preskočí ďalšie kroky', async ({ page }) => {
  await begin(page)
  await page.locator('.server-select').click()
  await page.getByRole('button', { name: 'Upraviť miesta v bloku A2', exact: true }).click()
  await page.getByRole('button', { name: '11/1', exact: true }).click()
  await finish(page)
  await page.getByRole('button', { name: 'Vybrať izbu', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Vyberte blok')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Blok A2/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Izba 11/1', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Označiť miesto ako hotové' })).toBeDisabled()
})
