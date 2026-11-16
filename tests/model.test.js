import { test } from 'node:test'
import assert from 'node:assert/strict'
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
