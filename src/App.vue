<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import Icon from './components/Icon.vue'
import BuildingArt from './components/BuildingArt.vue'
import CreateActivity from './components/CreateActivity.vue'
import TaskEditor from './components/TaskEditor.vue'
import Modal from './components/Modal.vue'
import RoomPicker from './components/RoomPicker.vue'
import {
  STORAGE_KEY,
  DORMS,
  dormName,
  floorName,
  placeName,
  tasksFor,
  progressFor,
  isDone,
  completedCount,
  completedTasks,
  taskCount,
  isTouched,
  makeDemo,
  validateBackup,
} from './model'

const data = ref({ version: 1, events: [] })
const storageError = ref(''),
  storageLocked = ref(false),
  corruptRaw = ref('')
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) data.value = validateBackup(JSON.parse(raw))
} catch {
  storageLocked.value = true
  try {
    corruptRaw.value = localStorage.getItem(STORAGE_KEY) || ''
  } catch {}
  storageError.value =
    'Uložené údaje sa nepodarilo načítať. Pôvodné dáta neprepisujeme. V Správe dát si stiahnite pôvodný súbor alebo obnovte zálohu.'
}
watch(
  data,
  (value) => {
    if (storageLocked.value) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      storageError.value = ''
    } catch {
      storageError.value =
        'Zmeny sa nepodarilo uložiť do prehliadača. Stiahnite si zálohu v Správe dát, aby ste neprišli o prácu.'
    }
  },
  { deep: true, flush: 'sync' },
)
const route = ref(location.hash.slice(1) || '/')
const mobileNav = ref(false),
  search = ref(''),
  statusFilter = ref('all')
const placeSearch = ref(''),
  kindFilter = ref('all'),
  placeStatus = ref('all'),
  visibleCount = ref(40)
const picker = ref(false),
  editingTemplates = ref(false),
  draftTemplates = ref(null)
const deleteTarget = ref(null),
  resetConfirm = ref(false),
  importPreview = ref(null),
  importError = ref('')
const hasModal = computed(
  () =>
    picker.value ||
    editingTemplates.value ||
    deleteTarget.value ||
    resetConfirm.value ||
    importPreview.value,
)
const toast = ref(''),
  toastTimer = ref(null),
  backupInput = ref(null)
const parts = computed(() => route.value.split('/').filter(Boolean))
const page = computed(() => parts.value[0] || 'dashboard')
const event = computed(() => data.value.events.find((e) => e.id === parts.value[1]))
const place = computed(() =>
  event.value?.places.find((p) => p.id === safelyDecode(parts.value[3] || '')),
)
const isRoomPage = computed(
  () => page.value === 'activity' && parts.value[2] === 'room' && place.value,
)
const currentProgress = computed(() => {
  if (!place.value) return null
  return (event.value.progress[place.value.id] ||= { tasks: {}, flags: {}, note: '', done: false })
})
const currentTasks = computed(() => (place.value ? tasksFor(event.value, place.value) : []))
const allTasksDone = computed(() =>
  currentTasks.value.every((t) => currentProgress.value?.tasks[t.id]),
)
const selectedTaskCount = computed(
  () => currentTasks.value.filter((t) => currentProgress.value?.tasks[t.id]).length,
)
const filteredEvents = computed(() =>
  data.value.events
    .filter((e) =>
      `${e.name} ${e.description} ${[...new Set(e.places.map((p) => dormName(p.dorm)))].join(' ')}`
        .toLocaleLowerCase('sk')
        .includes(search.value.toLocaleLowerCase('sk')),
    )
    .filter(
      (e) =>
        statusFilter.value === 'all' ||
        (statusFilter.value === 'done'
          ? completedCount(e) === e.places.length
          : completedCount(e) < e.places.length),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
)
const activeEvents = computed(
  () => data.value.events.filter((e) => completedCount(e) < e.places.length).length,
)
const allPlacesDone = computed(() =>
  data.value.events.reduce((sum, e) => sum + completedCount(e), 0),
)
const remainingTasks = computed(() =>
  data.value.events.reduce((sum, e) => sum + taskCount(e) - completedTasks(e), 0),
)
const filteredPlaces = computed(() =>
  (event.value?.places || [])
    .filter((p) => kindFilter.value === 'all' || p.kind === kindFilter.value)
    .filter(
      (p) =>
        placeStatus.value === 'all' ||
        (placeStatus.value === 'done' ? isDone(event.value, p) : !isDone(event.value, p)),
    )
    .filter((p) =>
      `${dormName(p.dorm)} ${p.block} ${floorName(p.floor)} ${placeName(p)}`
        .toLocaleLowerCase('sk')
        .includes(placeSearch.value.toLocaleLowerCase('sk')),
    ),
)
const eventPercent = computed(() =>
  event.value ? Math.round((completedCount(event.value) / event.value.places.length) * 100) : 0,
)
const dateLabel = (date) =>
  date
    ? new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(`${date}T12:00:00`),
      )
    : 'Bez dátumu'
