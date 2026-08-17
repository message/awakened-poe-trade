import type { Widget, Anchor } from '../overlay/widgets.js'

export interface GemCorruptionWidget extends Widget {
  anchor: Anchor
  includeTransfigured: boolean
  includeAwakened: boolean
  includeUnconfirmed: boolean
  minProfitMultiple: number
}
