import type { ItemFilters } from './interfaces'
import { ParsedItem, ItemCategory, ItemRarity } from '@/parser'
import { tradeTag } from '../trade/common'
import { ModifierType } from '@/parser/modifiers'
import { BaseType, ITEM_BY_REF } from '@/assets/data'
import { CATEGORY_TO_TRADE_ID } from '../trade/pathofexile-trade'

export const SPECIAL_SUPPORT_GEM = ['Empower Support', 'Enlighten Support', 'Enhance Support']

interface CreateOptions {
  league: string
  currency: string | undefined
  collapseListings: 'app' | 'api'
  activateStockFilter: boolean
  exact: boolean
  useEn: boolean
}

export function createFilters (
  item: ParsedItem,
  opts: CreateOptions
): ItemFilters {
  const filters: ItemFilters = {
    searchExact: {},
    trade: {
      offline: false,
      onlineInLeague: false,
      listed: undefined,
      currency: opts.currency,
      league: opts.league,
      collapseListings: opts.collapseListings
    }
  }

  if (item.category === ItemCategory.Gem) {
    return createGemFilters(item, filters, opts)
  }
  if (item.category === ItemCategory.CapturedBeast) {
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: item.info.refName // NOTE: always English on trade
    }
    return filters
  }
  if (item.stackSize || tradeTag(item)) {
    filters.stackSize = {
      value: item.stackSize?.value || 1,
      disabled: !(item.stackSize && item.stackSize.value > 1 && opts.activateStockFilter)
    }
  }
  if (item.category === ItemCategory.Invitation) {
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: t(opts, item.info)
    }
    return filters
  }
  if (item.category === ItemCategory.MetamorphSample) {
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: t(opts, item.info)
    }
    filters.itemLevel = {
      value: item.itemLevel!,
      disabled: false
    }
    return filters
  }
  if (
    item.category === ItemCategory.DivinationCard ||
        item.category === ItemCategory.Currency ||
        item.info.refName === 'Charged Compass'
  ) {
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: t(opts, item.info)
    }
    if (item.info.refName === 'Chronicle of Atzoatl') {
      filters.areaLevel = {
        value: floorToBracket(item.areaLevel!, [1, 68, 73, 75, 78, 80]),
        disabled: false
      }
    }
    if (item.info.refName === 'Mirrored Tablet' || item.info.refName === 'Forbidden Tome') {
      filters.areaLevel = {
        value: item.areaLevel!,
        disabled: false
      }
    }
    if (item.info.refName === 'Filled Coffin') {
      filters.itemLevel = {
        value: item.itemLevel!,
        disabled: false
      }
    }
    return filters
  }

  if (item.category === ItemCategory.Map) {
    if (item.rarity === ItemRarity.Unique && item.info.unique) {
      filters.searchExact = {
        name: item.info.name,
        nameTrade: t(opts, item.info),
        baseTypeTrade: t(opts, ITEM_BY_REF('ITEM', item.info.unique.base)![0])
      }
    } else {
      const isOccupiedBy = item.statsByType.some(calc => calc.stat.ref === 'Map is occupied by #')
      filters.searchExact = {
        baseType: item.info.name,
        baseTypeTrade: t(opts, item.info)
      }
      filters.searchRelaxed = {
        category: item.category,
        disabled: !isOccupiedBy
      }
    }

    if (item.mapBlighted) {
      filters.mapBlighted = { value: item.mapBlighted }
    }

    filters.mapTier = {
      value: item.mapTier!,
      disabled: false
    }
  } else if (item.info.refName === 'Expedition Logbook') {
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: t(opts, item.info)
    }
    filters.areaLevel = {
      value: floorToBracket(item.areaLevel!, [1, 68, 73, 78, 81, 83]),
      disabled: false
    }
  } else if (item.category === ItemCategory.HeistBlueprint) {
    filters.searchRelaxed = {
      category: item.category,
      disabled: true // TODO: blocked by https://www.pathofexile.com/forum/view-thread/3109852
    }
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: t(opts, item.info)
    }

    filters.areaLevel = {
      value: item.areaLevel!,
      disabled: false
    }

    if (item.heist?.wingsRevealed) {
      filters.heistWingsRevealed = {
        value: item.heist.wingsRevealed,
        disabled: false
      }
    }

    if (item.heist?.wingsTotal && item.heist.wingsTotal > 3) {
      filters.heistWingsTotal = {
        value: item.heist.wingsTotal,
        disabled: false
      }
    }
  } else if (item.rarity === ItemRarity.Unique && item.info.unique) {
    filters.searchExact = {
      name: item.info.name,
      nameTrade: t(opts, item.info),
      baseTypeTrade: t(opts, ITEM_BY_REF('ITEM', item.info.unique.base)![0])
    }
  } else {
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: t(opts, item.info)
    }
    if (item.category && CATEGORY_TO_TRADE_ID.has(item.category)) {
      let disabled = opts.exact
      if (
        item.category === ItemCategory.ClusterJewel ||
                item.category === ItemCategory.Idol
      ) {
        disabled = true
      } else if (
        item.category === ItemCategory.SanctumRelic ||
                item.category === ItemCategory.Charm
      ) {
        disabled = false
      }
      filters.searchRelaxed = {
        category: item.category,
        disabled
      }
    }
  }

  if (item.sentinelCharge != null) {
    filters.sentinelCharge = {
      value: item.sentinelCharge,
      disabled: false
    }
  }

  if (item.quality && item.quality >= 20) {
    if (item.category === ItemCategory.Flask || item.category === ItemCategory.Tincture) {
      filters.quality = {
        value: item.quality,
        disabled: (item.quality <= 20)
      }
    }
  }

  // Add quality filter for base items when quality >= 21
  if (item.quality && item.quality >= 21 && opts.exact) {
    // Only add quality filter for items that can be base items
    // Exclude items that don't typically use base item filtering
    const isBaseItemCandidate = (
      item.category !== ItemCategory.Gem &&
      item.category !== ItemCategory.Currency &&
      item.category !== ItemCategory.DivinationCard &&
      item.category !== ItemCategory.Map &&
      item.category !== ItemCategory.CapturedBeast &&
      item.category !== ItemCategory.Invitation &&
      item.category !== ItemCategory.MetamorphSample &&
      item.category !== ItemCategory.HeistContract &&
      item.category !== ItemCategory.HeistBlueprint &&
      item.category !== ItemCategory.Sentinel &&
      item.category !== ItemCategory.MemoryLine
    )

    if (isBaseItemCandidate) {
      filters.quality = {
        value: item.quality,
        disabled: false
      }
    }
  }

  if (item.sockets?.linked) {
    filters.linkedSockets = {
      value: item.sockets.linked,
      disabled: false
    }
  }

  if (item.sockets?.white) {
    filters.whiteSockets = {
      value: item.sockets.white,
      disabled: false
    }
  }

  const forAdornedJewel = (
    item.rarity === ItemRarity.Magic &&
        // item.isCorrupted && -- let the buyer corrupt
        (item.category === ItemCategory.Jewel || item.category === ItemCategory.AbyssJewel))

  if (!item.isUnmodifiable && (
    item.rarity === ItemRarity.Normal ||
        item.rarity === ItemRarity.Magic ||
        item.rarity === ItemRarity.Rare ||
        item.rarity === ItemRarity.Unique
  )) {
    filters.corrupted = {
      value: item.isCorrupted,
      exact: forAdornedJewel
    }
  }

  if (forAdornedJewel) {
    filters.rarity = {
      value: 'magic'
    }
  } else if (
    item.rarity === ItemRarity.Normal ||
        item.rarity === ItemRarity.Magic ||
        item.rarity === ItemRarity.Rare
  ) {
    filters.rarity = {
      value: 'nonunique'
    }
  }

  if (item.isMirrored) {
    filters.mirrored = { disabled: false }
  }

  if (!item.isFractured && opts.exact) {
    filters.fractured = { value: false }
  }

  if (item.isFoil) {
    filters.foil = { disabled: false }
  }

  if (item.influences.length && item.influences.length <= 2) {
    filters.influences = item.influences.map(influence => ({
      value: influence,
      disabled: !opts.exact
    }))
  }

  if (item.itemLevel) {
    if (
      item.rarity !== ItemRarity.Unique &&
            item.category !== ItemCategory.Map &&
            item.category !== ItemCategory.Jewel && /* https://pathofexile.gamepedia.com/Jewel#Affixes */
            item.category !== ItemCategory.HeistBlueprint &&
            item.category !== ItemCategory.HeistContract &&
            item.category !== ItemCategory.MemoryLine &&
            item.category !== ItemCategory.SanctumRelic &&
            item.category !== ItemCategory.Charm &&
            item.category !== ItemCategory.Idol &&
            item.info.refName !== 'Expedition Logbook'
    ) {
      if (item.category === ItemCategory.ClusterJewel) {
        filters.itemLevel = {
          value: floorToBracket(item.itemLevel, [1, 50, 68, 75, 84]),
          max: ceilToBracket(item.itemLevel, [100, 74, 67, 49]),
          disabled: !opts.exact
        }
      } else {
        // TODO limit level by item type
        filters.itemLevel = {
          value: Math.min(item.itemLevel, 86),
          disabled: (!opts.exact || item.category === ItemCategory.Flask || item.category === ItemCategory.Tincture)
        }
      }
    }

    if (item.rarity === ItemRarity.Unique) {
      if (item.isUnidentified && item.info.refName === "Watcher's Eye") {
        filters.itemLevel = {
          value: item.itemLevel,
          disabled: false
        }
      }

      if (item.itemLevel >= 75 && [
        'Agnerod', 'Agnerod East', 'Agnerod North', 'Agnerod South', 'Agnerod West'
      ].includes(item.info.refName)) {
        // https://pathofexile.gamepedia.com/The_Vinktar_Square
        const normalizedLvl =
                    item.itemLevel >= 82 ? 82
                      : item.itemLevel >= 80 ? 80
                        : item.itemLevel >= 78 ? 78
                          : 75

        filters.itemLevel = {
          value: normalizedLvl,
          disabled: false
        }
      }
    }
  }

  if (item.isUnidentified) {
    filters.unidentified = {
      value: true,
      disabled: (item.rarity !== ItemRarity.Unique)
    }
  }

  if (item.isVeiled) {
    filters.veiled = {
      statRefs: item.statsByType
        .filter(calc => calc.type === ModifierType.Veiled)
        .map(calc => calc.stat.ref),
      disabled: false
    }

    if (item.rarity !== ItemRarity.Unique) {
      if (filters.itemLevel) {
        filters.itemLevel.disabled = false
      }
    }
  }

  return filters
}

