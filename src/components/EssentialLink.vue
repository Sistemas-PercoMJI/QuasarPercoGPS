<template>
  <q-item 
    clickable 
    tag="a" 
    target="_blank" 
    :href="link"
    class="link-item q-mb-sm"
  >
    <q-item-section avatar>
      <q-avatar 
        :size="icon.startsWith('http') ? '48px' : '40px'" 
        :class="icon.startsWith('http') ? 'custom-logo' : 'icon-avatar'"
      >
        <img v-if="icon.startsWith('http')" :src="icon" :alt="title">
        <q-icon v-else :name="icon" size="24px" color="primary" />
      </q-avatar>
    </q-item-section>

    <q-item-section>
      <q-item-label class="text-weight-bold text-grey-9">
        {{ title }}
      </q-item-label>
      <q-item-label caption class="text-grey-7">
        {{ caption }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <q-icon name="arrow_forward" color="grey-5" />
    </q-item-section>
  </q-item>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: ''
  },
  link: {
    type: String,
    default: '#'
  },
  icon: {
    type: String,
    default: 'link'
  }
})
</script>

<style scoped>
.link-item {
  border-radius: 12px;
  transition: all 0.3s ease;
  padding: 12px;
}

.link-item:hover {
  background: rgba(102, 126, 234, 0.1);
  transform: translateX(8px);
}

.link-item:hover .q-icon {
  color: #667eea !important;
}

.custom-logo {
  background: white;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.icon-avatar {
  background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
  border-radius: 12px;
}
</style>