import { test, expect } from '@playwright/test'

async function demo(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Najprv si pozrieť ukážku' }).click()
}
async function editPlace(page) {
  await page.getByRole('button', { name: 'Upraviť úlohy miesta', exact: true }).click()
  return page.getByRole('dialog')
}

test('vlastný zoznam izby zostane oddelený od šablóny a dá sa obnoviť', async ({ page }) => {
  await demo(page)
  await page.locator('.place-row').first().click()
  let dialog = await editPlace(page)
  await dialog.getByRole('button', { name: 'Pridať úlohu', exact: true }).click()
  await dialog.getByLabel('Miesto: úloha 4').fill('Vymeniť zásuvku iba v tejto izbe')
  await dialog.getByRole('button', { name: 'Uložiť úlohy miesta' }).click()
  await expect(
    page.getByRole('checkbox', { name: 'Vymeniť zásuvku iba v tejto izbe' }),
  ).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.place-task-tools')).toContainText('Vlastný zoznam')
  await expect(page.locator('.page-heading > .tag')).toHaveText('Rozpracované')
  await page.reload()
  await expect(
    page.getByRole('checkbox', { name: 'Skontrolovať sieťovú zásuvku' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(
    page.getByRole('checkbox', { name: 'Vymeniť zásuvku iba v tejto izbe' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.locator('.place-row').nth(1).click()
  await expect(
    page.getByRole('checkbox', { name: 'Vymeniť zásuvku iba v tejto izbe' }),
  ).toHaveCount(0)
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.getByRole('button', { name: 'Upraviť šablóny úloh' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Izba: úloha 1').fill('Nová spoločná kontrola')
  await dialog.getByRole('button', { name: 'Uložiť šablóny' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Nie, iba spoločnú šablónu' }).click()
  await page.locator('.place-row').first().click()
  await expect(page.getByRole('checkbox', { name: 'Skontrolovať sieťovú zásuvku' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Nová spoločná kontrola' })).toHaveCount(0)
  dialog = await editPlace(page)
  await dialog.getByRole('button', { name: 'Obnoviť spoločnú šablónu' }).click()
  await expect(page.locator('.place-task-tools')).toContainText('Spoločná šablóna')
  await expect(page.getByRole('checkbox', { name: 'Nová spoločná kontrola' })).toBeVisible()
  await expect(
    page.getByRole('checkbox', { name: 'Vymeniť zásuvku iba v tejto izbe' }),
  ).toHaveCount(0)
})

test('vlastné úlohy serverovne prežijú zálohu a prázdny vlastný zoznam funguje', async ({
  page,
}) => {
  await demo(page)
  await page.locator('.place-row').last().click()
  let dialog = await editPlace(page)
  for (let i = 0; i < 3; i++)
    await dialog.getByRole('button', { name: 'Odstrániť úlohu 1', exact: true }).click()
  await dialog.getByRole('button', { name: 'Uložiť úlohy miesta' }).click()
  await page.getByRole('button', { name: 'Označiť miesto ako hotové' }).click()
  await page.reload()
  await expect(page.getByRole('checkbox')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Znova otvoriť miesto' })).toBeVisible()
  dialog = await editPlace(page)
  await dialog.getByRole('button', { name: 'Pridať úlohu', exact: true }).click()
  await dialog.getByLabel('Miesto: úloha 1').fill('Vymeniť UPS iba v tejto serverovni')
  await dialog.getByRole('button', { name: 'Uložiť úlohy miesta' }).click()
  await page.getByRole('checkbox', { name: 'Vymeniť UPS iba v tejto serverovni' }).click()
  await page.getByRole('button', { name: 'Označiť miesto ako hotové' }).click()
  await page.goto('/#/data')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportovať všetky dáta' }).click()
  const file = await (await downloadPromise).path()
  await page.getByRole('button', { name: 'Vymazať všetky dáta', exact: true }).click()
  await page.getByRole('button', { name: 'Áno, vymazať všetko' }).click()
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByRole('button', { name: 'Obnoviť dáta', exact: true }).click()
  await page.goto('/#/')
  await page.getByRole('link', { name: 'Otvoriť aktivitu' }).click()
  await page.locator('.place-row').last().click()
  await expect(
    page.getByRole('checkbox', { name: 'Vymeniť UPS iba v tejto serverovni' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: 'Znova otvoriť miesto' })).toBeVisible()
})

test('vzory vyberajú /1 a /2 vo zvolenom rozsahu s pridaním a odobratím', async ({ page }) => {
  await page.goto('/#/new')
  await page.getByLabel(/Názov aktivity/).fill('Výber podľa vzoru')
  await page.getByRole('button', { name: 'Pokračovať', exact: true }).click()
  await page.locator('.server-select').click()
  await page.getByRole('button', { name: 'Použiť vzor' }).click()
  await expect(page.locator('.selection-summary')).toContainText('32 izieb')
  await expect(page.locator('.selection-summary')).toContainText('0 serverovní')
  await expect(page.getByRole('button', { name: '11/1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: '11/2', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.getByLabel('Vzor miest').selectOption('triple')
  await page.getByLabel('Spôsob výberu').selectOption('add')
  await page.getByRole('button', { name: 'Použiť vzor' }).click()
  await expect(page.locator('.selection-summary')).toContainText('64 izieb')
  await page.getByLabel('Vzor miest').selectOption('double')
  await page.getByLabel('Spôsob výberu').selectOption('remove')
  await page.getByRole('button', { name: 'Použiť vzor' }).click()
  await expect(page.locator('.selection-summary')).toContainText('32 izieb')
  await page.getByRole('button', { name: 'Upraviť miesta v bloku A2', exact: true }).click()
  await page.getByRole('button', { name: '11/1', exact: true }).click()
  await expect(page.locator('.selection-summary')).toContainText('33 izieb')
  await page.getByLabel('Vzor miest').selectOption('even')
  await page.getByLabel('Spôsob výberu').selectOption('replace')
  await page.getByRole('button', { name: 'Použiť vzor' }).click()
  await expect(page.locator('.selection-summary')).toContainText('64 izieb')
  await page.getByLabel('Rozsah výberu').selectOption('dorm')
  await page.getByLabel('Vzor miest').selectOption('triple')
  await page.getByRole('button', { name: 'Použiť vzor' }).click()
  await expect(page.locator('.selection-summary')).toContainText('512 izieb')
  await page.getByLabel('Vzor miest').selectOption('server')
  await page.getByLabel('Spôsob výberu').selectOption('add')
  await page.getByRole('button', { name: 'Použiť vzor' }).click()
  await expect(page.locator('.selection-summary')).toContainText('16 serverovní')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('filtre kombinujú vzor izieb, rozpracovanie a vyhľadávanie', async ({ page }) => {
  await demo(page)
  await page.locator('.place-row').nth(3).click()
  await expect(page.locator('.page-heading > .tag')).toHaveText('Čaká')
  await page.getByRole('checkbox', { name: 'Skontrolovať sieťovú zásuvku' }).click()
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.locator('.place-row').nth(4).click()
  await page.getByLabel('Otvorené generálnym kľúčom').check()
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.locator('.place-row').nth(7).click()
  await page.getByLabel('Poznámka').fill('Treba sa sem vrátiť.')
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.getByLabel('Stav miesta').selectOption('started')
  await expect(page.locator('.place-row')).toHaveCount(3)
  await expect(page.locator('.place-row .row-status').first()).toHaveText('Rozpracované')
  await page.getByLabel('Typ miesta').selectOption('triple')
  await expect(page.locator('.place-row')).toHaveCount(2)
  await page.getByLabel('Hľadať miesto').fill('12/2')
  await expect(page.locator('.place-row')).toHaveCount(1)
  await expect(page.locator('.place-row')).toContainText('Izba 12/2')
  await page.getByRole('button', { name: 'Zrušiť filtre' }).click()
  await page.getByLabel('Stav miesta').selectOption('waiting')
  await expect(page.locator('.place-row')).toHaveCount(3)
  await page.getByLabel('Stav miesta').selectOption('done')
  await expect(page.locator('.place-row')).toHaveCount(3)
  await page.getByLabel('Stav miesta').selectOption('all')
  await page.getByLabel('Typ miesta').selectOption('double')
  await expect(page.locator('.place-row')).toHaveCount(4)
  await page.getByLabel('Typ miesta').selectOption('even')
  await expect(page.locator('.place-row')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Žiadne miesta pre tento výber' })).toBeVisible()
  await page.getByRole('button', { name: 'Zrušiť filtre' }).click()
  await expect(page.locator('.place-row')).toHaveCount(9)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
