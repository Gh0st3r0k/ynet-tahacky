<script setup>
import { computed, reactive, ref } from 'vue'
import Icon from './Icon.vue'
import TaskEditor from './TaskEditor.vue'
import {
  DORMS,
  FLOORS,
  ROOM_SUFFIXES,
  blockPlaces,
  placeId,
  makeTemplates,
  uid,
  ROOM_PATTERNS,
  applySelectionPattern,
} from '../model'
const emit = defineEmits(['create', 'cancel'])
const step = ref(1)
const name = ref(''),
  description = ref(''),
  date = ref(new Date().toLocaleDateString('sv-SE'))
const error = ref('')
const templates = reactive(makeTemplates())
const dorms = reactive(DORMS.map((d) => ({ ...d, blocks: [...d.blocks] })))
const selectedDorms = ref(['mladost'])
const activeDorm = ref('mladost'),
  activeBlock = ref('A1'),
  newBlock = ref('')
const selection = reactive(new Map())
const pattern = ref('double'),
  patternScope = ref('block'),
  patternMode = ref('replace')
const patternFeedback = ref('')
const patternPlaces = computed(() => {
  if (patternScope.value === 'block') return currentPlaces.value
  if (patternScope.value === 'selected') {
    const keys = new Set(selectedPlaces.value.map((p) => JSON.stringify([p.dorm, p.block])))
    return dorms.flatMap((d) =>
      d.blocks
        .filter((b) => keys.has(JSON.stringify([d.id, b])))
        .flatMap((b) => blockPlaces(d.id, b)),
    )
  }
  const targets =
    patternScope.value === 'dorm'
      ? [currentDorm.value]
      : dorms.filter((d) => selectedDorms.value.includes(d.id))
  return targets.flatMap((d) => d.blocks.flatMap((b) => blockPlaces(d.id, b)))
})
function applyPattern() {
  if (!patternPlaces.value.length) {
    patternFeedback.value = 'Najprv označte aspoň jeden blok alebo miestnosť.'
    return
  }
  const result = applySelectionPattern(
    selectedPlaces.value,
    patternPlaces.value,
    pattern.value,
    patternMode.value,
  )
  selection.clear()
  result.forEach((p) => selection.set(p.id, p))
  patternFeedback.value = `Vzor je použitý. Vybraných miest: ${result.length}.`
  error.value = ''
}
const currentDorm = computed(() => dorms.find((d) => d.id === activeDorm.value))
const selectedPlaces = computed(() => [...selection.values()])
const roomCount = computed(() => selectedPlaces.value.filter((p) => p.kind === 'room').length)
const serverCount = computed(() => selectedPlaces.value.filter((p) => p.kind === 'server').length)
const currentPlaces = computed(() => blockPlaces(activeDorm.value, activeBlock.value))
const blockCount = computed(
  () => new Set(selectedPlaces.value.map((p) => JSON.stringify([p.dorm, p.block]))).size,
)
function setPlaces(places, checked) {
  places.forEach((p) => (checked ? selection.set(p.id, p) : selection.delete(p.id)))
  error.value = ''
}
const countBlock = (dorm, block) =>
  blockPlaces(dorm, block).filter((p) => selection.has(p.id)).length
