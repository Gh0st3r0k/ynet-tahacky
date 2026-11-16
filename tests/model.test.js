import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computed, reactive } from 'vue'
import {
  blockPlaces,
  makeDemo,
  makeTemplates,
  isDone,
  completedCount,
  completedTasks,
  taskCount,
  validateBackup,
  placeId,
  tasksFor,
  hasTaskOverride,
  setPlaceTasks,
  placeStatusFor,
  matchesRoomPattern,
  applySelectionPattern,
  previewTemplateUpdate,
  applyTemplateUpdate,
} from '../src/model.js'

test('blok má 64 izieb, osem poschodí a samostatnú serverovňu', () => {
  const places = blockPlaces('mladost', 'A1')
  assert.equal(places.length, 65)
  assert.equal(new Set(places.map((p) => p.id)).size, 65)
  assert.equal(places.filter((p) => p.kind === 'server').length, 1)
  for (let floor = 1; floor <= 8; floor++)
    assert.equal(places.filter((p) => p.floor === floor).length, 8)
  assert.equal(places[0].room, '11/1')
  assert.equal(places[63].room, '85/2')
})

test('identifikátory rozlišujú internáty, bloky a miestnosti', () => {
  assert.notEqual(placeId('mladost', 'A1', 1, '11/1'), placeId('hronec', 'A1', 1, '11/1'))
  assert.notEqual(placeId('mladost', 'A1', 'server'), placeId('mladost', 'A2', 'server'))
})

test('postup izby a serverovne sa počíta z oddelených šablón', () => {
  const event = makeDemo()
  assert.equal(completedCount(event), 3)
  assert.equal(completedTasks(event), 9)
  assert.equal(taskCount(event), 27)
  const place = event.places[0]
  event.templates.room.push({ id: 'new-task', text: 'Nová kontrola' })
  assert.equal(isDone(event, place), false)
  assert.equal(completedCount(event), 0)
  event.progress[place.id].tasks['new-task'] = true
  assert.equal(isDone(event, place), true)
  assert.equal(event.templates.server.length, 3)
})

test('JSON záloha zachová úlohy, príznaky a poznámky', () => {
  const event = makeDemo(),
    place = event.places[0]
  event.progress[place.id].flags = { master: true, moved: true }
  event.progress[place.id].note = 'Vymenený kábel.'
  const data = validateBackup(JSON.parse(JSON.stringify({ version: 1, events: [event] })))
  assert.equal(data.events[0].progress[place.id].note, 'Vymenený kábel.')
  assert.equal(data.events[0].progress[place.id].flags.master, true)
  assert.equal(completedCount(data.events[0]), 3)
})

test('neplatné, duplicitné a nebezpečné zálohy sa odmietnu', () => {
  for (const value of [null, {}, { version: 2, events: [] }, { version: 1, events: 'zle' }])
    assert.throws(() => validateBackup(value))
  const data = () => ({ version: 1, events: [makeDemo()] })
  let value = data()
  value.events.push(value.events[0])
  assert.throws(() => validateBackup(value))
  value = data()
  value.events[0].places.push(value.events[0].places[0])
  assert.throws(() => validateBackup(value))
  value = data()
  value.events[0].places[0].room = '99/9'
  assert.throws(() => validateBackup(value))
  value = data()
  value.events[0].templates.room[0].id = '__proto__'
  assert.throws(() => validateBackup(value))
  value = data()
  value.events[0].date = 'zajtra'
  assert.throws(() => validateBackup(value))
})

test('prázdne šablóny sú podporované a nemiešajú sa medzi aktivitami', () => {
  const first = makeTemplates(),
    second = makeTemplates()
  assert.notEqual(first.room[0].id, second.room[0].id)
  const event = makeDemo()
  event.templates = { room: [], server: [] }
  assert.equal(taskCount(event), 0)
  assert.equal(isDone(event, event.places[0]), true)
  assert.doesNotThrow(() => validateBackup({ version: 1, events: [event] }))
})

