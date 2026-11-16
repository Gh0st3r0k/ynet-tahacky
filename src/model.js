export const STORAGE_KEY = 'ynet-aktivity-v1'
export const ROOM_SUFFIXES = ['1/1', '1/2', '2/1', '2/2', '4/1', '4/2', '5/1', '5/2']
export const FLOORS = [1, 2, 3, 4, 5, 6, 7, 8]
export const DORMS = [
  {
    id: 'mladost',
    name: 'ŠD Mladosť',
    short: 'Mladosť',
    address: 'Staré grunty · Bratislava',
    blocks: 'ABCD'.split('').flatMap((letter) => [1, 2, 3, 4].map((n) => `${letter}${n}`)),
  },
  {
    id: 'hronec',
    name: 'Jura Hronca',
    short: 'Jura Hronca',
    address: 'Bernolákova · Bratislava',
    blocks: ['Hlavná budova'],
  },
  {
    id: 'nikos',
    name: 'Nikosa Belojanisa',
    short: 'N. Belojanisa',
    address: 'Wilsonova · Bratislava',
    blocks: ['Hlavná budova'],
  },
  {
    id: 'dobrovicka',
    name: 'Dobrovička',
    short: 'Dobrovička',
    address: 'Dobrovičova · Bratislava',
    blocks: ['Hlavná budova'],
  },
  {
    id: 'garda',
    name: 'Mladá Garda',
    short: 'Mladá Garda',
    address: 'Račianska · Bratislava',
    blocks: ['Hlavná budova'],
  },
]
export const uid = () => crypto.randomUUID()
export const dormName = (id) => DORMS.find((d) => d.id === id)?.name || id
export const placeId = (dorm, block, floor, room = '') => JSON.stringify([dorm, block, floor, room])
export function blockPlaces(dorm, block) {
  return [
    ...FLOORS.flatMap((floor) =>
      ROOM_SUFFIXES.map((suffix) => ({
        id: placeId(dorm, block, floor, `${floor}${suffix}`),
        dorm,
        block,
        floor,
        room: `${floor}${suffix}`,
        kind: 'room',
      })),
    ),
    { id: placeId(dorm, block, 'server'), dorm, block, floor: 'server', room: '', kind: 'server' },
  ]
}
export const floorName = (floor) => (floor === 'server' ? 'Serverovňa' : `${floor}. poschodie`)
export const placeName = (place) => (place.kind === 'server' ? 'Serverovňa' : `Izba ${place.room}`)
export const tasksFor = (event, place) => event.templates[place.kind]
export const progressFor = (event, place) =>
  event.progress[place.id] || { tasks: {}, flags: {}, note: '', done: false }
export const isDone = (event, place) =>
  !!progressFor(event, place).done &&
  tasksFor(event, place).every((task) => progressFor(event, place).tasks[task.id])
export const completedCount = (event) => event.places.filter((place) => isDone(event, place)).length
export const taskCount = (event) =>
  event.places.reduce((sum, place) => sum + tasksFor(event, place).length, 0)
export const completedTasks = (event) =>
  event.places.reduce(
    (sum, place) =>
      sum +
      tasksFor(event, place).filter((task) => progressFor(event, place).tasks[task.id]).length,
    0,
  )