const isValidDate = (date) =>
  !date || (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(`${date}T12:00:00`)))
function resetFilters() {
  search.value = ''
  statusFilter.value = 'all'
}
function focusMain() {
  document.getElementById('main-content')?.focus()
}
function safelyDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}
function onHashChange() {
  route.value = location.hash.slice(1) || '/'
  mobileNav.value = false
  picker.value = false
  placeSearch.value = ''
  visibleCount.value = 40
  window.scrollTo(0, 0)
}
function navigate(path) {
  location.hash = path
  mobileNav.value = false
}
function notify(message) {
  toast.value = message
  clearTimeout(toastTimer.value)
  toastTimer.value = setTimeout(() => (toast.value = ''), 4500)
}
function addActivity(value) {
  data.value.events.push(value)
  navigate(`/activity/${value.id}`)
  notify('Aktivita je vytvorená. Môžeme začať!')
}
function demo() {
  const value = makeDemo()
  addActivity(value)
}
function choosePlace(value) {
  picker.value = false
  navigate(`/activity/${event.value.id}/room/${encodeURIComponent(value.id)}`)
}
function openPicker() {
  picker.value = true
}
function toggleTask(id) {
  currentProgress.value.tasks[id] = !currentProgress.value.tasks[id]
  if (!currentProgress.value.tasks[id]) currentProgress.value.done = false
}
function toggleAllTasks() {
  const checked = !allTasksDone.value
  currentTasks.value.forEach((t) => (currentProgress.value.tasks[t.id] = checked))
  if (!checked) currentProgress.value.done = false
}
function completePlace() {
  if (!allTasksDone.value) return
  currentProgress.value.done = !currentProgress.value.done
  notify(
    currentProgress.value.done ? 'Miesto je označené ako hotové.' : 'Miesto je opäť rozpracované.',
  )
}
function startTemplateEdit() {
  draftTemplates.value = structuredClone(JSON.parse(JSON.stringify(event.value.templates)))
  editingTemplates.value = true
}
function saveTemplates() {
  event.value.templates = Object.fromEntries(
    ['room', 'server'].map((kind) => [
      kind,
      draftTemplates.value[kind]
        .filter((t) => t.text.trim())
        .map((t) => ({ ...t, text: t.text.trim() })),
    ]),
  )
  event.value.places.forEach((p) => {
    if (event.value.progress[p.id]?.done && !isDone(event.value, p))
      event.value.progress[p.id].done = false
  })
  editingTemplates.value = false
  notify('Šablóny úloh boli aktualizované.')
}
function removeEvent() {
  data.value.events = data.value.events.filter((e) => e.id !== deleteTarget.value.id)
  deleteTarget.value = null
  navigate('/')
  notify('Aktivita bola odstránená.')
}
function download(content, filename, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function exportData() {
  download(
    JSON.stringify(data.value, null, 2),
    `ynet-zaloha-${new Date().toLocaleDateString('sv-SE')}.json`,
  )
  notify('Záloha bola pripravená na stiahnutie.')
}
async function loadImport(e) {
  importError.value = ''
  const file = e.target.files?.[0]
  if (!file) return
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('Súbor je príliš veľký. Maximum je 20 MB.')
    const result = validateBackup(JSON.parse(await file.text()))
    if (result.events.some((e) => !isValidDate(e.date)))
      throw new Error('Záloha obsahuje neplatný dátum.')
    importPreview.value = result
  } catch (error) {
    importError.value =
      error instanceof SyntaxError ? 'Súbor nie je platná JSON záloha.' : error.message
  }
  e.target.value = ''
}
function confirmImport() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(importPreview.value))
  } catch {
    importError.value =
      'Zálohu sa nepodarilo uložiť. Uvoľnite miesto v prehliadači a skúste to znova.'
    importPreview.value = null
    return
  }
  storageLocked.value = false
  storageError.value = ''
  data.value = importPreview.value
  importPreview.value = null
  notify('Záloha bola obnovená.')
}
function resetData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    notify('Dáta sa nepodarilo vymazať. Skontrolujte povolenia prehliadača.')
    return
  }
  storageLocked.value = false
  storageError.value = ''
  data.value = { version: 1, events: [] }
  resetConfirm.value = false
  notify('Všetky miestne dáta boli vymazané.')
}
function onStorage(e) {
  if (e.key === STORAGE_KEY) {
    storageLocked.value = true
    storageError.value =
      'Údaje sa zmenili v inej karte. Obnovte túto stránku pred ďalšími úpravami. Zmeny z tejto karty si môžete stiahnuť v Správe dát.'
  }
}
watch([placeSearch, kindFilter, placeStatus], () => (visibleCount.value = 40))
onMounted(() => {
  window.addEventListener('hashchange', onHashChange)
  window.addEventListener('storage', onStorage)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
  window.removeEventListener('storage', onStorage)
  clearTimeout(toastTimer.value)
})
</script>

