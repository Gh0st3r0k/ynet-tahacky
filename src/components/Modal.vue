<script setup>
import { onMounted, onUnmounted, ref, useId } from 'vue'
import Icon from './Icon.vue'
defineProps({ title: String, wide: Boolean })
const emit = defineEmits(['close'])
const titleId = useId()
const panel = ref(null)
let previousFocus
function onKey(event) {
  if (event.key === 'Escape') emit('close')
  if (event.key !== 'Tab') return
  const nodes = [
    ...panel.value.querySelectorAll('button, input, textarea, select, a[href], [tabindex="0"]'),
  ].filter((el) => !el.disabled && el.getClientRects().length)
  if (!nodes.length) {
    event.preventDefault()
    return
  }
  if (
    event.shiftKey &&
    (document.activeElement === nodes[0] || document.activeElement === panel.value)
  ) {
    event.preventDefault()
    nodes.at(-1).focus()
  } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
    event.preventDefault()
    nodes[0].focus()
  }
}
onMounted(() => {
  previousFocus = document.activeElement
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKey)
  panel.value.focus()
})
onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
  previousFocus?.focus()
})
</script>
<template>
  <Teleport to="body"
    ><div class="modal-backdrop" @click.self="emit('close')">
      <section
        ref="panel"
        class="modal-panel"
        :class="{ wide }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <header class="modal-header">
          <h2 :id="titleId">{{ title }}</h2>
          <button class="icon-button" aria-label="Zavrieť dialóg" @click="emit('close')">
            <Icon name="close" />
          </button>
        </header>
        <slot />
      </section></div
  ></Teleport>
</template>
