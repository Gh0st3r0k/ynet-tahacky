import { test, expect } from '@playwright/test'
import { makeDemo, setPlaceTasks } from '../../src/model.js'

function fixture() {
  const event = makeDemo(),
    room = event.places[0],
    emptyRoom = event.places[1],
    server = event.places.at(-1)
  setPlaceTasks(event, room, [
    ...event.templates.room,
    { id: 'personal-room', text: 'Vlastná kontrola iba pre izbu' },
  ])
  event.progress[room.id].tasks['personal-room'] = true
  event.progress[room.id].done = true
  event.progress[room.id].note = 'Poznámka iba pre izbu'
  event.progress[room.id].flags.master = true
  setPlaceTasks(event, emptyRoom, [])
  setPlaceTasks(event, server, [
    ...event.templates.server,
    { id: 'personal-server', text: 'Vlastná kontrola iba pre serverovňu' },
  ])
  event.progress[server.id] = {
    tasks: Object.fromEntries(event.taskOverrides[server.id].map((t) => [t.id, true])),
    flags: { moved: true },
    note: 'Poznámka iba pre serverovňu',
    done: true,
  }
  return event
}
async function load(page, event = fixture()) {
  await page.goto('/')
  await page.evaluate(
    (event) =>
      localStorage.setItem('ynet-aktivity-v1', JSON.stringify({ version: 1, events: [event] })),
    event,
  )
  await page.reload()
  await page.getByRole('link', { name: 'Otvoriť aktivitu' }).click()
}
async function addSharedRules(page) {
  await page.getByRole('button', { name: 'Upraviť šablóny úloh' }).click()
  const editor = page.getByRole('dialog')
  await editor.getByLabel('Izba: úloha 1').fill('Upravená spoločná kontrola')
  await editor
    .locator('.template-panel')
    .first()
    .getByRole('button', { name: 'Pridať úlohu', exact: true })
    .click()
  await editor.getByLabel('Izba: úloha 4').fill('Nová spoločná úloha pre izby')
  await editor
    .locator('.template-panel')
    .last()
    .getByRole('button', { name: 'Pridať úlohu', exact: true })
    .click()
  await editor.getByLabel('Serverovňa: úloha 4').fill('Nová spoločná úloha pre serverovne')
  await editor.getByRole('button', { name: 'Uložiť šablóny', exact: true }).click()
}

test('pred uložením sa opýta a súhlas doplní všetky vlastné plány so zachovaním postupu', async ({
  page,
}) => {
  await load(page)
  const before = await page.evaluate(() => localStorage.getItem('ynet-aktivity-v1'))
  await addSharedRules(page)
  const decision = page.getByRole('dialog')
  await expect(decision).toHaveAccessibleName('Aktualizovať aj vlastné zoznamy?')
  await expect(decision).toContainText('Miest s vlastným zoznamom: 3')
  expect(await page.evaluate(() => localStorage.getItem('ynet-aktivity-v1'))).toBe(before)
  await decision.getByRole('button', { name: 'Späť k úpravám' }).click()
  await expect(page.getByLabel('Izba: úloha 4')).toHaveValue('Nová spoločná úloha pre izby')
  await page.getByRole('button', { name: 'Uložiť šablóny', exact: true }).click()
  await decision.getByRole('button', { name: 'Áno, doplniť aj vlastné zoznamy' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.locator('.place-row').first().click()
  await expect(
    page.getByRole('checkbox', { name: 'Vlastná kontrola iba pre izbu' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('checkbox', { name: 'Upravená spoločná kontrola' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(
    page.getByRole('checkbox', { name: 'Nová spoločná úloha pre izby' }),
  ).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.task-item')).toHaveCount(5)
  await expect(page.getByLabel('Poznámka')).toHaveValue('Poznámka iba pre izbu')
  await expect(page.getByLabel('Otvorené generálnym kľúčom')).toBeChecked()
  await expect(page.locator('.page-heading > .tag')).toHaveText('Rozpracované')
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.locator('.place-row').nth(1).click()
  await expect(page.locator('.task-item')).toHaveCount(4)
  await expect(page.getByRole('checkbox', { name: 'Nová spoločná úloha pre izby' })).toBeVisible()
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.locator('.place-row').last().click()
  await expect(page.locator('.task-item')).toHaveCount(5)
  await expect(
    page.getByRole('checkbox', { name: 'Vlastná kontrola iba pre serverovňu' }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(
    page.getByRole('checkbox', { name: 'Nová spoločná úloha pre serverovne' }),
  ).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Nová spoločná úloha pre izby' })).toHaveCount(0)
  await expect(page.getByLabel('Poznámka')).toHaveValue('Poznámka iba pre serverovňu')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('zatvorenie otázky nič neuloží a nezmenená šablóna sa nepýta znovu', async ({ page }) => {
  await load(page)
  const before = await page.evaluate(() => localStorage.getItem('ynet-aktivity-v1'))
  await addSharedRules(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('ynet-aktivity-v1'))).toBe(before)
  await page.getByRole('button', { name: 'Upraviť šablóny úloh' }).click()
  await expect(page.getByLabel('Izba: úloha 1')).toHaveValue('Skontrolovať sieťovú zásuvku')
  await page.getByRole('button', { name: 'Uložiť šablóny', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('prekročenie limitu nesmie poškodiť vlastné zoznamy a možno uložiť iba šablónu', async ({
  page,
}) => {
  const event = fixture()
  setPlaceTasks(
    event,
    event.places[0],
    Array.from({ length: 50 }, (_, i) => ({ id: `task-${i}`, text: `Lokálna úloha ${i + 1}` })),
  )
  await load(page, event)
  await addSharedRules(page)
  const decision = page.getByRole('dialog')
  await expect(decision.getByRole('alert')).toContainText('limit 50 úloh')
  await expect(
    decision.getByRole('button', { name: 'Áno, doplniť aj vlastné zoznamy' }),
  ).toBeDisabled()
  await decision.getByRole('button', { name: 'Nie, iba spoločnú šablónu' }).click()
  await page.reload()
  await page.locator('.place-row').first().click()
  await expect(page.locator('.task-item')).toHaveCount(50)
  await expect(page.getByRole('checkbox', { name: 'Nová spoločná úloha pre izby' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Prehľad aktivity' }).click()
  await page.locator('.place-row').nth(2).click()
  await expect(page.getByRole('checkbox', { name: 'Nová spoločná úloha pre izby' })).toBeVisible()
})