test('vlastné úlohy platia len pre dané miesto a nová úloha znovu otvorí dokončené miesto', () => {
  const event = makeDemo(),
    place = event.places[0],
    other = event.places[1]
  const original = event.templates.room.map((t) => ({ ...t }))
  setPlaceTasks(event, place, [...original, { id: 'unique', text: '  Vymeniť patch kábel  ' }])
  assert.equal(hasTaskOverride(event, place), true)
  assert.equal(tasksFor(event, place).at(-1).text, 'Vymeniť patch kábel')
  assert.equal(tasksFor(event, other).length, 3)
  assert.equal(isDone(event, place), false)
  assert.equal(placeStatusFor(event, place), 'started')
  assert.equal(event.progress[place.id].tasks[original[0].id], true)
  event.templates.room.push({ id: 'shared-new', text: 'Spoločná úloha' })
  assert.equal(
    tasksFor(event, place).some((t) => t.id === 'shared-new'),
    false,
  )
  assert.equal(
    tasksFor(event, other).some((t) => t.id === 'shared-new'),
    true,
  )
  setPlaceTasks(event, place, null)
  assert.equal(hasTaskOverride(event, place), false)
  assert.deepEqual(tasksFor(event, place), event.templates.room)
  assert.equal(isDone(event, place), false)
})

test('prázdny vlastný zoznam zostane prázdny aj po obnove zálohy', () => {
  const event = makeDemo(),
    server = event.places.at(-1)
  setPlaceTasks(event, server, [])
  event.progress[server.id] = { tasks: {}, flags: {}, note: '', done: true }
  const restored = validateBackup(JSON.parse(JSON.stringify({ version: 1, events: [event] })))
    .events[0]
  assert.deepEqual(tasksFor(restored, server), [])
  assert.equal(hasTaskOverride(restored, server), true)
  assert.equal(isDone(restored, server), true)
})

test('vlastné úlohy, ich zaškrtnutia a príznaky prežijú export a import', () => {
  const event = makeDemo(),
    place = event.places[0]
  setPlaceTasks(event, place, [{ id: 'unique', text: 'Opraviť zásuvku' }])
  event.progress[place.id].tasks.unique = true
  event.progress[place.id].flags.master = true
  event.progress[place.id].done = true
  const restored = validateBackup(JSON.parse(JSON.stringify({ version: 1, events: [event] })))
    .events[0]
  assert.equal(tasksFor(restored, place)[0].text, 'Opraviť zásuvku')
  assert.equal(restored.progress[place.id].tasks.unique, true)
  assert.equal(restored.progress[place.id].flags.master, true)
  assert.equal(isDone(restored, place), true)
  const legacy = makeDemo()
  delete legacy.taskOverrides
  assert.equal(completedCount(validateBackup({ version: 1, events: [legacy] }).events[0]), 3)
})

test('neplatné vlastné úlohy v zálohe sa neobnovia', () => {
  const make = () => ({ version: 1, events: [makeDemo()] })
  for (const override of [null, [], { unknown: [] }]) {
    const data = make()
    data.events[0].taskOverrides = override
    assert.throws(() => validateBackup(data))
  }
  for (const tasks of [
    null,
    [{ id: '__proto__', text: 'Zlé' }],
    [
      { id: 'same', text: 'A' },
      { id: 'same', text: 'B' },
    ],
    Array.from({ length: 51 }, (_, i) => ({ id: `t${i}`, text: 'Úloha' })),
  ]) {
    const data = make()
    data.events[0].taskOverrides[data.events[0].places[0].id] = tasks
    assert.throws(() => validateBackup(data))
  }
})

test('stav rozlišuje čakajúce, rozpracované a hotové miesta podľa aktuálnych úloh', () => {
  const event = makeDemo(),
    place = event.places[3]
  assert.equal(placeStatusFor(event, place), 'waiting')
  event.progress[place.id] = { tasks: {}, flags: {}, note: '   ', done: false }
  assert.equal(placeStatusFor(event, place), 'waiting')
  event.progress[place.id].tasks.removed = true
  assert.equal(placeStatusFor(event, place), 'waiting')
  event.progress[place.id].flags.moved = true
  assert.equal(placeStatusFor(event, place), 'started')
  event.progress[place.id].flags.moved = false
  event.progress[place.id].note = 'Chýba kábel'
  assert.equal(placeStatusFor(event, place), 'started')
  event.progress[place.id].note = ''
  event.templates.room.forEach((t) => (event.progress[place.id].tasks[t.id] = true))
  assert.equal(placeStatusFor(event, place), 'started')
  event.progress[place.id].done = true
  assert.equal(placeStatusFor(event, place), 'done')
})