const allDorm = (dorm) => dorm.blocks.every((b) => countBlock(dorm.id, b) === 65)
function toggleDorm(dorm) {
  if (selectedDorms.value.includes(dorm.id)) {
    selectedDorms.value = selectedDorms.value.filter((id) => id !== dorm.id)
    selectedPlaces.value.filter((p) => p.dorm === dorm.id).forEach((p) => selection.delete(p.id))
    if (activeDorm.value === dorm.id) {
      activeDorm.value = selectedDorms.value[0] || ''
      activeBlock.value = currentDorm.value?.blocks[0] || ''
    }
  } else {
    selectedDorms.value.push(dorm.id)
    activateDorm(dorm)
  }
}
function activateDorm(dorm) {
  activeDorm.value = dorm.id
  activeBlock.value = dorm.blocks[0]
  newBlock.value = ''
}
function toggleAll() {
  if (dorms.every(allDorm)) {
    selection.clear()
    return
  }
  selectedDorms.value = dorms.map((d) => d.id)
  dorms.forEach((d) => d.blocks.forEach((b) => setPlaces(blockPlaces(d.id, b), true)))
  if (!activeDorm.value) activateDorm(dorms[0])
}
function toggleDormBlocks() {
  const checked = !allDorm(currentDorm.value)
  currentDorm.value.blocks.forEach((b) => setPlaces(blockPlaces(currentDorm.value.id, b), checked))
}
function toggleBlock(dorm, block) {
  activeBlock.value = block
  setPlaces(blockPlaces(dorm, block), countBlock(dorm, block) !== 65)
}
function toggleFloor(floor) {
  const places = currentPlaces.value.filter((p) => p.floor === floor)
  setPlaces(places, !places.every((p) => selection.has(p.id)))
}
function addBlock() {
  const block = newBlock.value.trim()
  if (!block) return
  if (currentDorm.value.blocks.some((b) => b.toLocaleLowerCase() === block.toLocaleLowerCase())) {
    error.value = 'Takýto blok už existuje.'
    return
  }
  if (currentDorm.value.blocks.length >= 50) {
    error.value = 'Na internát môžete pridať najviac 50 blokov.'
    return
  }
  currentDorm.value.blocks.push(block)
  activeBlock.value = block
  newBlock.value = ''
  error.value = ''
}
function goStep(index) {
  step.value = index
  error.value = ''
}
function next() {
  error.value = ''
  if (step.value === 1 && !name.value.trim()) {
    error.value = 'Zadajte názov aktivity.'
    return
  }
  if (step.value === 2 && !selection.size) {
    error.value = 'Vyberte aspoň jednu izbu alebo serverovňu.'
    return
  }
  step.value++
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function submit() {
  if (!name.value.trim() || !selection.size) return
  emit('create', {
    id: uid(),
    name: name.value.trim(),
    description: description.value.trim(),
    date: date.value,
    createdAt: new Date().toISOString(),
    places: selectedPlaces.value,
    templates: Object.fromEntries(
      ['room', 'server'].map((k) => [
        k,
        templates[k].filter((t) => t.text.trim()).map((t) => ({ ...t, text: t.text.trim() })),
      ]),
    ),
    taskOverrides: {},
    progress: {},
  })
}
</script>
<template>
  <div class="page-heading">
    <div>
      <button class="back-link" @click="emit('cancel')">
        <Icon name="back" :size="16" /> Všetky aktivity
      </button>
      <h1>Nová aktivita<span class="heading-dot">.</span></h1>
      <p>Naplánujte prácu. Na nič nezabudnite.</p>
    </div>
    <span class="tag neutral">Krok {{ step }} z 3</span>
  </div>
  <ol class="wizard-steps">
    <li
      v-for="(label, i) in ['Základné údaje', 'Výber miest', 'Zoznam úloh']"
      :key="label"
      :class="{ active: step === i + 1, complete: step > i + 1 }"
    >
      <button :disabled="step < i + 1" @click="goStep(i + 1)">
        <span class="step-number"
          ><Icon v-if="step > i + 1" name="check" :size="16" /><template v-else>{{
            i + 1
          }}</template></span
        ><span>{{ label }}</span></button
      ><Icon v-if="i < 2" class="step-arrow" name="right" :size="18" />
    </li>
  </ol>
  <form @submit.prevent="step < 3 ? next() : submit()">
    <section v-if="step === 1" class="panel basic-form">
      <div class="section-title">
        <span class="section-number">01</span>
        <div>
          <h2>Čo ideme robiť?</h2>
          <p>Krátky názov vám pomôže aktivitu neskôr nájsť.</p>
        </div>
      </div>
      <label class="field"
        >Názov aktivity <span class="required">*</span
        ><input
          v-model="name"
          maxlength="120"
          placeholder="Napr. Kontrola siete na Mladosti"
          autofocus
          required
      /></label>
      <label class="field"
        >Dátum aktivity <span class="optional">nepovinné</span><input v-model="date" type="date"
      /></label>
      <label class="field"
        >Popis <span class="optional">nepovinné</span
        ><textarea
          v-model="description"
          rows="4"
          maxlength="2000"
          placeholder="Čo je cieľom aktivity? Na čo by tím nemal zabudnúť?"
        ></textarea>
      </label>
      <div class="info-strip">
        <Icon name="shield" :size="20" />
        <p>
          Práca sa priebežne ukladá po vytvorení aktivity. Nájdete ju v tomto prehliadači aj
          nabudúce.
        </p>
      </div>
    </section>
    <section v-if="step === 2" class="location-builder">
      <div class="panel dorm-panel">
        <div class="section-title">
          <span class="section-number">02</span>
          <div>
            <h2>Kde budeme pracovať?</h2>
            <p>Vyberte jeden alebo viac internátov.</p>
          </div>
          <button type="button" class="text-button select-global" @click="toggleAll">
            <Icon name="checks" :size="17" />
            {{ dorms.every(allDorm) ? 'Zrušiť celý výber' : 'Vybrať úplne všetko' }}
          </button>
        </div>
        <div class="dorm-options">
          <button
            v-for="dorm in dorms"
            :key="dorm.id"
            type="button"
            class="dorm-option"
            :class="{ selected: selectedDorms.includes(dorm.id) }"
            :aria-pressed="selectedDorms.includes(dorm.id)"
            @click="toggleDorm(dorm)"
          >
            <span class="checkbox-visual"
              ><Icon v-if="selectedDorms.includes(dorm.id)" name="check" :size="13" /></span
            ><Icon name="building" :size="24" /><strong>{{ dorm.name }}</strong>
          </button>
        </div>
      </div>
      <div v-if="selectedDorms.length" class="panel scope-panel">
        <div class="dorm-tabs">
          <button
            v-for="dorm in dorms.filter((d) => selectedDorms.includes(d.id))"
            :key="dorm.id"
            type="button"
            :class="{ active: activeDorm === dorm.id }"
            @click="activateDorm(dorm)"
          >
            {{ dorm.name }}
          </button>
        </div>
        <template v-if="currentDorm">
          <div class="subsection-heading">
            <div>
              <h3>
                Bloky <span class="count-badge">{{ currentDorm.blocks.length }}</span>
              </h3>
              <p>Zaškrtnite celý blok alebo upravte konkrétne miestnosti.</p>
            </div>
            <button type="button" class="text-button" @click="toggleDormBlocks">
              {{ allDorm(currentDorm) ? 'Zrušiť výber blokov' : 'Vybrať všetky bloky' }}
            </button>
          </div>
          <div class="block-grid">
            <div
              v-for="block in currentDorm.blocks"
              :key="block"
              class="block-cell"
              :class="{ chosen: countBlock(activeDorm, block), focused: activeBlock === block }"
            >
              <button
                type="button"
                class="block-check"
                :aria-label="`Vybrať celý blok ${block}`"
                :aria-pressed="countBlock(activeDorm, block) === 65"
                @click="toggleBlock(activeDorm, block)"
              >
                <span
                  class="checkbox-visual"
                  :class="{
                    partial:
                      countBlock(activeDorm, block) > 0 && countBlock(activeDorm, block) < 65,
                  }"
                  ><Icon v-if="countBlock(activeDorm, block) === 65" name="check" :size="13" /><span
                    v-else-if="countBlock(activeDorm, block)"
                    >−</span
                  ></span
                ></button
              ><button
                type="button"
                class="block-open"
                :aria-label="`Upraviť miesta v bloku ${block}`"
                @click="activeBlock = block"
              >
                <strong>{{ block }}</strong><small
                  >{{ countBlock(activeDorm, block) }}/65 miest</small
                >
              </button>
            </div>
          </div>
          <div v-if="currentDorm.id !== 'mladost'" class="custom-block">
            <input
              v-model="newBlock"
              maxlength="50"
              placeholder="Názov ďalšieho bloku"
              aria-label="Názov ďalšieho bloku"
              @keydown.enter.prevent="addBlock"
            /><button type="button" class="button secondary small-button" @click="addBlock">
              <Icon name="plus" :size="16" /> Pridať blok
            </button>
            <p>Predvolená budova je pracovný návrh. Bloky si pridajte podľa potreby.</p>
          </div>
          <section class="pattern-panel" aria-labelledby="pattern-heading">
            <div class="subsection-heading">
              <div>
                <h3 id="pattern-heading">
                  <Icon name="filter" :size="17" /> Rýchly výber podľa vzoru
                </h3>
                <p>Dvojlôžkové izby končia /1, trojlôžkové /2.</p>
              </div>
            </div>
            <div class="pattern-controls">
              <label
                >Vzor miest<select v-model="pattern" aria-label="Vzor miest">
                  <option v-for="p in ROOM_PATTERNS" :key="p.id" :value="p.id">
                    {{ p.label }}
                  </option>
                </select></label
              >
              <label
                >Rozsah výberu<select v-model="patternScope" aria-label="Rozsah výberu">
                  <option value="block">Aktuálny blok {{ activeBlock }}</option>
                  <option value="selected">Označené bloky ({{ blockCount }})</option>
                  <option value="dorm">Všetky bloky · {{ currentDorm.name }}</option>
                  <option value="dorms">Všetky zvolené internáty</option>
                </select></label
              >
              <label
                >Spôsob výberu<select v-model="patternMode" aria-label="Spôsob výberu">
                  <option value="replace">Nahradiť výber v rozsahu</option>
                  <option value="add">Pridať k výberu</option>
                  <option value="remove">Odobrať z výberu</option>
                </select></label
              >
              <button type="button" class="button secondary small-button" @click="applyPattern">
                <Icon name="checks" :size="16" /> Použiť vzor
              </button>
            </div>
            <p class="pattern-hint">
              Pri nahradení sa v zvolenom rozsahu vyberú iba miesta podľa vzoru. Výber mimo rozsahu
              zostane zachovaný.
            </p>
            <p v-if="patternFeedback" class="pattern-feedback" role="status">
              {{ patternFeedback }}
            </p>
          </section>
          <div class="floor-editor">
            <div class="subsection-heading">
              <div>
                <h3><Icon name="layers" :size="18" /> Blok {{ activeBlock }}</h3>
                <p>Číslo izby začína číslom poschodia.</p>
              </div>
              <button
                type="button"
                class="text-button"
                @click="toggleBlock(activeDorm, activeBlock)"
              >
                {{
                  countBlock(activeDorm, activeBlock) === 65
                    ? 'Zrušiť celý blok'
                    : 'Vybrať celý blok'
                }}
              </button>
            </div>
            <div class="floor-table">
              <div v-for="floor in FLOORS" :key="floor" class="floor-row">
                <button
                  type="button"
                  class="floor-toggle"
                  :aria-pressed="
                    currentPlaces.filter((p) => p.floor === floor).every((p) => selection.has(p.id))
                  "
                  @click="toggleFloor(floor)"
                >
                  <span class="checkbox-visual"
                    ><Icon
                      v-if="
                        currentPlaces
                          .filter((p) => p.floor === floor)
                          .every((p) => selection.has(p.id))
                      "
                      name="check"
                      :size="13" /></span
                  ><span>{{ floor }}. poschodie</span>
                </button>
                <div class="room-chips">
                  <button
                    v-for="suffix in ROOM_SUFFIXES"
                    :key="suffix"
                    type="button"
                    class="room-chip"
                    :class="{
                      selected: selection.has(
                        placeId(activeDorm, activeBlock, floor, `${floor}${suffix}`),
                      ),
                    }"
                    :aria-pressed="
                      selection.has(placeId(activeDorm, activeBlock, floor, `${floor}${suffix}`))
                    "
                    @click="
                      setPlaces(
                        currentPlaces.filter(
                          (p) => p.floor === floor && p.room === `${floor}${suffix}`,
                        ),
                        !selection.has(
                          placeId(activeDorm, activeBlock, floor, `${floor}${suffix}`),
                        ),
                      )
                    "
                  >
                    {{ floor }}{{ suffix }}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              class="server-select"
              :class="{ selected: selection.has(placeId(activeDorm, activeBlock, 'server')) }"
              :aria-pressed="selection.has(placeId(activeDorm, activeBlock, 'server'))"
              @click="toggleFloor('server')"
            >
              <span class="checkbox-visual"
                ><Icon
                  v-if="selection.has(placeId(activeDorm, activeBlock, 'server'))"
                  name="check"
                  :size="13" /></span
              ><Icon name="server" :size="20" /><strong>Serverovňa</strong
              ><span>Samostatný zoznam úloh</span>
            </button>
          </div>
        </template>
      </div>
      <div class="selection-summary">
        <Icon name="pin" :size="20" /><strong>{{ roomCount }} izieb</strong><span>+</span
        ><strong>{{ serverCount }} serverovní</strong
        ><span class="summary-separator">v {{ blockCount }} blokoch</span
        ><button v-if="selection.size" type="button" class="text-button" @click="selection.clear()">
          Zrušiť výber
        </button>
      </div>
    </section>
    <section v-if="step === 3">
      <div class="section-title standalone">
        <span class="section-number">03</span>
        <div>
          <h2>Malé kroky, hotová práca.</h2>
          <p>Pripravte spoločný zoznam pre izby a samostatný pre serverovne.</p>
        </div>
      </div>
      <TaskEditor :model-value="templates" />
      <div class="info-strip template-info">
        <Icon name="settings" />
        <p>
          Úlohy môžete upraviť aj po vytvorení aktivity. Každé miesto má vlastné zaškrtnutia,
          poznámku a dva príznaky.
        </p>
      </div>
      <div class="creation-review">
        <h3>{{ name }}</h3>
        <p>{{ selectedDorms.map((id) => dorms.find((d) => d.id === id)?.name).join(' · ') }}</p>
        <div>
          <span><Icon name="room" :size="17" /> {{ roomCount }} izieb</span
          ><span><Icon name="server" :size="17" /> {{ serverCount }} serverovní</span>
        </div>
      </div>
    </section>
    <p v-if="error" class="form-error" role="alert"><Icon name="alert" :size="18" /> {{ error }}</p>
    <div class="wizard-footer">
      <button type="button" class="button secondary" @click="step > 1 ? step-- : emit('cancel')">
        <Icon name="back" :size="17" /> {{ step > 1 ? 'Späť' : 'Zrušiť' }}</button
      ><span v-if="step === 2" class="small muted">{{ selection.size }} vybraných miest</span
      ><button type="submit" class="button primary">
        {{ step < 3 ? 'Pokračovať' : 'Vytvoriť aktivitu'
        }}<Icon :name="step < 3 ? 'next' : 'check'" :size="18" />
      </button>
    </div>
  </form>
</template>
