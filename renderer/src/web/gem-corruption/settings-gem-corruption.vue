<template>
  <div class="flex flex-col gap-4 p-4 max-w-md text-gray-400">
    <ui-toggle v-model="widget.includeTransfigured">{{ t(':transfigured') }}</ui-toggle>
    <ui-toggle v-model="widget.includeAwakened">{{ t(':awakened') }}</ui-toggle>
    <ui-toggle v-model="widget.includeUnconfirmed">{{ t(':unconfirmed') }}</ui-toggle>
    <label class="flex flex-col gap-1">
      <span>{{ t(':min_multiple') }}: {{ widget.minProfitMultiple > 0 ? `${widget.minProfitMultiple}x` : t(':min_multiple_off') }}</span>
      <input type="range" min="0" max="20" step="0.5" :class="$style.slider"
        :style="{ '--fill': sliderPercent + '%' }"
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
const sliderPercent = computed(() => Math.min(100, Math.max(0, (widget.value.minProfitMultiple / 20) * 100)))
</script>

<style lang="postcss" module>
.slider {
  appearance: none;
  width: 100%;
  height: theme('spacing.1');
  @apply rounded;
  background: linear-gradient(to right, theme('colors.gray.300') var(--fill, 0%), theme('colors.gray.900') var(--fill, 0%));
  box-shadow: inset 0 1px 2px 0 rgba(0, 0, 0, 0.6);

  &::-webkit-slider-thumb {
    appearance: none;
    width: theme('spacing.3');
    height: theme('spacing.3');
    border-radius: 9999px;
    @apply bg-gray-300;
    cursor: pointer;
  }

  &:hover::-webkit-slider-thumb {
    @apply bg-gray-100;
  }
}
</style>
