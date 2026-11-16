<script setup>
import Icon from './Icon.vue'
import TaskListEditor from './TaskListEditor.vue'
defineProps({ modelValue: Object })
</script>
<template>
  <div class="template-grid">
    <section v-for="kind in ['room', 'server']" :key="kind" class="template-panel">
      <div class="template-heading">
        <span class="icon-box" :class="kind"><Icon :name="kind" :size="22" /></span>
        <div>
          <h3>{{ kind === 'room' ? 'Úlohy pre izby' : 'Úlohy pre serverovne' }}</h3>
          <p>
            Spoločná šablóna pre {{ kind === 'room' ? 'izby' : 'serverovne' }} bez vlastného
            zoznamu.
          </p>
        </div>
      </div>
      <TaskListEditor v-model="modelValue[kind]" :label="kind === 'room' ? 'Izba' : 'Serverovňa'" />
    </section>
  </div>
</template>
