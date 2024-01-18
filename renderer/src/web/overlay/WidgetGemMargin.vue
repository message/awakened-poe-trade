<template>
  <Widget :config="config" :move-handles="['tl', 'bl']" :removable="false" :inline-edit="false">
    <div class="widget-default-style flex flex-col p-1 gap-1" style="min-width: 24rem;">
      <div>{{ t(':name') }}</div>
      <div v-if=" ! initialLoading()" class="bg-gray-800 rounded">
<!--        <div class="flex gap-x-1 p-1">-->
<!--          <input type="text" :placeholder="t(':input')" class="rounded bg-gray-900 px-1 flex-1"-->
<!--                 v-model="searchValue">-->
<!--          <button class="btn">-->
<!--            <i class="fas fa-times" />-->
<!--            {{ t(':reset') }}-->
<!--          </button>-->
<!--        </div>-->
        <div class="flex flex-col">
          <div v-for="item in (results || [])" :key="item.name" class="border-solid border-b border-b-gray-700">
            <div :class="$style.itemWrapper">
              <div class="flex">
                <div class="w-8 h-8 flex items-center justify-center">
                  <img :src="item.icon || undefined" class="max-w-full max-h-full overflow-hidden">
                </div>
                <div>
                  <div class="h-8 flex items-center px-1">{{ item.name }}</div>
                </div>
              </div>
              <div class="flex">
                <div>
                  <div class="h-8 flex items-center px-1 cursor-pointer hover:underline" @click="openLink(item.fromLink)">From: {{item.from.chaos}} <img src="/images/chaos.png" class="w-6 h-6"> ({{ item.from.id }})</div>
                  <div class="h-8 flex items-center px-1">Profit: {{ item.profit }}
                    <img src="/images/chaos.png" class="w-6 h-6">
                  </div>
                </div>
                <div>
                  <div class="h-8 flex items-center px-1 cursor-pointer hover:underline" @click="openLink(item.toLink)">To: {{item.to.chaos}} <img src="/images/chaos.png" class="w-6 h-6"> ({{ item.to.id }})</div>
                  <div class="h-8 flex items-center px-1">Chance: {{ item.chance }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-center p-2">
          <button @click="prevPage" :style="currentPage === 1 ? 'visibility: hidden' : 'visibility:visible'" class="px-2 py-1 rounded bg-gray-900 text-gray-600">Prev</button>
          <div class="px-2 py-1 cursor-pointer text-gray-600">
            {{ currentPage }}
          </div>
          <button @click="nextPage" :style="currentPage === totalPages ? 'visibility: hidden' : 'visibility:visible'" class="px-2 py-1 rounded bg-gray-900 text-gray-600">Next</button>
        </div>
      </div>
      <div v-else class="text-center">
        <i class="fas fa-dna fa-spin px-2" />
      </div>
    </div>
  </Widget>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, shallowRef } from 'vue'
import { useI18nNs } from '@/web/i18n'
import { ItemSearchWidget, WidgetManager } from './interfaces'
import { usePoeninja } from '@/web/background/Prices'
import { ITEMS_ITERATOR } from '@/assets/data'

import Widget from './Widget.vue'
import { AppConfig } from '@/web/Config'
import { ItemFilters } from '@/web/price-check/filters/interfaces'
import { getTradeEndpoint } from '@/web/price-check/trade/common'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { ItemCategory, ParsedItem } from '@/parser'

interface Gem {
  id: string
  level: number
  quality: any
  corrupted: boolean
  vaal: boolean
  chaos: number
}

interface GemVariants {
  name: string
  variants: Record<string, Gem>
}

const props = defineProps<{
  config: ItemSearchWidget
}>()

const wm = inject<WidgetManager>('wm')!
if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.anchor = {
    pos: 'tc',
    x: (Math.random() * (60 - 40) + 40),
    y: (Math.random() * (15 - 5) + 5)
  }
  nextTick(() => {
    wm.show(props.config.wmId)
  })
}

const { t } = useI18nNs('gem_margin')
const { xchgRate, initialLoading, getPricesFor } = usePoeninja()

nextTick(() => {
  props.config.wmFlags = ['invisible-on-blur']
})

const isVaal = (name: string) => {
  return name.includes('Vaal ')
}

const stripVaal = (name: string) => {
  return name.replace('Vaal ', '')
}

type GemInfo = {
  name: string,
  icon: string | null,
  vaalIcon: string | null,
  discriminator: string | null,
  transfigured: boolean,
  normalVariant: string | null
};

// Get gem icons
const gemInfo: Record<string, GemInfo> = {}
for (const baseType of ITEMS_ITERATOR('"namespace":"GEM"')) {
  const isVaalGem = isVaal(baseType.name)
  const name = isVaalGem ? stripVaal(baseType.name) : baseType.name
  if (!Object.prototype.hasOwnProperty.call(gemInfo, name)) {
    gemInfo[name] = { name, icon: null, vaalIcon: null, discriminator: null, transfigured: false, normalVariant: null }
  }

  if (isVaalGem) {
    gemInfo[name].vaalIcon = baseType.icon
  } else {
    gemInfo[name].icon = baseType.icon
  }

  if (baseType.tradeDisc) {
    gemInfo[name].discriminator = baseType.tradeDisc
    gemInfo[name].transfigured = baseType.gem?.transfigured || false
    gemInfo[name].normalVariant = baseType.gem?.normalVariant || null
  }
}

// Get GCP price
// const gcpPrice = computed(() => {
//   if (!xchgRate.value) {
//     return 0
//   }
// })

const gems = computed(() => {
  if (!xchgRate.value) {
    return []
  }

  return getPricesFor({
    ns: 'GEM',
    url: 'skill-gems'
  })
})