test('vzory rozlišujú /1, /2, párne a nepárne poschodia bez serverovne', () => {
  const places = blockPlaces('mladost', 'A1')
  for (const pattern of ['double', 'triple', 'odd', 'even']) {
    assert.equal(places.filter((p) => matchesRoomPattern(p, pattern)).length, 32)
    assert.equal(matchesRoomPattern(places.at(-1), pattern), false)
  }
  assert.equal(places.filter((p) => matchesRoomPattern(p, 'room')).length, 64)
  assert.equal(places.filter((p) => matchesRoomPattern(p, 'server')).length, 1)
  assert.equal(places.filter((p) => matchesRoomPattern(p, 'all')).length, 65)
  assert.ok(
    places.filter((p) => matchesRoomPattern(p, 'double')).every((p) => p.room.endsWith('/1')),
  )
  assert.ok(
    places.filter((p) => matchesRoomPattern(p, 'triple')).every((p) => p.room.endsWith('/2')),
  )
})

test('použitie vzoru zachová výber mimo rozsahu a podporuje pridávanie aj odoberanie', () => {
  const block = blockPlaces('mladost', 'A1'),
    other = blockPlaces('hronec', 'Iný blok')[0]
  let result = applySelectionPattern([...block, other], block, 'triple')
  assert.equal(result.length, 33)
  assert.ok(result.some((p) => p.id === other.id))
  assert.ok(result.filter((p) => p.id !== other.id).every((p) => p.room.endsWith('/2')))
  result = applySelectionPattern(result, block, 'double', 'add')
  assert.equal(result.length, 65)
  result = applySelectionPattern(result, block, 'triple', 'remove')
  assert.equal(result.length, 33)
  assert.ok(result.filter((p) => p.id !== other.id).every((p) => p.room.endsWith('/1')))
  assert.throws(() => applySelectionPattern([], block, 'unknown'))
})

test('vlastné úlohy sa zmenia v reaktívnom zozname okamžite aj bez obnovenia stránky', () => {
  const event = reactive(makeDemo()),
    place = event.places[0]
  const tasks = computed(() => tasksFor(event, place))
  assert.equal(tasks.value.length, 3)
  setPlaceTasks(event, place, [{ id: 'unique', text: 'Lokálna úloha' }])
  assert.equal(tasks.value.length, 1)
  assert.equal(tasks.value[0].text, 'Lokálna úloha')
  setPlaceTasks(event, place, [])
  assert.equal(tasks.value.length, 0)
  setPlaceTasks(event, place, null)
  assert.equal(tasks.value.length, 3)
})

test('náhľad šablóny nemení údaje a týka sa len vlastných zoznamov upraveného typu', () => {
  const event = makeDemo(),
    room = event.places[0],
    server = event.places.at(-1)
  setPlaceTasks(event, room, tasksFor(event, room))
  setPlaceTasks(event, server, tasksFor(event, server))
  const before = JSON.stringify(event),
    templates = structuredClone(event.templates)
  templates.room[0].text = 'Upravená spoločná kontrola'
  templates.room.push({ id: 'new-room', text: 'Nová úloha pre izbu' })
  const preview = previewTemplateUpdate(event, templates)
  assert.equal(JSON.stringify(event), before)
  assert.deepEqual(preview.changedKinds, ['room'])
  assert.equal(preview.updates.length, 1)
  assert.equal(preview.updates[0].place.id, room.id)
  assert.equal(preview.updates[0].added, 1)
  assert.equal(preview.updates[0].removed, 0)
  assert.equal(preview.overflow.length, 0)
  assert.equal(previewTemplateUpdate(event, structuredClone(event.templates)).updates.length, 0)
})

