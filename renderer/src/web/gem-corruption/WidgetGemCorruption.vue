<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <div class="widget-default-style p-1 flex flex-col gap-1" style="width: 24rem;">
      <div :class="$style.toolbar">
        <input type="text" :placeholder="t(':filter')" :class="$style.filterInput"
          v-model="filterValue">
      </div>
      <div class="flex flex-col gap-y-1">
        <div v-for="row in pageRows" :key="row.gem.refName" :class="$style.row">
          <img :src="row.gem.icon" :class="$style.icon">
          <div class="flex flex-col flex-1 min-w-0">
            <div :class="$style.name">
              <span class="truncate">{{ row.gem.name }}</span>
            </div>
            <div :class="$style.actions">
              <button :class="$style.actionBtn" :title="t(':buy_hint')"
                @click="openBuy(row, $event)">
                <span :class="$style.actionLabel">{{ t(':buy') }} · {{ row.gem.gem!.maxLevel }}{{ row.viaGemcutter ? '' : '/20' }}
                  <img v-if="row.viaGemcutter && gemcutterIcon" :src="gemcutterIcon" :class="$style.gcpIcon" :title="t(':via_gemcutter_hint')"></span>
                <span :class="$style.value">{{ fmt(row.baselineCost).text }}
                  <img :src="fmt(row.baselineCost).icon" :class="$style.currencyIcon"></span>
              </button>
              <button :class="$style.actionBtn"
                :title="t(':sell_hint')"
                @click="openVerify(row, $event)">
                <span :class="$style.actionLabel">{{ t(':sell') }} · {{ row.gem.gem!.maxLevel + 1 }}/20c</span>
                <span :class="$style.value">{{ fmt(row.sellPrice).text }}
                  <img :src="fmt(row.sellPrice).icon" :class="$style.currencyIcon">
                  <span :class="row.profit >= 0 ? $style.profitPositive : $style.profitNegative">
                    ({{ row.profit >= 0 ? '+' : '' }}{{ fmt(row.profit).text }}, {{ (row.profitMargin * 100).toFixed(0) }}%, {{ sellBuyRatio(row).toFixed(1) }}x)
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
        <div v-if="!results.length" :class="$style.searchMessage">
          <i class="fas fa-spinner fa-spin" /> {{ t(':loading') }}
        </div>
        <div v-else-if="!rows.length" :class="$style.searchMessage">
          {{ t(':no_matches') }}
        </div>
      </div>
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-x-3 py-1">
        <button :class="$style.pageBtn" :disabled="page === 0" @click="page -= 1">
          <i class="fas fa-chevron-left" />
        </button>
        <span class="text-gray-500">{{ page + 1 }} / {{ totalPages }}</span>
        <button :class="$style.pageBtn" :disabled="page >= totalPages - 1" @click="page += 1">
          <i class="fas fa-chevron-right" />
        </button>
      </div>
    </div>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '../overlay/interfaces'
import type { GemCorruptionWidget } from './widget.js'

