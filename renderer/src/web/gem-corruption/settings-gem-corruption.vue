<template>
  <div class="flex flex-col gap-4 p-4 max-w-md text-gray-400">
    <ui-toggle v-model="widget.includeTransfigured">{{ t(':transfigured') }}</ui-toggle>
    <ui-toggle v-model="widget.includeAwakened">{{ t(':awakened') }}</ui-toggle>
    <ui-toggle v-model="widget.includeUnconfirmed">{{ t(':unconfirmed') }}</ui-toggle>
    <label class="flex flex-col gap-1">
      <span>{{ t(':min_multiple') }}: {{ widget.minProfitMultiple > 0 ? `${widget.minProfitMultiple}x` : t(':min_multiple_off') }}</span>
      <input type="range" min="0" max="20" step="0.5"
        v-model.number="widget.minProfitMultiple">
    </label>
  </div>
</template>

<script lang="ts">
export default {
  name: 'gem_corruption.name'
}
</script>

<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { useI18nNs } from '@/web/i18n'
import { configProp, findWidget } from '../settings/utils'
import type { GemCorruptionWidget } from './widget.js'

import UiToggle from '@/web/ui/UiToggle.vue'

const props = defineProps(configProp())
const { t } = useI18nNs('gem_corruption')

const widget = computed(() => findWidget<GemCorruptionWidget>('gem-corruption', props.config)!)
</script>
