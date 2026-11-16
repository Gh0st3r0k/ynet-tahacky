<script setup>
import Icon from './Icon.vue'
import { uid } from '../model'
const props = defineProps({ modelValue: Object })
const emit = defineEmits(['update:modelValue'])
function add(kind) {
  if (props.modelValue[kind].length < 50) props.modelValue[kind].push({ id: uid(), text: '' })
}
</script>
<template>
  <div class="template-grid">
    <section v-for="kind in ['room', 'server']" :key="kind" class="template-panel">
      <div class="template-heading">
        <span class="icon-box" :class="kind"><Icon :name="kind" :size="22" /></span>
        <div>
          <h3>{{ kind === 'room' ? 'Úlohy pre izby' : 'Úlohy pre serverovne' }}</h3>
          <p>Rovnaký zoznam pre každú {{ kind === 'room' ? 'izbu' : 'serverovňu' }}.</p>
        </div>
      </div>
      <div class="template-items">
        <div v-for="(task, i) in modelValue[kind]" :key="task.id" class="template-input">
          <span class="fake-checkbox"></span
          ><input
            v-model="task.text"
            :aria-label="`${kind === 'room' ? 'Izba' : 'Serverovňa'}: úloha ${i + 1}`"
            placeholder="Čo treba urobiť?"
            maxlength="300"
          /><button
            type="button"
            class="icon-button"
            :aria-label="`Odstrániť úlohu ${i + 1}`"
            @click="modelValue[kind].splice(i, 1)"
          >
            <Icon name="close" :size="17" />
          </button>
        </div>
        <p v-if="!modelValue[kind].length" class="muted small">
          Bez úloh. Miesta môžete označiť ako hotové aj bez zoznamu.
        </p>
      </div>
      <button
        type="button"
        class="text-button"
        :disabled="modelValue[kind].length >= 50"
        @click="add(kind)"
      >
        <Icon name="plus" :size="17" /> Pridať úlohu
      </button>
    </section>
  </div>
</template>