const gemCollection = computed(() => {
  if (!gems.value?.length) {
    return []
  }

  const collection: Record<string, GemVariants> = {}

  for (const line of gems.value[0].lines) {
    const isVaal = line.name.includes('Vaal')
    const name = isVaal ? stripVaal(line.name) : line.name
    let id = line.variant
    if (isVaal) {
      id = id + 'v'
    }
    if (!Object.prototype.hasOwnProperty.call(collection, name)) {
      collection[name] = { name, variants: {} }
    }

    const corrupted = line.variant.includes('c')
    const [level, quality] = line.variant.replace('c', '').split('/')

    collection[name].variants[id] = {
      id,
      level: level && parseInt(level, 10),
      quality: (quality && parseInt(quality, 10)) || null,
      corrupted,
      vaal: isVaal,
      chaos: Math.floor(line.chaos)
    }
  }

  return collection
})

const getVariant = (gem: GemVariants, variants: string[]): Gem | undefined => {
  for (const variant of variants) {
    if (gem.variants[variant]) {
      return gem.variants[variant]
    }
  }
}

const getTradeLink = (info: GemInfo, gem: Gem) => {
  const { leagueId } = AppConfig()
  const name = info.normalVariant ? info.normalVariant : info.name
  const filters: ItemFilters = {
    searchExact: {
      baseType: name,
      baseTypeTrade: name
    },
    trade: {
      offline: false,
      onlineInLeague: false,
      league: leagueId || 'Standard',
      collapseListings: 'api',
      listed: undefined,
      currency: undefined
    },
    corrupted: {
      value: gem.corrupted
    },
    gemLevel: {
      value: gem.level,
      disabled: false
    }
  }

  if (gem.quality) {
    filters.quality = {
      value: gem.quality,
      disabled: false
    }
  }

  if (info.discriminator) {
    filters.discriminator = {
      trade: info.discriminator
    }
  }

  const item: ParsedItem = {
    category: ItemCategory.Gem,
    isUnidentified: false,
    isCorrupted: false,
    newMods: [],
    statsByType: [],
    unknownModifiers: [],
    influences: [],
    info: {
      name,
      refName: name,
      namespace: 'GEM',
      icon: '',
      gem: {}
    },
    rawText: ''
  }
  const tradeRequest = createTradeRequest(filters, [], item)
  const link = `https://${getTradeEndpoint()}/trade/search/${leagueId}?q=${JSON.stringify(tradeRequest)}`
  return link
}

const pairs = computed(() => {
  if (!gemCollection.value) {
    return []
  }

  const output = []

  for (const gem of Object.values(gemCollection.value)) {
    const name = gem.name

    let fromVariants = ['20/20', '20', '1/20', '1']
    let toVariants = ['21/20c', '21c']
    let failueVariants = ['20/20c', '20c', '1/20c', '1c']

    if (['Empower Support', 'Enlighten Support', 'Enhance Support'].includes(name)) {
      fromVariants = ['3']
      toVariants = ['4c']
      failueVariants = ['3c']
    } else if (['Awakened Empower Support', 'Awakened Enlighten Support', 'Awakened Enhance Support'].includes(name)) {
      fromVariants = ['4/20', '4', '1/20', '1']
      toVariants = ['5/20c', '5c']
      failueVariants = ['4/20c', '4c']
    } else if (name.includes('Awakened')) {
      fromVariants = ['5/20', '5', '1/20', '1']
      toVariants = ['6/20c', '6c']
      failueVariants = ['5/20c', '5c']
    }

    const from = getVariant(gem, fromVariants)
    const to = getVariant(gem, toVariants)
    const failure = getVariant(gem, failueVariants)

    if (!from || !to) {
      console.log('Missing variant', name, gem.variants)
      continue
    }
    const profit = Math.floor(to.chaos - from.chaos)
    const chance = Math.floor(to.chaos / from.chaos)
    if (chance < 7) {
      continue
    }

    output.push(
      {
        name,
        icon: gemInfo[name].icon,
        from,
        fromLink: getTradeLink(gemInfo[name], from),
        to,
        toLink: getTradeLink(gemInfo[name], to),
        failure,
        chance,
        profit
      }
    )
  }

  return output.sort((a, b) => b.profit - a.profit)
})

const openLink = (link: string) => {
  window.open(link, '_blank')
}

const currentPage = shallowRef(1)
const pageSize = 3
const totalPages = computed(() => {
  if (!pairs.value) {
    return 0
  }

  return Math.ceil(pairs.value.length / pageSize)
})

const nextPage = () => {
  currentPage.value = currentPage.value + 1
}
const prevPage = () => {
  currentPage.value = currentPage.value - 1
}

const results = computed(() => {
  if (!pairs.value) {
    return []
  }

  return pairs.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
})
</script>

<style lang="postcss" module>
.itemWrapper {
  @apply pl-1 pt-1;
  overflow: hidden;

  &:hover {
    background: linear-gradient(to left, theme('colors.gray.800'), theme('colors.gray.900'));
  }

  button {
    @apply text-gray-600;
    @apply px-1;
    @apply rounded;
  }

  &:hover button {
    @apply text-gray-400;
    @apply bg-gray-700;
  }
}

.starredItem {
  display: flex;
  flex-direction: column;
  @apply rounded px-1 pb-1 pt-0.5;

  &:hover {
    @apply bg-gray-700;
  }
}

@keyframes starredItemEnter {
  0% {
    @apply bg-transparent;
  }
  50% {
    @apply bg-gray-700;
  }
  100% {
    @apply bg-transparent;
  }
}

.starredItemEnter {
  animation: starredItemEnter 0.8s linear;
}
</style>
