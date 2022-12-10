<template>
  <div v-if="explicits.prefixes.length || explicits.suffixes.length" class="mb-4">
    <div v-for="prefix of explicits.prefixes" v-if="explicits.prefixes" class="flex">
      <div class="flex items-center justify-center" :class="[$style.tag, (prefix.type === 'crafted' ? $style.crafted :$style.prefix)]">
        <span v-if="prefix.type === 'crafted'">R{{ prefix.rank || 0 }}</span>
        <span v-else>P{{ prefix.tier || (prefix.type === 'veiled' ? 13 : 0) }}</span>
      </div>
      <div class="text-center grow items-center justify-center">
        <div v-if="prefix.type === 'veiled'" class="flex items-center justify-center">
          <div :class="[$style.veiledPrefix]"></div>
        </div>
        <div v-else>
          <div :class="[prefix.type === 'crafted' ? $style.crafted : prefix.type === 'fractured'? $style.fractured: $style.stat]" v-for="flatStat of prefix.flatStats">
            {{ flatStat }}
          </div>
        </div>
      </div>
    </div>
    <div v-for="suffix of explicits.suffixes" v-if="explicits.suffixes" class="flex">
      <div class="flex items-center justify-center" :class="[$style.tag, suffix.type === 'crafted' ? $style.crafted : $style.suffix]">
        <div v-if="suffix.type === 'crafted'">R{{ suffix.rank || 0 }}</div>
        <div v-else>S{{ suffix.tier || (suffix.type === 'veiled' ? 13 : 0) }}</div>
      </div>
      <div class="text-center grow items-center justify-center">
        <div v-if="suffix.type === 'veiled'" class="flex items-center justify-center">
          <div :class="[$style.veiledSuffix]"></div>
        </div>
        <div v-else>
          <div :class="[suffix.type === 'crafted' ? $style.crafted : suffix.type === 'fractured'? $style.fractured: $style.stat]" v-for="flatStat of suffix.flatStats">
            {{ flatStat }}
          </div>
        </div>
      </div>
    </div>
<!--    <div v-if="explicits.tierScore > 0" class="mt-2">-->
<!--      <div class="text-center text-xs">tier score: {{ explicits.tierScore.toFixed(2) }}%</div>-->
<!--    </div>-->
  </div>

</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ParsedItem, ViewModifier } from '@/parser'

type ExplicitsCollection = {
  prefixes: ViewModifier[],
  suffixes: ViewModifier[],
  itemCount: number,
  totalScore: number,
  tierScore: number,
};

export default defineComponent({
  props: {
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    }
  },
  setup (props) {
    const { t } = useI18n()

    const explicits = computed(() => {
      const collection: ExplicitsCollection = { prefixes: [], suffixes: [], itemCount: 0, totalScore: 0, tierScore: 0 }
      if (props.item.newMods) {
        return props.item.newMods.reduce((collection, mod) => {
          const viewMod: ViewModifier = { ...mod.info, flatStats: mod.stats.map(stat => stat.flat) }
          const isPrefix = mod.info.generation === 'prefix'
          const isSuffix = mod.info.generation === 'suffix'
          if (isPrefix || isSuffix) {
            console.log(viewMod)
            const tier = viewMod.rank !== undefined ? viewMod.rank === 0 ? 1 : viewMod.rank : viewMod.tier !== undefined ? viewMod.tier : 13
            collection.itemCount = collection.itemCount + 1
            collection.totalScore = collection.totalScore + tier
            collection[isPrefix ? 'prefixes' : 'suffixes'].push(viewMod)
          }
          collection.tierScore = (collection.itemCount > 0 && collection.totalScore > 0) ? ((collection.itemCount / collection.totalScore) * 100) : 0
          return collection
        }, collection)
      }
      return collection
    })

    return {
      t,
      explicits
    }
  }
})
</script>

<style lang="postcss" module>
@keyframes animateVeiledMod {
  100% {
    background-position: 0
  }
}

.veiledPrefix {
  @extend
  padding: 0;
  animation: animateVeiledMod 3s steps(90) reverse infinite;
  will-change: background-position;
  white-space: nowrap;
  background-image: url('/images/veiled-prefix.png');
  width: 158px;
  height: 20px;
  display: inline-block;
  background-position: -14220px;
  user-select: auto;
  color: transparent
}

.veiledSuffix {
  padding: 0;
  animation: animateVeiledMod 3s steps(90) reverse infinite;
  will-change: background-position;
  white-space: nowrap;
  background-image: url('/images/veiled-suffix.png');
  width: 85px;
  height: 20px;
  display: inline-block;
  background-position: -7650px;
  user-select: auto;
  color: transparent
}

.tag {
  flex: 0 0 30px;
  border-right: 1px solid;
  padding-right: 3px;
  margin-bottom: 2px;
  width: 30px;
}

.stat {
  color: #8888FF
}

.prefix {
  color: #EC7676
}

.suffix {
  color: #7AAFF1
}

.crafted {
  color: #B4B4FF
}

.fractured {
  color: #A29162
}
</style>

<i18n>
{
  "ru": {
  }
}
</i18n>