export const isTouched = (event, place) => {
  const p = progressFor(event, place)
  return (
    p.done ||
    Object.values(p.tasks).some(Boolean) ||
    Object.values(p.flags).some(Boolean) ||
    !!p.note
  )
}
export function makeTemplates() {
  return {
    room: [
      'Skontrolovať sieťovú zásuvku',
      'Overiť internetové pripojenie',
      'Zapísať zistené nedostatky',
    ].map((text) => ({ id: uid(), text })),
    server: [
      'Skontrolovať aktívne prvky',
      'Skontrolovať kabeláž a napájanie',
      'Upratať serverovňu',
    ].map((text) => ({ id: uid(), text })),
  }
}
export function makeDemo() {
  const templates = makeTemplates()
  const places = blockPlaces('mladost', 'A1').filter((p) => p.floor === 1 || p.kind === 'server')
  const event = {
    id: uid(),
    name: 'Kontrola siete · Mladosť',
    description:
      'Pravidelná kontrola pripojenia a poriadku v serverovni. Ukážková aktivita — môžete si vyskúšať celý postup.',
    date: new Date().toLocaleDateString('sv-SE'),
    createdAt: new Date().toISOString(),
    places,
    templates,
    progress: {},
  }
  places.slice(0, 3).forEach((place) => {
    event.progress[place.id] = {
      tasks: Object.fromEntries(templates.room.map((t) => [t.id, true])),
      flags: {},
      note: '',
      done: true,
    }
  })
  return event
}
// Záloha je nedôveryhodný vstup. Rekonštruujeme iba podporované polia.
export function validateBackup(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.events) || input.events.length > 500)
    throw new Error('Nepodporovaný formát zálohy.')
  const str = (value, max) => {
    if (typeof value !== 'string' || value.length > max)
      throw new Error('Záloha obsahuje neplatný text.')
    return value
  }
  const identifiers = new Set()
  const events = input.events.map((e) => {
    if (
      !e ||
      !Array.isArray(e.places) ||
      !e.places.length ||
      e.places.length > 15000 ||
      !e.templates ||
      !e.progress ||
      typeof e.progress !== 'object'
    )
      throw new Error('Neplatná aktivita v zálohe.')
    const id = str(e.id, 100)
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id))
      throw new Error('Neplatný identifikátor aktivity.')
    if (identifiers.has(id)) throw new Error('Duplicitná aktivita v zálohe.')
    identifiers.add(id)
    const templates = {}
    for (const kind of ['room', 'server']) {
      if (!Array.isArray(e.templates[kind]) || e.templates[kind].length > 50)
        throw new Error('Neplatné šablóny úloh.')
      templates[kind] = e.templates[kind].map((t) => ({
        id: str(t.id, 100),
        text: str(t.text, 300),
      }))
      if (
        templates[kind].some(
          (t) =>
            !/^[a-zA-Z0-9_-]+$/.test(t.id) ||
            ['__proto__', 'constructor', 'prototype'].includes(t.id),
        )
      )
        throw new Error('Neplatný identifikátor úlohy.')
      if (new Set(templates[kind].map((t) => t.id)).size !== templates[kind].length)
        throw new Error('Duplicitná úloha.')
    }
    const seen = new Set()
    const places = e.places.map((p) => {
      if (
        !p ||
        !DORMS.some((d) => d.id === p.dorm) ||
        !['room', 'server'].includes(p.kind) ||
        !(FLOORS.includes(p.floor) || p.floor === 'server')
      )
        throw new Error('Neplatné miesto v zálohe.')
      const block = str(p.block, 50),
        room = str(p.room, 20)
      if (
        !block.trim() ||
        (p.kind === 'server'
          ? p.floor !== 'server' || room !== ''
          : !FLOORS.includes(p.floor) || !ROOM_SUFFIXES.some((s) => room === `${p.floor}${s}`))
      )
        throw new Error('Neplatná izba v zálohe.')
      const id = placeId(p.dorm, block, p.floor, room)
      if (seen.has(id)) throw new Error('Duplicitné miesto v zálohe.')
      seen.add(id)
      return { id, dorm: p.dorm, block, floor: p.floor, room, kind: p.kind }
    })
    const progress = {}
    for (const place of places) {
      const p = Object.hasOwn(e.progress, place.id) ? e.progress[place.id] : null
      if (!p) continue
      progress[place.id] = {
        tasks: Object.fromEntries(
          templates[place.kind].map((t) => [t.id, p.tasks?.[t.id] === true]),
        ),
        flags: { master: p.flags?.master === true, moved: p.flags?.moved === true },
        note: typeof p.note === 'string' ? str(p.note, 5000) : '',
        done: p.done === true,
      }
    }
    if (
      typeof e.date !== 'string' ||
      (e.date && (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || isNaN(Date.parse(`${e.date}T12:00:00`))))
    )
      throw new Error('Neplatný dátum aktivity.')
    return {
      id,
      name: str(e.name, 120),
      description: str(e.description, 2000),
      date: str(e.date, 10),
      createdAt: str(e.createdAt, 40),
      places,
      templates,
      progress,
    }
  })
  return { version: 1, events }
}