test('súhlas doplní všetky dotknuté vlastné plány bez duplicít a zachová vlastné úlohy aj postup', () => {
  const event = makeDemo(),
    room = event.places[0],
    other = event.places[1],
    server = event.places.at(-1)
  const ownTask = { id: 'personal-room', text: 'Iba pre túto izbu' }
  setPlaceTasks(event, room, [...event.templates.room, ownTask])
  event.progress[room.id].tasks[ownTask.id] = true
  event.progress[room.id].done = true
  event.progress[room.id].note = 'Zachovaná poznámka'
  event.progress[room.id].flags.master = true
  setPlaceTasks(event, other, [])
  setPlaceTasks(event, server, [
    ...event.templates.server,
    { id: 'personal-server', text: 'Iba pre serverovňu' },
  ])
  const templates = structuredClone(event.templates)
  templates.room[0].text = 'Upravená spoločná kontrola'
  templates.room.push({ id: 'new-room', text: 'Nová úloha pre izbu' })
  templates.server.push({ id: 'new-server', text: 'Nová úloha pre serverovňu' })
  applyTemplateUpdate(event, templates, true)
  assert.equal(tasksFor(event, room).length, 5)
  assert.equal(tasksFor(event, other).length, 1)
  assert.equal(tasksFor(event, server).length, 5)
  assert.equal(tasksFor(event, room)[0].text, 'Skontrolovať sieťovú zásuvku')
  assert.ok(tasksFor(event, room).some((t) => t.id === ownTask.id && t.text === ownTask.text))
  assert.ok(!tasksFor(event, server).some((t) => t.id === 'new-room'))
  assert.equal(event.progress[room.id].tasks[ownTask.id], true)
  assert.equal(event.progress[room.id].tasks[event.templates.room[0].id], true)
  assert.equal(event.progress[room.id].note, 'Zachovaná poznámka')
  assert.equal(event.progress[room.id].flags.master, true)
  assert.equal(event.progress[room.id].done, false)
  const after = JSON.stringify(event)
  applyTemplateUpdate(event, structuredClone(templates), true)
  assert.equal(JSON.stringify(event), after)
  assert.doesNotThrow(() => validateBackup({ version: 1, events: [event] }))
})

test('odmietnutie doplnenia uloží spoločné šablóny a zachová vlastné zoznamy', () => {
  const event = makeDemo(),
    room = event.places[0],
    server = event.places.at(-1)
  setPlaceTasks(event, room, event.templates.room)
  setPlaceTasks(event, server, event.templates.server)
  const before = JSON.stringify(event.taskOverrides),
    ownProgress = JSON.stringify(event.progress[room.id])
  const templates = structuredClone(event.templates)
  templates.room.push({ id: 'shared-new', text: 'Nová kontrola' })
  applyTemplateUpdate(event, templates, false)
  assert.equal(JSON.stringify(event.taskOverrides), before)
  assert.equal(JSON.stringify(event.progress[room.id]), ownProgress)
  assert.equal(tasksFor(event, event.places[1]).length, 4)
  assert.equal(isDone(event, event.places[1]), false)
})

test('súhlas odstráni z vlastného plánu iba práve odstránenú spoločnú úlohu', () => {
  const event = makeDemo(),
    room = event.places[0]
  setPlaceTasks(event, room, event.templates.room)
  const templates = structuredClone(event.templates),
    removed = templates.room.shift()
  applyTemplateUpdate(event, templates, true)
  assert.ok(!tasksFor(event, room).some((t) => t.id === removed.id))
  assert.equal(tasksFor(event, room).length, 2)
  assert.equal(tasksFor(event, event.places[1]).length, 2)
  assert.equal(isDone(event, room), true)
})

test('príliš dlhý vlastný plán sa nezmení ani čiastočne a odmietnutie môže uložiť šablónu', () => {
  const event = makeDemo(),
    room = event.places[0]
  setPlaceTasks(
    event,
    room,
    Array.from({ length: 50 }, (_, i) => ({ id: `local-${i}`, text: `Vlastná úloha ${i}` })),
  )
  const before = JSON.stringify(event),
    templates = structuredClone(event.templates)
  templates.room.push({ id: 'new-room', text: 'Nová úloha' })
  assert.equal(previewTemplateUpdate(event, templates).overflow.length, 1)
  assert.throws(() => applyTemplateUpdate(event, templates, true), /50 úloh/)
  assert.equal(JSON.stringify(event), before)
  applyTemplateUpdate(event, templates, false)
  assert.equal(tasksFor(event, room).length, 50)
  assert.equal(event.templates.room.length, 4)
})

