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
