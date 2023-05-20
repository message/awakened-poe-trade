<template>
  <div v-if="tags.length" class="flex items-center text-xs leading-none gap-x-1">
    <span v-for="tag of tags"
          :class="$style[tag.type]">{{ tag.count> 1 ? t('filters.tierDouble', [tag.tier, tag.count]) :  t('filters.tier', [tag.tier])}}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ItemCategory, ParsedItem } from '@/parser'
import { FilterTag, StatFilter } from './interfaces'

type Tiers = Record<string, { type: string, tier: number, count: number }>;

export default defineComponent({
  props: {
    filter: {
      type: Object as PropType<StatFilter>,
      required: true
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    }
  },
  setup (props) {
    const tags = computed(() => {
      const { filter, item } = props
      const out: Tiers = {}

      const incrementTierCount = (out: Tiers, type:string, tier: number) => {
        if (!out[type]) {
          out[type] = { type, tier, count: 0 }
        }
        out[type] = { ...out[type], count: out[type].count + 1 }
        return out
      }

      for (const source of filter.sources) {
        const tier = source.modifier.info.tier
        if (!tier) continue

        if ((
            filter.tag === FilterTag.Explicit ||
            filter.tag === FilterTag.Pseudo ||
            filter.tag === FilterTag.Property
        ) && (
            item.category !== ItemCategory.Jewel &&
            item.category !== ItemCategory.ClusterJewel &&
            item.category !== ItemCategory.MemoryLine
        )) {
          if (tier === 1) incrementTierCount(out, 'tier-1', tier)
          else if (tier === 2) incrementTierCount(out, 'tier-2', tier)
          else if (tier === 3) incrementTierCount(out, 'tier-3', tier)
        } else if (tier >= 3) {
          // fractured, explicit-* filters
          incrementTierCount(out, 'not-tier-1', tier)
        }
      }
      return Object.values(out).sort((a, b) => a.tier - b.tier)
    })

    const { t } = useI18n()
    return { t, tags }
  }
})
</script>

<style lang="postcss" module>
.tier-1, .tier-2, .tier-3, .not-tier-1 {
  @apply rounded px-1;
}

.tier-1, .tier-2, .tier-3{
  @apply border -my-px;
}

.tier-1 {
  @apply  bg-yellow-500 border-yellow-500 text-black;
}
.tier-2 {
  @apply  border-yellow-500 text-yellow-500;
}
.tier-3 {
  @apply  border-yellow-300 text-yellow-300;
}
.not-tier-1 {
  @apply bg-gray-700 text-black;
}
</style>