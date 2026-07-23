# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Awakened PoE Trade is an Electron-based overlay tool for Path of Exile that provides price checking, item search, and trade functionality. The application consists of two main parts that run together:

1. **main**: Electron app handling keyboard shortcuts, overlays, and system integration
2. **renderer**: Vue.js-based UI running inside Electron

Both parts are interdependent and communicate via WebSocket through a local HTTP server.

## Development Commands

### Initial Setup
```bash
# From renderer directory
cd renderer
yarn install
yarn make-index-files  # Must run before dev or build - generates binary index files
yarn dev

# In a second shell - from main directory
cd main
yarn install
yarn dev
```

### Building
```bash
# From renderer directory
cd renderer
yarn build

# From main directory
cd main
yarn build

# Package with code signing (optional)
CSC_NAME="Certificate name in Keychain" yarn package
```

### Other Commands
```bash
# Type checking (renderer)
vue-tsc --noEmit

# Linting (renderer)
yarn lint
```

## Architecture

### Communication: IPC Event System

The app uses a WebSocket-based IPC (Inter-Process Communication) system defined in `/ipc/types.ts`. Events follow the pattern `SOURCE->DESTINATION::event-name`:

- **MAIN->OVERLAY**: Events from main process to overlay window
- **MAIN->CLIENT**: Events broadcasted to renderer clients
- **CLIENT->MAIN**: Events from renderer to main process
- **OVERLAY->MAIN**: Overlay-specific events to main process

Key communication pattern:
1. Main process runs HTTP server (see `main/src/server.ts`)
2. Renderer connects via WebSocket at `/events`
3. Events are serialized as JSON and sent over WebSocket
4. Server tracks `lastActiveClient` for targeted messaging

### Data Management

#### Asset Processing
Before building or running dev, `yarn make-index-files` must be run to generate binary index files from NDJSON data:

- **Input**: `public/data/{lang}/stats.ndjson` and `items.ndjson` files
- **Output**: Binary `.index.bin` files using FNV-1a hashing for fast lookups
- **Languages**: en, ru, cmn-Hant, ko
- **Purpose**: Enables fast item and stat lookups via hash-based binary search

#### Item Parsing
The parser (`renderer/src/parser/`) handles Path of Exile item text:

- `Parser.ts`: Main parser converting clipboard text to structured data
- `ParsedItem.ts`: Type definitions for parsed items
- `stat-translations.ts`: Maps game stats to trade API filters
- `modifiers.ts`: Handles mod identification and ranges

### UI Architecture: Widget System

The renderer uses a widget-based overlay system (`renderer/src/web/overlay/`):

- **Widget lifecycle**: Defined by `wmWants` ('show' | 'hide') and `wmZorder` (number | 'exclusive' | null)
- **Widget registry**: `widget-registry.ts` maintains all available widget types
- **Widget specs**: Each widget type has a spec defining instances ('single' | 'multi')
- **Exclusive widgets**: `wmZorder: 'exclusive'` prevents config saves when visible

Main widget types:
- `PriceCheckWidget`: Price checking overlay (src/web/price-check/)
- `ItemSearchWidget`: Advanced item search (src/web/item-search/)
- `StashSearchWidget`: Stash search functionality (src/web/stash-search/)
- `WidgetMenu`: Overlay menu system

### Configuration System

Configuration is managed through `renderer/src/web/Config.ts`:

- Stored as JSON via `ConfigStore` (main/src/host-files/ConfigStore.ts)
- Deep reactive via Vue's `reactive()`
- Auto-saves on changes unless exclusive widget is visible
- Synced between main and renderer via IPC events
- Host-specific config (shortcuts, overlay key) sent separately

### Shortcuts & Input Handling

Main process uses `uiohook-napi` for global keyboard hooks (`main/src/shortcuts/Shortcuts.ts`):

- **Actions**: Defined in `ShortcutAction` type (ipc/types.ts)
  - `copy-item`: Copy item under cursor and optionally show overlay
  - `stash-search`: Trigger stash search with text
  - `paste-in-chat`: Send text to game chat
  - `toggle-overlay`: Show/hide overlay
  - `ocr-text`: OCR for specific targets (e.g., heist-gems)

- **HostClipboard**: Handles clipboard save/restore when `restoreClipboard` enabled

### Game Integration

- **GameWindow** (`main/src/windowing/GameWindow.ts`): Tracks PoE window state
- **OverlayWindow** (`main/src/windowing/OverlayWindow.ts`): Manages overlay using `electron-overlay-window`
- **GameLogWatcher** (`main/src/host-files/GameLogWatcher.ts`): Monitors Client.txt for game events
- **GameConfig** (`main/src/host-files/GameConfig.ts`): Reads production_Config.ini

## Path Aliases

Both main and renderer use TypeScript path aliases:

```typescript
// Renderer (tsconfig.json)
"@/*" -> "./src/*"
"@ipc/*" -> "../ipc/*"

// Vite also configured with same aliases
```

## Key Files to Know

- `/ipc/types.ts`: Central type definitions for IPC communication
- `renderer/src/web/Config.ts`: Configuration management and persistence
- `renderer/src/parser/Parser.ts`: Item text parsing logic
- `main/src/server.ts`: WebSocket server and event bus
- `main/src/main.ts`: Application entry point and initialization
- `renderer/src/web/overlay/widgets.ts`: Widget type definitions

## Build System

- **Renderer**: Vite + Vue 3 + TypeScript
  - Target: `esnext` (Chrome 101+)
  - Dev server proxies `/config`, `/uploads`, `/proxy` to localhost:8584
- **Main**: esbuild via custom build script (`main/build/script.mjs`)
  - Electron 39.2.0
  - Uses `electron-builder` for packaging

## Working with Filters

Trade search filters are in `renderer/src/web/price-check/filters/`:
- Each filter type handles specific item properties
- Filters generate trade API queries
- Filter UI components are Vue SFCs
- Stat filters use translations from `stat-translations.ts`

## Testing Notes

- No formal test suite currently exists
- Manual testing requires running both main and renderer
- Test in Path of Exile for full functionality
- CI workflow at `.github/workflows/main.yml` provides build validation
