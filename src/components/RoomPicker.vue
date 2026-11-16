<script setup>
import { computed, onMounted, ref } from 'vue'
import Modal from './Modal.vue'
import Icon from './Icon.vue'
import { dormName, floorName, placeName, isDone } from '../model'
const props = defineProps({ event: Object })
const emit = defineEmits(['choose', 'close'])
const stages = ['dorm', 'block', 'floor', 'room']
const stage = ref(0),
  selected = ref({}),
  history = ref([]),
  search = ref('')
const titles = ['Vyberte internát', 'Vyberte blok', 'Vyberte poschodie', 'Vyberte izbu']
const candidates = computed(() =>
  props.event.places.filter((p) =>
    stages.slice(0, stage.value).every((key) => p[key] === selected.value[key]),
  ),
)
const options = computed(() => [...new Set(candidates.value.map((p) => p[stages[stage.value]]))])
const optionLabel = (value) =>
  stage.value === 0
    ? dormName(value)
    : stage.value === 1
      ? `Blok ${value}`
      : stage.value === 2
        ? floorName(value)
        : `Izba ${value}`
const visibleOptions = computed(() =>
  options.value.filter((value) =>
    optionLabel(value).toLocaleLowerCase('sk').includes(search.value.toLocaleLowerCase('sk')),
  ),
)
function advance(index) {
  stage.value = index
  search.value = ''
  if (index >= 4 || (index === 3 && selected.value.floor === 'server')) {
    finish()
    return
  }
  if (options.value.length === 1) {
    selected.value[stages[index]] = options.value[0]
    advance(index + 1)
  }
}
function finish() {
  const place = props.event.places.find((p) =>
    stages.every(
      (key) => (key === 'room' && p.kind === 'server') || p[key] === selected.value[key],
    ),
  )
  if (place) emit('choose', place)
}
function choose(value) {
  history.value.push(stage.value)
  selected.value[stages[stage.value]] = value
  advance(stage.value + 1)
}
function back() {
  const index = history.value.pop()
  for (const key of stages.slice(index)) delete selected.value[key]
  stage.value = index
  search.value = ''
}
function optionPlaces(value) {
  return candidates.value.filter((p) => p[stages[stage.value]] === value)
}
onMounted(() => advance(0))
</script>
<template>
  <Modal :title="titles[stage] || 'Výber miestnosti'" @close="emit('close')">
    <div class="picker-content">
      <div class="picker-context">
        <span v-if="selected.dorm">{{ dormName(selected.dorm) }}</span><span
          v-if="selected.block"
          >{{ selected.block }}</span
        ><span v-if="selected.floor">{{ floorName(selected.floor) }}</span
        ><span v-if="!selected.dorm">{{ event.name }}</span>
      </div>
      <p class="muted small">Kroky s jedinou možnosťou preskočíme automaticky.</p>
      <label v-if="options.length > 6" class="search-input picker-search"
        ><Icon name="search" :size="18" /><input
          v-model="search"
          :placeholder="stage === 3 ? 'Hľadať číslo izby…' : 'Hľadať…'"
          aria-label="Hľadať vo výbere"
      /></label>
      <div class="picker-options" :class="{ compact: stage === 3 }">
        <button
          v-for="value in visibleOptions"
          :key="value"
          class="picker-option"
          @click="choose(value)"
        >
          <span
            class="icon-box"
            :class="{ success: optionPlaces(value).every((p) => isDone(event, p)) }"
            ><Icon
              :name="
                optionPlaces(value).every((p) => isDone(event, p))
                  ? 'check'
                  : stage === 0
                    ? 'building'
                    : stage === 1
                      ? 'layers'
                      : value === 'server'
                        ? 'server'
                        : 'room'
              " /></span
          ><span
            ><strong>{{ optionLabel(value) }}</strong
            ><small
              >{{ optionPlaces(value).filter((p) => isDone(event, p)).length }} /
              {{ optionPlaces(value).length }} hotovo</small
            ></span
          ><Icon name="right" :size="18" />
        </button>
      </div>
      <p v-if="!visibleOptions.length" class="empty-search">Nenašli sa žiadne miestnosti.</p>
      <button v-if="history.length" class="button secondary picker-back" @click="back">
        <Icon name="back" :size="17" /> O krok späť
      </button>
    </div>
  </Modal>
</template>