export default {
  widget: {
    type: 'gem-corruption',
    instances: 'single',
    initInstance: (): GemCorruptionWidget => {
      return {
        wmId: 0,
        wmType: 'gem-corruption',
        wmTitle: '{icon=fa-skull-crossbones}',
        wmWants: 'hide',
        wmZorder: null,
        wmFlags: ['invisible-on-blur'],
        anchor: {
          pos: 'tl',
          x: 10,
          y: 20
        },
        includeTransfigured: true,
        includeAwakened: true,
        includeUnconfirmed: true,
        minProfitMultiple: 7
      }
    }
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { shallowRef, computed, watch } from 'vue'
import { useI18nNs } from '@/web/i18n'
import { usePoeninja, displayRounding } from '@/web/background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { Host } from '@/web/background/IPC'
import { createVirtualItem } from '@/parser/ParsedItem'
import { ItemCategory } from '@/parser'
import { ITEM_BY_REF, type BaseType } from '@/assets/data'
import { computeCorruptionEv, gemCorruptionCandidates, type CorruptionResult } from './calc'

import Widget from '../overlay/Widget.vue'

const props = defineProps<{
  config: GemCorruptionWidget
}>()

const PAGE_SIZE = 5

const { t } = useI18nNs('gem_corruption')
const { findPriceByQuery, queuePricesFetch, xchgRate } = usePoeninja()
const leagues = useLeagues()

const gemcutterIcon = shallowRef<string | undefined>()

const filterValue = shallowRef('')
const results = shallowRef<CorruptionResult[]>([])
const page = shallowRef(0)

function recompute () {
  gemcutterIcon.value = ITEM_BY_REF('ITEM', "Gemcutter's Prism")?.[0]?.icon

  const out: CorruptionResult[] = []
  for (const gem of gemCorruptionCandidates()) {
    const result = computeCorruptionEv(gem, { findPriceByQuery })
    if (result) out.push(result)
  }
  out.sort((a, b) => b.profit - a.profit)
  results.value = out
}

watch(xchgRate, recompute, { immediate: true })

watch(() => props.config.wmWants, (wants) => {
  if (wants === 'show') {
    queuePricesFetch()
  }
}, { immediate: true })

function isAwakened (gem: BaseType) {
  return gem.refName.startsWith('Awakened ')
}

// old saved widget configs predate this field and won't have it set
const minProfitMultiple = computed(() => props.config.minProfitMultiple || 7)

const rows = computed(() => {
  const search = filterValue.value.trim().toLowerCase()
  return results.value.filter((row) => {
    const { gem } = row
    if (gem.gem?.transfigured && !props.config.includeTransfigured) return false
    if (isAwakened(gem) && !props.config.includeAwakened) return false
    if (row.missing.length > 0 && !props.config.includeUnconfirmed) return false
    if (row.sellPrice / row.baselineCost < minProfitMultiple.value) return false
    if (search && !gem.name.toLowerCase().includes(search)) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE_SIZE)))

watch([filterValue, () => props.config.includeTransfigured, () => props.config.includeAwakened, () => props.config.includeUnconfirmed, minProfitMultiple], () => {
  page.value = 0
})

const pageRows = computed(() => {
  const clampedPage = Math.min(page.value, totalPages.value - 1)
  const start = clampedPage * PAGE_SIZE
  return rows.value.slice(start, start + PAGE_SIZE)
})

function fmt (value: number) {
  return {
    text: displayRounding(value),
    icon: '/images/chaos.png'
  }
}

function sellBuyRatio (row: CorruptionResult) {
  return row.sellPrice / row.baselineCost
}

function logRow (label: string, row: CorruptionResult, parsed: ReturnType<typeof createVirtualItem>) {
  console.log(`[gem-corruption] ${label}`, {
    name: row.gem.name,
    refName: row.gem.refName,
    league: leagues.selectedId.value,
    xchgRate: xchgRate.value,
    linkedTo: { gemLevel: parsed.gemLevel, quality: parsed.quality, isCorrupted: parsed.isCorrupted },
    baselineCost: row.baselineCost,
    sellPrice: row.sellPrice,
    profit: row.profit,
    profitMargin: row.profitMargin,
    vaalOrbPrice: row.vaalOrbPrice,
    gemcutterPrism: row.gemcutterPrism,
    breakdown: row.breakdown,
    missing: row.missing
  })
}

function openBuy (row: CorruptionResult, e: MouseEvent) {
  // matches the "Buy" caption: a maxed, uncorrupted gem - the state you need in hand
  // right before using the Vaal Orb. When baselineCost was priced via crafting (base
  // gem + 20x Gemcutter's Prism, see row.viaGemcutter) link to quality: 0 instead of 20 -
  // `quality` is falsy so createGemFilters omits the quality filter entirely, matching
  // the actual buy target (cheapest listing at any quality, to be topped up with prisms).
  const parsed = createVirtualItem({
    category: ItemCategory.Gem,
    info: row.gem,
    gemLevel: row.gem.gem!.maxLevel,
    quality: row.viaGemcutter ? 0 : 20
  })

  logRow('buy', row, parsed)

  dispatchPriceCheck(parsed, e)
}

function openVerify (row: CorruptionResult, e: MouseEvent) {
  // matches the "Sell" caption (maxLevel+1/20c): the level-up corruption outcome.
  // row.sellPrice IS this listing's price directly (corruptedLevelUp) - compare it
  // against the logged breakdown to sanity-check the underlying poe.ninja data.
  const parsed = createVirtualItem({
    category: ItemCategory.Gem,
    info: row.gem,
    gemLevel: row.gem.gem!.maxLevel + 1,
    quality: 20,
    isCorrupted: true
  })

  logRow('sell', row, parsed)

  dispatchPriceCheck(parsed, e)
}

function dispatchPriceCheck (parsed: ReturnType<typeof createVirtualItem>, e: MouseEvent) {
  Host.selfDispatch({
    name: 'MAIN->CLIENT::item-text',
    payload: {
      clipboard: parsed.rawText,
      item: parsed,
      position: { x: e.clientX, y: e.clientY },
      focusOverlay: true,
      target: 'price-check'
    }
  })
}
</script>

<style lang="postcss" module>
.toolbar {
  display: flex;
  align-items: center;
  gap: theme('spacing.2');
  padding: theme('spacing.1');
  background: theme('colors.gray.800');
  border-radius: theme('borderRadius.DEFAULT');
}

.filterInput {
  @apply rounded;
  @apply px-2 py-1;
  @apply bg-gray-900;
  flex: 1;
  box-shadow: inset 0 1px 2px 0 rgba(0, 0, 0, 0.6);

  &::placeholder {
    @apply text-gray-500;
  }

  &:focus {
    @apply text-gray-100;
    box-shadow: inset 0 1px 2px 0 rgba(0, 0, 0, 0.6), 0 0 0 1px theme('colors.gray.500');
  }
}

.row {
  display: flex;
  align-items: center;
  gap: theme('spacing.2');
  padding: theme('spacing.1') theme('spacing.2');
  @apply rounded;
  @apply bg-gray-800;

  & .icon {
    flex-shrink: 0;
    object-position: center;
    object-fit: contain;
    width: 2.75rem;
    height: 2.75rem;
  }

  & .name {
    display: flex;
    align-items: center;
    gap: theme('spacing.1');
    height: theme('spacing.6');
  }

  & .tag {
    @apply text-gray-500;
    @apply bg-gray-900;
    @apply rounded;
    @apply px-1;
    font-size: theme('fontSize.sm');
    flex-shrink: 0;
  }
}

.actions {
  display: flex;
  gap: theme('spacing.1');
}

.actionBtn {
  display: flex;
  flex-direction: column;
  flex: 1;
  @apply rounded;
  @apply px-2 py-0.5;
  @apply bg-gray-900;
  @apply text-gray-100;
  text-align: left;
  box-shadow: inset 0 1px 2px 0 rgba(0, 0, 0, 0.6);

  &:hover {
    @apply bg-gray-700;
  }
}

.actionLabel {
  @apply text-gray-600;
  font-size: theme('fontSize.sm');
}

.value {
  display: flex;
  align-items: center;
  gap: theme('spacing.1');
  white-space: nowrap;
}

.currencyIcon {
  width: theme('spacing.4');
  height: theme('spacing.4');
}

.gcpIcon {
  display: inline-block;
  width: theme('spacing.3');
  height: theme('spacing.3');
  vertical-align: middle;
}

.searchMessage {
  text-align: center;
  padding: theme('spacing.8');
}

.profitPositive {
  @apply text-green-500;
}

.profitNegative {
  @apply text-red-600;
}

.pageBtn {
  @apply rounded;
  @apply text-gray-300;
  @apply bg-gray-800;
  @apply px-3 py-1;

  &:hover:not(:disabled) {
    @apply bg-gray-700;
  }

  &:disabled {
    @apply text-gray-600;
    @apply bg-transparent;
  }
}
</style>