<template>
  <a href="#main-content" class="skip-link" @click.prevent="focusMain">Preskočiť na obsah</a>
  <div class="app-shell" :inert="hasModal || undefined">
    <div v-if="mobileNav" class="nav-scrim" @click="mobileNav = false"></div>
    <aside class="sidebar" :class="{ open: mobileNav }">
      <a href="#/" class="brand" aria-label="Ynet Aktivity — domov"
        ><span class="brand-mark"
          ><svg viewBox="0 0 32 32" fill="none">
            <path
              d="m6 6 10 14L26 6M16 20v9"
              stroke="currentColor"
              stroke-width="5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg></span
        ><span>ynet<span class="brand-dot">.</span><small>AKTIVITY</small></span></a
      >
      <button class="mobile-close icon-button" aria-label="Zavrieť menu" @click="mobileNav = false">
        <Icon name="close" />
      </button>
      <div class="workspace-label">PRACOVNÝ PRIESTOR</div>
      <nav aria-label="Hlavná navigácia">
        <a href="#/" :class="{ active: page === 'dashboard' || page === 'activity' }"
          ><Icon name="dashboard" /><span>Aktivity</span
          ><span class="nav-count">{{ data.events.length }}</span></a
        ><a href="#/new" :class="{ active: page === 'new' }"
          ><Icon name="plus" /><span>Nová aktivita</span></a
        ><a href="#/data" :class="{ active: page === 'data' }"
          ><Icon name="data" /><span>Správa dát</span></a
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note">
          <span class="mini-signal"><Icon name="wifi" :size="23" /></span>
          <h3>Spolu to funguje.</h3>
          <p>Od prvej izby po posledný kábel. Majte svoju prácu pod kontrolou.</p>
          <span>Ynet · Študentská sieť <Icon name="arrowUp" :size="15" /></span>
        </div>
        <div class="local-state">
          <span class="status-dot" :class="{ warning: storageError }"></span
          ><span>{{ storageError ? 'Skontrolujte ukladanie' : 'Dáta v tomto prehliadači' }}</span
          ><Icon name="shield" :size="15" />
        </div>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="mobile-menu icon-button"
            aria-label="Otvoriť menu"
            :aria-expanded="mobileNav"
            @click="mobileNav = !mobileNav"
          >
            <Icon name="menu" /></button
          ><span class="topbar-app">Ynet portál</span><Icon name="right" :size="14" /><span>{{
            page === 'new' ? 'Nová aktivita' : page === 'data' ? 'Správa dát' : 'Aktivity'
          }}</span>
        </div>
        <div class="topbar-right">
          <span class="storage-status"
            ><span class="status-dot" :class="{ warning: storageError }"></span
            >{{ storageError ? 'Neuložené zmeny' : 'Ukladá sa automaticky' }}</span
          >
          <div class="avatar" title="Lokálny pracovný priestor">
            <Icon name="building" :size="18" />
          </div>
        </div>
      </header>
      <main id="main-content" tabindex="-1">
        <div v-if="storageError" class="alert-banner" role="alert">
          <Icon name="alert" />
          <p>{{ storageError }}</p>
          <a href="#/data">Správa dát <Icon name="right" :size="16" /></a>
        </div>
        <template v-if="page === 'dashboard'">
          <div class="page-heading">
            <div>
              <div class="eyebrow">DOBRÝ DEŇ, YNET TÍM <span>✳</span></div>
              <h1>Aktivity<span class="heading-dot">.</span></h1>
              <p>Všetka práca na internátoch. Na jednom mieste.</p>
            </div>
            <a href="#/new" class="button primary"><Icon name="plus" :size="19" /> Nová aktivita</a>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-icon yellow"><Icon name="layers" :size="22" /></span>
              <div>
                <span>Prebiehajúce aktivity</span
                ><strong
                  >{{ activeEvents }}<small> / {{ data.events.length }} celkom</small></strong
                >
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-icon green"><Icon name="checks" :size="22" /></span>
              <div>
                <span>Hotové miesta</span
                ><strong>{{ allPlacesDone }}<small> izieb a serverovní</small></strong>
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-icon lilac"><Icon name="tasks" :size="22" /></span>
              <div>
                <span>Zostávajúce úlohy</span
                ><strong>{{ remainingTasks }}<small> krok za krokom</small></strong>
              </div>
            </div>
          </div>
          <section class="activities-section">
            <div class="list-toolbar">
              <div class="filter-tabs" role="group" aria-label="Stav aktivít">
                <button
                  v-for="filter in [
                    { id: 'all', label: 'Všetky aktivity' },
                    { id: 'active', label: 'Prebiehajúce' },
                    { id: 'done', label: 'Dokončené' },
                  ]"
                  :key="filter.id"
                  :class="{ active: statusFilter === filter.id }"
                  :aria-pressed="statusFilter === filter.id"
                  @click="statusFilter = filter.id"
                >
                  {{ filter.label
                  }}<span v-if="filter.id === 'all'" class="count-badge">{{
                    data.events.length
                  }}</span>
                </button>
              </div>
              <label class="search-input"
                ><Icon name="search" :size="18" /><input
                  v-model="search"
                  placeholder="Hľadať aktivitu…"
                  aria-label="Hľadať aktivitu"
              /></label>
            </div>
            <div v-if="!data.events.length" class="welcome-card">
              <div class="welcome-copy">
                <span class="tag yellow-tag"
                  ><span class="status-dot"></span> PRIPRAVENÍ NA AKCIU</span
                >
                <h2>Veľké plány.<br />Malé zaškrtnutia.</h2>
                <p>
                  Vyberte internáty, pripravte úlohy a pustite sa do práce. O prehľad sa postaráme
                  my.
                </p>
                <a href="#/new" class="button dark"
                  >Vytvoriť prvú aktivitu <Icon name="next" :size="18" /></a
                ><button class="demo-link" @click="demo">
                  <Icon name="sparkles" :size="15" /> Najprv si pozrieť ukážku
                </button>
              </div>
              <div class="welcome-art">
                <BuildingArt /><span class="art-caption"
                  ><span class="status-dot"></span> Každé miesto. Každá úloha.</span
                >
              </div>
            </div>
            <div v-else-if="filteredEvents.length" class="activity-grid">
              <article v-for="activity in filteredEvents" :key="activity.id" class="activity-card">
                <div class="activity-card-top">
                  <span class="icon-box yellow"><Icon name="tasks" :size="23" /></span
                  ><span
                    class="tag"
                    :class="
                      completedCount(activity) === activity.places.length ? 'green-tag' : 'neutral'
                    "
                    ><span class="status-dot"></span
                    >{{
                      completedCount(activity) === activity.places.length ? 'Dokončená' : 'Prebieha'
                    }}</span
                  >
                </div>
                <a :href="`#/activity/${activity.id}`" class="activity-title"
                  ><h2>{{ activity.name }}</h2>
                  <Icon name="arrowUp" :size="22"
                /></a>
                <p class="activity-description">
                  {{ activity.description || 'Bez popisu. Každá hotová úloha sa počíta.' }}
                </p>
                <div class="activity-meta">
                  <span
                    ><Icon name="building" :size="15" />{{
                      [...new Set(activity.places.map((p) => dormName(p.dorm)))].join(', ')
                    }}</span
                  ><span><Icon name="calendar" :size="15" />{{ dateLabel(activity.date) }}</span>
                </div>
                <div class="progress-caption">
                  <span>Hotové miesta</span
                  ><strong
                    >{{ completedCount(activity) }}
                    <span>/ {{ activity.places.length }}</span></strong
                  >
                </div>
                <div class="progress-track">
                  <div
                    :style="{
                      width: `${(completedCount(activity) / activity.places.length) * 100}%`,
                    }"
                  ></div>
                </div>
                <footer>
                  <span
                    >{{ Math.round((completedCount(activity) / activity.places.length) * 100) }} %
                    dokončené</span
                  ><a :href="`#/activity/${activity.id}`"
                    >Otvoriť aktivitu <Icon name="next" :size="16"
                  /></a>
                </footer>
              </article>
              <a href="#/new" class="new-activity-card"
                ><span><Icon name="plus" :size="26" /></span><strong>Priestor na ďalší plán</strong>
                <p>Vytvoriť novú aktivitu</p></a
              >
            </div>
            <div v-else class="empty-state">
              <Icon name="search" :size="32" />
              <h3>Nič sa nenašlo</h3>
              <p>Skúste iný názov alebo zmeňte filter.</p>
              <button class="button secondary" @click="resetFilters">
                Zobraziť všetky aktivity
              </button>
            </div>
          </section>
          <div class="how-heading">
            <h2>Od plánu k hotovej práci</h2>
            <span>JEDNODUCHO. PREHĽADNE. SPOLU.</span>
          </div>
          <div class="how-grid">
            <div
              v-for="(item, i) in [
                {
                  icon: 'building',
                  title: 'Vyberte miesta',
                  text: 'Celý internát, jeden blok alebo len pár izieb. Výber je na vás.',
                },
                {
                  icon: 'tasks',
                  title: 'Pripravte úlohy',
                  text: 'Spoločný zoznam pre izby. Samostatný pre serverovne.',
                },
                {
                  icon: 'checks',
                  title: 'Odškrtávajte za pochodu',
                  text: 'Úlohy, príznaky aj poznámky. V mobile aj na počítači.',
                },
              ]"
              :key="item.title"
              class="how-card"
            >
              <span class="how-icon"><Icon :name="item.icon" :size="22" /></span>
              <div>
                <span class="how-number">0{{ i + 1 }}</span>
                <h3>{{ item.title }}</h3>
                <p>{{ item.text }}</p>
              </div>
            </div>
          </div>
        </template>

        <CreateActivity v-else-if="page === 'new'" @create="addActivity" @cancel="navigate('/')" />

        <template v-else-if="page === 'activity' && event && !isRoomPage && parts.length === 2">
          <div class="page-heading event-heading">
            <div>
              <a href="#/" class="back-link"><Icon name="back" :size="16" /> Všetky aktivity</a>
              <div class="event-title-line">
                <h1>{{ event.name }}</h1>
                <span class="tag" :class="eventPercent === 100 ? 'green-tag' : 'yellow-tag'">{{
                  eventPercent === 100 ? 'Dokončená' : 'Prebieha'
                }}</span>
              </div>
              <p>{{ event.description || 'Čas pustiť sa do práce. Vyberte si prvé miesto.' }}</p>
              <div class="detail-meta">
                <span><Icon name="calendar" :size="16" />{{ dateLabel(event.date) }}</span
                ><span
                  ><Icon name="building" :size="16" />{{
                    [...new Set(event.places.map((p) => dormName(p.dorm)))].join(' · ')
                  }}</span
                >
              </div>
            </div>
            <button
              class="icon-button delete-event"
              aria-label="Odstrániť aktivitu"
              @click="deleteTarget = event"
            >
              <Icon name="trash" />
            </button>
          </div>
          <section class="event-overview">
            <div class="event-progress">
              <div class="progress-ring" :style="{ '--progress': `${eventPercent}%` }">
                <span>{{ eventPercent }}<small>%</small></span>
              </div>
              <div>
                <span class="eyebrow">POSTUP AKTIVITY</span>
                <h2>
                  {{ completedCount(event) }} <span>/ {{ event.places.length }} miest</span>
                </h2>
                <p>{{ completedTasks(event) }} z {{ taskCount(event) }} úloh hotových</p>
              </div>
            </div>
            <div class="event-actions">
              <button class="button primary" @click="openPicker">
                <Icon name="room" :size="19" /> Vybrať izbu <Icon name="next" :size="18" /></button
              ><button class="text-button" @click="startTemplateEdit">
                <Icon name="settings" :size="16" /> Upraviť šablóny úloh
              </button>
            </div>
          </section>
          <section class="panel places-panel">
            <div class="subsection-heading">
              <div>
                <h2>
                  Miesta v aktivite <span class="count-badge">{{ event.places.length }}</span>
                </h2>
                <p>Vyberte izbu alebo serverovňu a pokračujte v práci.</p>
              </div>
              <span class="tag neutral"><Icon name="shield" :size="13" /> Lokálne uložené</span>
            </div>
            <div class="places-toolbar">
              <label class="search-input"
                ><Icon name="search" :size="18" /><input
                  v-model="placeSearch"
                  placeholder="Blok, izba alebo internát…"
                  aria-label="Hľadať miesto"
              /></label>
              <div class="place-filters">
                <select v-model="kindFilter" aria-label="Typ miesta">
                  <option value="all">Všetky miesta</option>
                  <option value="room">Iba izby</option>
                  <option value="server">Iba serverovne</option></select
                ><select v-model="placeStatus" aria-label="Stav miesta">
                  <option value="all">Všetky stavy</option>
                  <option value="pending">Nedokončené</option>
                  <option value="done">Hotové</option>
                </select>
              </div>
            </div>
            <div class="place-list-head">
              <span>Miesto</span><span>Úlohy</span><span>Príznaky</span><span>Stav</span
              ><span></span>
            </div>
            <div class="place-list">
              <button
                v-for="p in filteredPlaces.slice(0, visibleCount)"
                :key="p.id"
                class="place-row"
                @click="choosePlace(p)"
              >
                <span class="place-identity"
                  ><span class="icon-box" :class="{ success: isDone(event, p) }"
                    ><Icon
                      :name="isDone(event, p) ? 'check' : p.kind === 'server' ? 'server' : 'room'"
                      :size="20" /></span
                  ><span
                    ><strong>{{ placeName(p) }}</strong
                    ><small
                      >{{ dormName(p.dorm) }} · {{ p.block
                      }}<template v-if="p.kind === 'room'">
                        · {{ floorName(p.floor) }}</template
                      ></small
                    ></span
                  ></span
                ><span class="row-task-count"
                  ><Icon name="tasks" :size="15" />{{
                    tasksFor(event, p).filter((t) => progressFor(event, p).tasks[t.id]).length
                  }}/{{ tasksFor(event, p).length }}</span
                ><span class="row-flags"
                  ><Icon v-if="progressFor(event, p).flags.master" name="key" :size="17" /><Icon
                    v-if="progressFor(event, p).flags.moved"
                    name="move"
                    :size="17"
                  /><span
                    v-if="!progressFor(event, p).flags.master && !progressFor(event, p).flags.moved"
                    >—</span
                  ></span
                ><span
                  class="tag row-status"
                  :class="
                    isDone(event, p) ? 'green-tag' : isTouched(event, p) ? 'yellow-tag' : 'neutral'
                  "
                  >{{
                    isDone(event, p) ? 'Hotové' : isTouched(event, p) ? 'Rozpracované' : 'Čaká'
                  }}</span
                ><Icon name="right" :size="18" />
              </button>
            </div>
            <div v-if="!filteredPlaces.length" class="empty-state compact">
              <Icon name="search" :size="28" />
              <h3>Žiadne miesta pre tento výber</h3>
              <p>Skúste zmeniť vyhľadávanie alebo filtre.</p>
            </div>
            <footer class="list-footer">
              <span
                >{{ Math.min(visibleCount, filteredPlaces.length) }} z
                {{ filteredPlaces.length }} miest</span
              ><button
                v-if="filteredPlaces.length > visibleCount"
                class="button secondary small-button"
                @click="visibleCount += 40"
              >
                Načítať ďalšie <Icon name="down" :size="15" />
              </button>
            </footer>
          </section>
        </template>

        <template v-else-if="isRoomPage">
          <div class="room-page">
            <a :href="`#/activity/${event.id}`" class="back-link"
              ><Icon name="back" :size="16" /> Prehľad aktivity</a
            >
            <div class="room-breadcrumb">
              <span>{{ dormName(place.dorm) }}</span><Icon name="right" :size="14" /><span>{{
                place.block
              }}</span
              ><template v-if="place.kind === 'room'"
                ><Icon name="right" :size="14" /><span>{{ floorName(place.floor) }}</span></template
              >
            </div>
            <div class="page-heading">
              <div class="room-title">
                <span class="icon-box large" :class="place.kind"
                  ><Icon :name="place.kind" :size="27"
                /></span>
                <div>
                  <h1>{{ placeName(place) }}</h1>
                  <p>{{ event.name }}</p>
                </div>
              </div>
              <span class="tag" :class="isDone(event, place) ? 'green-tag' : 'yellow-tag'">{{
                isDone(event, place) ? 'Hotové' : 'Rozpracované'
              }}</span>
            </div>
            <div class="room-work-grid">
              <section class="panel task-panel">
                <div class="subsection-heading">
                  <div>
                    <h2>
                      Zoznam úloh
                      <span class="count-badge"
                        >{{ selectedTaskCount }}/{{ currentTasks.length }}</span
                      >
                    </h2>
                    <p>
                      {{
                        place.kind === 'server'
                          ? 'Úlohy pre túto serverovňu'
                          : 'Úlohy pre túto izbu'
                      }}
                    </p>
                  </div>
                  <button v-if="currentTasks.length" class="text-button" @click="toggleAllTasks">
                    {{ allTasksDone ? 'Zrušiť výber' : 'Označiť všetky' }}
                  </button>
                </div>
                <div class="task-progress progress-track">
                  <div
                    :style="{
                      width: `${currentTasks.length ? (selectedTaskCount / currentTasks.length) * 100 : 100}%`,
                    }"
                  ></div>
                </div>
                <div class="checklist">
                  <button
                    v-for="task in currentTasks"
                    :key="task.id"
                    class="task-item"
                    :class="{ checked: currentProgress.tasks[task.id] }"
                    role="checkbox"
                    :aria-checked="!!currentProgress.tasks[task.id]"
                    @click="toggleTask(task.id)"
                  >
                    <span class="task-checkbox"
                      ><Icon v-if="currentProgress.tasks[task.id]" name="check" :size="17" /></span
                    ><span>{{ task.text }}</span>
                  </button>
                  <div v-if="!currentTasks.length" class="no-tasks">
                    <Icon name="tasks" :size="28" />
                    <p>Pre toto miesto zatiaľ nie sú úlohy.</p>
                    <button class="text-button" @click="startTemplateEdit">
                      Nastaviť šablóny úloh
                    </button>
                  </div>
                </div>
                <div class="complete-area">
                  <button
                    class="button"
                    :class="isDone(event, place) ? 'secondary' : 'primary'"
                    :disabled="!allTasksDone"
                    @click="completePlace"
                  >
                    <Icon :name="isDone(event, place) ? 'reset' : 'checks'" :size="19" />
                    {{
                      isDone(event, place) ? 'Znova otvoriť miesto' : 'Označiť miesto ako hotové'
                    }}
                  </button>
                  <p>
                    {{
                      isDone(event, place)
                        ? 'Výborne. Tu máme hotovo!'
                        : allTasksDone
                          ? 'Všetky úlohy sú splnené. Môžete miesto dokončiť.'
                          : 'Najprv dokončite všetky úlohy v zozname.'
                    }}
                  </p>
                </div>
              </section>
              <aside class="room-side">
                <section class="panel flags-panel">
                  <h2>Príznaky</h2>
                  <p class="small muted">Čo sa na tomto mieste dialo?</p>
                  <label class="flag-row"
                    ><span class="flag-label"
                      ><Icon name="key" :size="19" /><span>Otvorené generálnym kľúčom</span></span
                    ><input
                      v-model="currentProgress.flags.master"
                      type="checkbox"
                      class="toggle" /></label
                  ><label class="flag-row"
                    ><span class="flag-label"
                      ><Icon name="move" :size="19" /><span>Presúvalo sa vybavenie</span></span
                    ><input v-model="currentProgress.flags.moved" type="checkbox" class="toggle"
                  /></label>
                </section>
                <section class="panel notes-panel">
                  <label for="place-note"
                    ><Icon name="note" :size="18" />
                    <h2>Poznámka</h2>
                    <span class="optional">nepovinné</span></label
                  ><textarea
                    id="place-note"
                    v-model="currentProgress.note"
                    maxlength="5000"
                    rows="5"
                    placeholder="Niečo nefunguje? Niečo treba doriešiť? Zapíšte si to sem."
                  ></textarea
                  ><span class="note-saved"
                    ><Icon name="check" :size="13" />{{
                      storageError ? 'Zatiaľ neuložené' : 'Ukladá sa automaticky'
                    }}</span
                  >
                </section>
              </aside>
            </div>
            <button class="button dark back-to-picker" @click="openPicker">
              <Icon name="back" :size="18" /> Späť na výber izby <Icon name="room" :size="18" />
            </button>
            <p class="room-save-note">
              <Icon name="shield" :size="14" />{{
                storageError
                  ? 'Skontrolujte upozornenie na ukladanie.'
                  : 'Vaše zmeny sú uložené. Pokojne pokračujte ďalej.'
              }}
            </p>
          </div>
        </template>

        <template v-else-if="page === 'data'">
          <div class="page-heading">
            <div>
              <div class="eyebrow">VÁŠ PRACOVNÝ PRIESTOR</div>
              <h1>Správa dát<span class="heading-dot">.</span></h1>
              <p>Vaša práca si zaslúži zálohu.</p>
            </div>
            <span class="tag neutral"><Icon name="shield" :size="14" /> Bez prihlásenia</span>
          </div>
          <section class="data-intro panel">
            <span class="icon-box yellow large"><Icon name="data" :size="28" /></span>
            <div>
              <h2>Všetko zostáva vo vašom prehliadači.</h2>
              <p>
                Aktivity, úlohy, príznaky a poznámky ukladáme iba na tomto zariadení. Dáta sa medzi
                zariadeniami ani členmi tímu automaticky nezdieľajú. Pred vymazaním údajov
                prehliadača si stiahnite zálohu.
              </p>
              <span class="tag neutral"
                >{{ data.events.length }} aktivít ·
                {{ data.events.reduce((s, e) => s + e.places.length, 0) }} miest</span
              >
            </div>
          </section>
          <div class="data-grid">
            <section class="panel data-card">
              <span class="icon-box green"><Icon name="download" :size="24" /></span>
              <h2>Stiahnuť zálohu</h2>
              <p>
                Jeden JSON súbor so všetkými aktivitami a rozpracovanou prácou. Uložte si ho alebo
                preneste na iné zariadenie.
              </p>
              <button class="button primary" @click="exportData">
                <Icon name="download" :size="17" /> Exportovať všetky dáta</button
              ><button
                v-if="corruptRaw"
                class="text-button"
                @click="download(corruptRaw, 'ynet-povodne-data.json')"
              >
                Stiahnuť pôvodné nečitateľné dáta
              </button>
            </section>
            <section class="panel data-card">
              <span class="icon-box lilac"><Icon name="upload" :size="24" /></span>
              <h2>Obnoviť zo zálohy</h2>
              <p>
                Vyberte JSON súbor exportovaný z tejto aplikácie. Obnova nahradí aktuálne dáta —
                najprv si ich zálohujte.
              </p>
              <input
                ref="backupInput"
                type="file"
                accept="application/json,.json"
                hidden
                @change="loadImport"
              /><button class="button secondary" @click="backupInput.click()">
                <Icon name="upload" :size="17" /> Vybrať súbor so zálohou
              </button>
              <p v-if="importError" class="form-error" role="alert">{{ importError }}</p>
            </section>
          </div>
          <section class="panel danger-zone">
            <div>
              <h3>Začať odznova</h3>
              <p>Natrvalo odstráni všetky aktivity z tohto prehliadača.</p>
            </div>
            <button class="button danger-outline" @click="resetConfirm = true">
              <Icon name="trash" :size="17" /> Vymazať všetky dáta
            </button>
          </section>
        </template>
        <section v-else class="empty-state panel not-found">
          <Icon name="search" :size="40" />
          <h1>Toto miesto sa stratilo.</h1>
          <p>Aktivita alebo miestnosť už neexistuje v tomto prehliadači.</p>
          <a href="#/" class="button primary">Späť na aktivity <Icon name="next" :size="17" /></a>
        </section>
        <footer class="page-footer">
          <span><strong>ynet.</strong> Aktivity</span
          ><span>Malé kroky. Lepšie internáty.<span class="footer-dot">✳</span></span>
        </footer>
      </main>
    </div>
  </div>
  <RoomPicker v-if="picker && event" :event="event" @choose="choosePlace" @close="picker = false" />
  <Modal
    v-if="editingTemplates && event"
    title="Šablóny úloh"
    wide
    @close="editingTemplates = false"
    ><div class="modal-body">
      <p class="muted modal-explainer">
        Zmeny sa použijú na všetky miesta v aktivite. Existujúce zaškrtnutia zostanú zachované.
        Pridaná nesplnená úloha znovu otvorí hotové miesto.
      </p>
      <TaskEditor :model-value="draftTemplates" />
      <div class="modal-actions">
        <button class="button secondary" @click="editingTemplates = false">Zrušiť</button
        ><button class="button primary" @click="saveTemplates">
          <Icon name="check" :size="17" /> Uložiť šablóny
        </button>
      </div>
    </div></Modal
  >
  <Modal v-if="deleteTarget" title="Odstrániť aktivitu?" @close="deleteTarget = null"
    ><div class="modal-body">
      <p>
        Aktivita <strong>{{ deleteTarget.name }}</strong> a všetky jej úlohy, príznaky a poznámky sa
        natrvalo odstránia.
      </p>
      <p class="muted small">Tento krok sa nedá vrátiť späť.</p>
      <div class="modal-actions">
        <button class="button secondary" @click="deleteTarget = null">Ponechať aktivitu</button
        ><button class="button danger" @click="removeEvent">Odstrániť aktivitu</button>
      </div>
    </div></Modal
  >
  <Modal v-if="resetConfirm" title="Vymazať všetky dáta?" @close="resetConfirm = false"
    ><div class="modal-body">
      <p>
        Natrvalo odstránite {{ data.events.length }} aktivít vrátane všetkých úloh a poznámok.
        Najprv si stiahnite zálohu.
      </p>
      <div class="modal-actions">
        <button class="button secondary" @click="resetConfirm = false">Zrušiť</button
        ><button class="button danger" @click="resetData">Áno, vymazať všetko</button>
      </div>
    </div></Modal
  >
  <Modal v-if="importPreview" title="Obnoviť zálohu?" @close="importPreview = null"
    ><div class="modal-body">
      <p>
        Záloha obsahuje <strong>{{ importPreview.events.length }} aktivít</strong>. Nahradí všetky
        aktuálne aktivity v tomto prehliadači.
      </p>
      <div class="modal-actions">
        <button class="button secondary" @click="importPreview = null">Zrušiť</button
        ><button class="button primary" @click="confirmImport">Obnoviť dáta</button>
      </div>
    </div></Modal
  >
  <Transition name="toast"
    ><div v-if="toast" class="toast-message" role="status">
      <Icon name="success" :size="19" />{{ toast
      }}<button class="icon-button" aria-label="Zavrieť oznámenie" @click="toast = ''">
        <Icon name="close" :size="16" />
      </button></div
  ></Transition>
</template>
