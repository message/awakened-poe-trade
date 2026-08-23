import { BaseType, ITEM_BY_REF, ITEMS_ITERATOR } from '@/assets/data'

interface PriceQuery {
  ns: string
  name: string
  variant: string | undefined
}

export interface PriceLookup {
  findPriceByQuery: (query: PriceQuery) => { chaos: number } | null
}

export interface CorruptionBreakdown {
  baseNoQuality?: number
  baseFullQuality?: number
  corruptedSame?: number
  corruptedLevelUp?: number
  corruptedLevelDown?: number
  corruptedQualityUp?: number
  corruptedQualityDown?: number
  vaalTransform?: number
}

export interface CorruptionResult {
  gem: BaseType
  baselineCost: number
  viaGemcutter: boolean
  sellPrice: number
  profit: number
  profitMargin: number
  vaalOrbPrice: number
  gemcutterPrism?: number
  breakdown: CorruptionBreakdown
  missing: string[]
}

export function * gemCorruptionCandidates (): Generator<BaseType> {
  for (const item of ITEMS_ITERATOR('"namespace":"GEM"')) {
    if (item.gem && !item.gem.vaal) {
      yield item
    }
  }
}

export function computeCorruptionEv (gem: BaseType, prices: PriceLookup): CorruptionResult | null {
  const { findPriceByQuery } = prices
  const baseLevel = gem.gem!.maxLevel

  const price = (ns: string, name: string, variant: string | undefined) =>
    findPriceByQuery({ ns, name, variant })?.chaos

  const baseNoQuality = price('GEM', gem.refName, `${baseLevel}`)
  const baseFullQuality = price('GEM', gem.refName, `${baseLevel}/20`)

  // poe.ninja's dense endpoint exposes no listing-count/confidence signal, so a variant
  // with near-zero listings can report a single wild outlier ask as its price (seen
  // firsthand: a 21/23c fallback priced at 3441 chaos against a 73 chaos base gem). None
  // of these corrupted variants are a fundamentally different item from the base gem -
  // they're the same gem with a minor buff - so a price wildly out of proportion to the
  // base gem's own (comparatively liquid) price is almost certainly such an outlier
  // rather than a real premium. Reject anything past a generous multiple instead of
  // trusting it outright.
  const MAX_PRICE_MULTIPLE = 8
  const sane = (value: number | undefined) =>
    (value !== undefined && baseFullQuality !== undefined && value > baseFullQuality * MAX_PRICE_MULTIPLE)
      ? undefined
      : value

  // poe.ninja's variant strings normally carry a quality tier ("4/20c"), but for
  // low-liquidity gems - Awakened supports, Empower/Enlighten - it collapses to a bare
  // level ("4c") with no quality tier at all. Without this fallback every one of those
  // gems reads as having no listing and gets dropped entirely (see the null-return below),
  // regardless of includeAwakened - so try the bare form whenever the quality-tagged one
  // isn't found.
  const corruptedSame = sane(
    price('GEM', gem.refName, `${baseLevel}/20c`) ??
    price('GEM', gem.refName, `${baseLevel}c`)
  )
  const corruptedLevelUp = sane(
    price('GEM', gem.refName, `${baseLevel + 1}/20c`) ??
    price('GEM', gem.refName, `${baseLevel + 1}c`)
  )
  // a Vaal Orb on a gem can just as easily drop its level by 1 as raise it - real
  // listings for this are rare (nobody sells a downgrade on purpose) but worth trying.
  const corruptedLevelDown = baseLevel > 1
    ? sane(
        price('GEM', gem.refName, `${baseLevel - 1}/20c`) ??
        price('GEM', gem.refName, `${baseLevel - 1}c`)
      )
    : undefined
  const corruptedQualityUp = sane(
    price('GEM', gem.refName, `${baseLevel}/23c`) ??
    price('GEM', gem.refName, `${baseLevel}/22c`) ??
    price('GEM', gem.refName, `${baseLevel}/21c`)
  )
  // quality can also drop by a random amount instead of rising - the result lands
  // anywhere in a wide, unpredictable range (0-19%), so there's no single poe.ninja
  // variant that represents it and essentially no one lists a botched-quality corrupted
  // gem anyway. Left unpriced (and excluded from `missing`, since this isn't a data
  // reliability gap - it's structurally unpriceable) and weighted at 0 in the EV below.
  const corruptedQualityDown: number | undefined = undefined

  const transformGem = ITEM_BY_REF('GEM', `Vaal ${gem.refName}`)?.[0]
  const vaalTransform = transformGem
    ? price('GEM', transformGem.refName, `${transformGem.gem!.maxLevel}c`)
    : undefined

  const gemcutterPrism = price('ITEM', "Gemcutter's Prism", undefined)
  const vaalOrbPrice = price('ITEM', 'Vaal Orb', undefined)

  const craftCost = (baseNoQuality !== undefined && gemcutterPrism !== undefined)
    ? baseNoQuality + 20 * gemcutterPrism
    : undefined

  const baselineCost =
    craftCost !== undefined && baseFullQuality !== undefined
      ? Math.min(craftCost, baseFullQuality)
      : (craftCost ?? baseFullQuality)

  // whether baselineCost came from crafting (0% quality gem + 20x Gemcutter's Prism)
  // rather than buying a 20/20 gem outright - only true when craftCost was actually the
  // cheaper (or only available) option.
  const viaGemcutter =
    craftCost !== undefined &&
    (baseFullQuality === undefined || craftCost <= baseFullQuality)

  // we only care about hitting the level-up outcome specifically, not a blend across
  // all 6 possible corruption rolls - the other outcomes (stays same, quality up/down,
  // level down, vaal transform) are ones you'd hold onto or corrupt again, not the sale
  // being targeted here. Without a trustworthy price for the level-up variant there's
  // nothing to evaluate this gem on, so exclude it from the list.
  if (baselineCost === undefined || vaalOrbPrice === undefined || corruptedLevelUp === undefined) {
    return null
  }

  const breakdown: CorruptionBreakdown = {
    baseNoQuality, baseFullQuality, corruptedSame, corruptedLevelUp, corruptedLevelDown, corruptedQualityUp, corruptedQualityDown, vaalTransform
  }
  // corruptedQualityDown is never fetched (see above) - its absence isn't a data
  // reliability gap, so it shouldn't flag a row as unreliable on its own.
  // vaalTransform only counts as missing when this gem actually has a Vaal variant to
  // transform into - most gems don't, and for those `transformGem` is undefined, which
  // is a normal, expected state, not missing price data.
  const missing = (Object.keys(breakdown) as Array<keyof CorruptionBreakdown>)
    .filter(key => key !== 'corruptedQualityDown' && key !== 'vaalTransform' && breakdown[key] === undefined)
  if (transformGem && vaalTransform === undefined) {
    missing.push('vaalTransform')
  }

  const sellPrice = corruptedLevelUp
  const profit = sellPrice - baselineCost - vaalOrbPrice
  // lets a level-3-max gem going to level 4 (a huge relative jump) rank above a
  // level-20-max gem going to level 21 (a small relative jump) even when their raw
  // chaos profit is similar - profit alone favors expensive gems regardless of how
  // cheap it was to get there.
  const profitMargin = profit / baselineCost

  return { gem, baselineCost, viaGemcutter, sellPrice, profit, profitMargin, vaalOrbPrice, gemcutterPrism, breakdown, missing }
}