function createGemFilters (
  item: ParsedItem,
  filters: ItemFilters,
  opts: CreateOptions
) {
  if (!item.info.gem!.transfigured) {
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: t(opts, item.info)
    }
  } else {
    const normalGem = ITEM_BY_REF('GEM', item.info.gem!.normalVariant!)![0]
    filters.searchExact = {
      baseType: item.info.name,
      baseTypeTrade: t(opts, normalGem)
    }
    filters.discriminator = {
      trade: item.info.tradeDisc!
    }
  }

  filters.corrupted = {
    value: item.isCorrupted
  }

  if (item.info.gem!.awakened) {
    filters.gemLevel = {
      value: item.gemLevel!,
      disabled: (item.gemLevel! < 5)
    }

    if (item.isCorrupted && item.quality) {
      filters.quality = {
        value: item.quality,
        disabled: (item.quality < 20)
      }
    }

    return filters
  }

  if (SPECIAL_SUPPORT_GEM.includes(item.info.refName)) {
    filters.gemLevel = {
      value: item.gemLevel!,
      disabled: (item.gemLevel! < 3)
    }

    if (item.isCorrupted && item.quality) {
      filters.quality = {
        value: item.quality,
        disabled: true
      }
    }

    return filters
  }

  if (item.quality) {
    filters.quality = {
      value: item.quality,
      disabled: (item.quality < 16)
    }
  }

  filters.gemLevel = {
    value: item.gemLevel!,
    disabled: (item.gemLevel! < 19)
  }

  return filters
}

function t (opts: CreateOptions, info: BaseType) {
  return (opts.useEn) ? info.refName : info.name
}

export function floorToBracket (value: number, brackets: readonly number[]) {
  let prev = brackets[0]
  for (const num of brackets) {
    if (num > value) {
      return prev
    } else {
      prev = num
    }
  }
  return prev
}

function ceilToBracket (value: number, brackets: readonly number[]) {
  let prev = brackets[0]
  for (const num of brackets) {
    if (num < value) {
      return prev
    } else {
      prev = num
    }
  }
  return prev
}
