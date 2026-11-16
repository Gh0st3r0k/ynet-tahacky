<script setup>
import Icon from './Icon.vue'
import { uid } from '../model'
const props = defineProps({
  modelValue: { type: Array, required: true },
  label: { type: String, default: 'Miesto' },
})
const emit = defineEmits(['update:modelValue'])
function add() {
  if (props.modelValue.length < 50)
    emit('update:modelValue', [...props.modelValue, { id: uid(), text: '' }])
}
function remove(index) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}
</script>
<template>
  <div class="template-items">
    <div v-for="(task, i) in modelValue" :key="task.id" class="template-input">
      <span class="fake-checkbox"></span>
      <input
        v-model="task.text"
        :aria-label="`${label}: úloha ${i + 1}`"
        placeholder="Čo treba urobiť?"
        maxlength="300"
      />
      <button
        type="button"
        class="icon-button"
        :aria-label="`Odstrániť úlohu ${i + 1}`"
        @click="remove(i)"
      >
        <Icon name="close" :size="17" />
      </button>
    </div>
    <p v-if="!modelValue.length" class="muted small">
      Bez úloh. Miesto môžete dokončiť aj bez zoznamu.
    </p>
  </div>
  <button
    type="button"
    class="text-button add-task"
    :disabled="modelValue.length >= 50"
    @click="add"
  >
    <Icon name="plus" :size="17" /> Pridať úlohu
  </button>
</template>