test('aktuálne pridanie a odstránenie sa prenesú spolu bez obnovenia starších lokálnych odstránení', () => {
  const event = makeDemo(),
    room = event.places[0],
    [a, b, c] = event.templates.room
  const local = { id: 'local-only', text: c.text }
  setPlaceTasks(event, room, [{ ...b, text: 'Vlastný názov B' }, c, local])
  event.progress[room.id].tasks[local.id] = true
  event.progress[room.id].note = 'Zachovať poznámku'
  event.progress[room.id].flags.master = true
  const templates = structuredClone(event.templates)
  templates.room = [
    { ...a, text: 'Premenované A' },
    { ...b, text: 'Premenované B' },
    { id: 'new-e', text: 'Nová E' },
  ]
  const preview = previewTemplateUpdate(event, templates)
  assert.equal(preview.updates[0].added, 1)
  assert.equal(preview.updates[0].removed, 1)
  applyTemplateUpdate(event, templates, true)
  assert.deepEqual(tasksFor(event, room), [
    { ...b, text: 'Vlastný názov B' },
    local,
    { id: 'new-e', text: 'Nová E' },
  ])
  assert.equal(event.progress[room.id].tasks[b.id], true)
  assert.equal(event.progress[room.id].tasks[local.id], true)
  assert.equal(event.progress[room.id].note, 'Zachovať poznámku')
  assert.equal(event.progress[room.id].flags.master, true)
  assert.equal(isDone(event, room), false)
  const restored = validateBackup(JSON.parse(JSON.stringify({ version: 1, events: [event] })))
    .events[0]
  const later = structuredClone(restored.templates)
  later.room = later.room.filter((t) => t.id !== a.id)
  later.room.push({ id: 'new-f', text: 'Nová F' })
  applyTemplateUpdate(restored, later, true)
  assert.deepEqual(
    tasksFor(restored, room).map((t) => t.id),
    [b.id, local.id, 'new-e', 'new-f'],
  )
  assert.equal(tasksFor(restored, room)[0].text, 'Vlastný názov B')
})

test('odmietnuté staršie spoločné pridania sa pri ďalšom súhlase spätne nedopĺňajú', () => {
  const event = makeDemo(),
    room = event.places[0],
    [a] = event.templates.room
  setPlaceTasks(event, room, [a])
  const first = structuredClone(event.templates)
  first.room.push({ id: 'declined', text: 'Predtým odmietnutá úloha' })
  applyTemplateUpdate(event, first, false)
  const next = structuredClone(event.templates)
  next.room.push({ id: 'accepted', text: 'Práve pridaná úloha' })
  applyTemplateUpdate(event, next, true)
  assert.deepEqual(
    tasksFor(event, room).map((t) => t.id),
    [a.id, 'accepted'],
  )
})

test('premenovanie ani zmena poradia spoločných úloh neprepisuje vlastné úpravy', () => {
  const event = makeDemo(),
    room = event.places[0]
  setPlaceTasks(event, room, [{ ...event.templates.room[1], text: 'Miestny názov' }])
  const before = JSON.stringify(event.taskOverrides),
    templates = structuredClone(event.templates)
  templates.room.reverse()
  templates.room.forEach((t) => (t.text = `Spoločné: ${t.text}`))
  assert.equal(previewTemplateUpdate(event, templates).updates.length, 0)
  applyTemplateUpdate(event, templates, true)
  assert.equal(JSON.stringify(event.taskOverrides), before)
})

test('limit vlastných úloh sa kontroluje až po aktuálnych odstráneniach aj pridaniach', () => {
  const event = makeDemo(),
    room = event.places[0],
    removed = event.templates.room[0]
  setPlaceTasks(event, room, [
    removed,
    ...Array.from({ length: 49 }, (_, i) => ({ id: `local-${i}`, text: `Úloha ${i}` })),
  ])
  const templates = structuredClone(event.templates)
  templates.room = templates.room.filter((t) => t.id !== removed.id)
  templates.room.push({ id: 'replacement', text: 'Náhrada' })
  assert.equal(previewTemplateUpdate(event, templates).overflow.length, 0)
  applyTemplateUpdate(event, templates, true)
  assert.equal(tasksFor(event, room).length, 50)
  assert.ok(!tasksFor(event, room).some((t) => t.id === removed.id))
  assert.equal(tasksFor(event, room).at(-1).id, 'replacement')
  assert.doesNotThrow(() => validateBackup({ version: 1, events: [event] }))
})
