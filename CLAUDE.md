# Awakened PoE Trade - Project Documentation for Claude

## Project Overview

**Awakened PoE Trade** is an Electron-based desktop application for Path of Exile players that provides advanced trading tools, price checking, and game integration features. The app runs as an overlay on top of the Path of Exile game client.

### Key Features
- **Price Checking**: Real-time item valuation using poe.ninja and poeprices.info APIs
- **Game Overlay**: Non-intrusive overlay windows that appear over the game
- **Keyboard Shortcuts**: Global hotkeys for quick actions (Ctrl+D for price check, etc.)
- **Item Parsing**: Sophisticated parsing of Path of Exile item tooltips
- **Trading Tools**: Integration with Path of Exile's trade website
- **Game Log Integration**: Reads Path of Exile's Client.txt for trade whispers
- **OCR Capabilities**: Text recognition for Heist gems and other game elements
- **Multi-language Support**: i18n with Vue I18n

## Architecture

This is a modern Electron application with a clear separation between main and renderer processes:

### 1. Main Process (`main/`)
- **Language**: TypeScript (ES2021, ESNext modules)
- **Runtime**: Electron main process (Node.js environment)
- **Build**: Custom build script with esbuild
- **Purpose**: System integration, window management, file I/O, global shortcuts

### 2. Renderer Process (`renderer/`)
- **Language**: TypeScript + Vue 3 SFC
- **Framework**: Vue 3.2.37 with Composition API
- **Build Tool**: Vite 5.x
- **Styling**: Tailwind CSS 3.x + PostCSS
- **Purpose**: User interface and game data processing

### 3. Shared (`ipc/`)
- **Purpose**: TypeScript interfaces and types shared between main and renderer
- **Contains**: IPC event definitions, configuration types

## Technology Stack

### Main Process Dependencies
- **electron**: ^33.2.1 - Electron framework
- **electron-overlay-window**: 3.3.0 - Game overlay functionality
- **uiohook-napi**: 1.5.x - Global keyboard/mouse hooks
- **ws**: ^8.16.0 - WebSocket server
- **electron-updater**: ^6.3.0 - Auto-updater functionality

### Renderer Dependencies
- **vue**: 3.2.37 - Vue.js framework
- **@vueuse/core**: ^11.0.0 - Vue composition utilities
- **vue-i18n**: ^10.0.0 - Internationalization
- **tailwindcss**: 3.x.x - CSS framework
- **apexcharts** + **vue3-apexcharts**: Chart visualization
- **luxon**: 3.x.x - Date/time handling
- **tippy.js**: ^6.2.7 - Tooltips and popovers
- **vuedraggable**: 4.1.0 - Drag and drop functionality

## Project Structure

```
awakened-poe-trade/
├── main/                          # Electron main process
│   ├── src/
│   │   ├── main.ts               # Main entry point
│   │   ├── server.ts             # HTTP/WebSocket server
│   │   ├── proxy.ts              # HTTP proxy for CORS
│   │   ├── AppTray.ts            # System tray integration
│   │   ├── AppUpdater.ts         # Auto-update logic
│   │   ├── RemoteLogger.ts       # Logging system
│   │   ├── host-files/           # File system operations
│   │   │   ├── ConfigStore.ts    # App configuration storage
│   │   │   ├── GameConfig.ts     # PoE game config reader
│   │   │   ├── GameLogWatcher.ts # Client.txt log monitoring
│   │   │   └── file-uploads.ts   # File upload handling
│   │   ├── shortcuts/            # Global hotkey system
│   │   │   ├── Shortcuts.ts      # Hotkey management
│   │   │   ├── HostClipboard.ts  # Clipboard operations
│   │   │   └── text-box.ts       # Text input handling
│   │   ├── vision/               # OCR and image processing
│   │   │   ├── HeistGemFinder.ts # Heist gem OCR
│   │   │   ├── wasm-bindings.ts  # WASM integration
│   │   │   └── link-*.ts         # Worker communication
│   │   └── windowing/            # Window management
│   │       ├── GameWindow.ts     # PoE game window detection
│   │       ├── OverlayWindow.ts  # Overlay window management
│   │       ├── OverlayVisibility.ts # Show/hide logic
│   │       └── WidgetAreaTracker.ts # Widget positioning
│   ├── package.json
│   ├── tsconfig.json
│   └── electron-builder.yml      # Build configuration
│
├── renderer/                      # Vue.js frontend
│   ├── src/
│   │   ├── main.ts               # Vue app entry point
│   │   ├── assets/               # Static assets and data
│   │   │   ├── data/             # Game data interfaces
│   │   │   ├── font/             # Font files
│   │   │   └── make-index-files.mjs # Build script
│   │   ├── parser/               # Item parsing engine
│   │   │   ├── Parser.ts         # Main parser class
│   │   │   ├── ParsedItem.ts     # Parsed item representation
│   │   │   ├── modifiers.ts      # Item modifier parsing
│   │   │   ├── stat-translations.ts # Game stat translations
│   │   │   └── magic-name.ts     # Magic item name resolution
│   │   └── web/                  # Vue components and logic
│   │       ├── App.vue           # Root component
│   │       ├── Config.ts         # Configuration management
│   │       ├── i18n.ts           # Internationalization setup
│   │       ├── ui/               # Reusable UI components
│   │       │   ├── AppTitlebar.vue
│   │       │   ├── UiCheckbox.vue
│   │       │   ├── UiToggle.vue
│   │       │   ├── Popover.vue
│   │       │   └── VirtualScroll.vue
│   │       ├── overlay/          # Overlay system
│   │       │   ├── OverlayWindow.vue
│   │       │   ├── Widget.vue
│   │       │   ├── widget-registry.ts
│   │       │   └── WidgetDelveGrid.vue
│   │       ├── price-check/      # Price checking feature
│   │       │   ├── PriceCheckWindow.vue
│   │       │   ├── CheckedItem.vue
│   │       │   ├── filters/      # Search filters
│   │       │   ├── trade/        # Trade API integration
│   │       │   ├── trends/       # Price trend analysis
│   │       │   └── related-items/ # Similar item suggestions
│   │       ├── settings/         # Settings UI
│   │       │   ├── SettingsWindow.vue
│   │       │   ├── hotkeys.vue
│   │       │   ├── general.vue
│   │       │   └── debug.vue
│   │       ├── item-search/      # Item search functionality
│   │       ├── stash-search/     # Stash tab search
│   │       ├── map-check/        # Map mod checking
│   │       ├── stopwatch/        # Timer widgets
│   │       └── background/       # Background services
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.mts           # Vite configuration
│   ├── tailwind.config.js        # Tailwind CSS config
│   └── index.html                # HTML entry point
│
├── ipc/                          # Shared IPC definitions
│   ├── types.ts                  # Event and data types
│   └── KeyToCode.ts             # Keyboard key mappings
│
├── docs/                         # Documentation (VitePress)
│   ├── quick-start.md
│   ├── faq.md
│   ├── ocr-guide.md
│   └── chat-commands.md
│
├── README.md
├── DEVELOPING.md                 # Development instructions
└── awakened-poe-trade.code-workspace # VS Code workspace
```

## Development Workflow

### Prerequisites
- Node.js (compatible with both main and renderer)
- Yarn package manager
- Path of Exile game client (for testing)

### Development Commands
```bash
# Start renderer development server
cd renderer
yarn install
yarn make-index-files  # Generate asset indices
yarn dev               # Starts Vite dev server on localhost:5173

# Start main process (in separate terminal)
cd main
yarn install
yarn dev               # Starts Electron main process

# Build for production
cd renderer
yarn build            # Build renderer with Vite

cd ../main
yarn build            # Build main with TypeScript + esbuild
yarn package          # Create distributables with electron-builder
```

## Key Technical Features

### 1. Game Integration
- **Window Detection**: Detects Path of Exile game window for overlay positioning
- **Log File Monitoring**: Watches `Client.txt` for trade whispers and game events
- **Configuration Reading**: Parses PoE's configuration files for game settings
- **Global Hotkeys**: System-wide keyboard shortcuts using uiohook-napi

### 2. Overlay System
- **Transparent Overlays**: Uses electron-overlay-window for game overlays
- **Widget System**: Modular widgets that can be positioned anywhere on screen
- **Auto-hide Logic**: Smart visibility management based on game focus

### 3. Item Analysis
- **Advanced Parser**: Sophisticated item tooltip parsing for all item types
- **Modifier Recognition**: Identifies and categorizes item modifiers
- **Quality Calculations**: Handles quality variations and tier calculations
- **Unique Item Detection**: Special handling for unique items and their variants

### 4. Price Checking
- **Multiple APIs**: Integration with poe.ninja and poeprices.info
- **Search Filtering**: Advanced filters for finding comparable items
- **Trend Analysis**: Historical price data and trend visualization
- **Bulk Pricing**: Special handling for currency and fragment pricing

### 5. Communication Architecture
- **IPC Events**: Well-defined event system between main and renderer
- **WebSocket Server**: Internal WebSocket server for real-time communication
- **HTTP Proxy**: CORS proxy for external API requests
- **Comlink**: Web Worker communication for heavy computations

## Configuration

### Main Process Config
- **Build Target**: ES2021, ESNext modules
- **Output**: `dist/main.js`
- **External Dependencies**: Electron runtime modules

### Renderer Config  
- **Build Target**: ESNext for modern Chromium
- **Module Resolution**: Node.js style with path aliases
- **Aliases**: `@/*` → `./src/*`, `@ipc/*` → `../ipc/*`
- **Output**: Static bundle in `dist/`

### IPC Communication
The app uses a structured event system defined in `ipc/types.ts`:
- **CLIENT→MAIN** events: Renderer to main process
- **MAIN→CLIENT** events: Main to renderer process
- **Host config updates**: Configuration synchronization
- **Shortcut actions**: Hotkey event definitions

## Browser Targets
- **Chromium**: Version 101+ (Electron's bundled Chromium)
- **No legacy support**: Modern ES features are used throughout

## Key Dependencies Explained

### Main Process
- **uiohook-napi**: Provides global keyboard/mouse hooks for hotkeys
- **electron-overlay-window**: Enables transparent overlays over games
- **ws**: WebSocket server for real-time communication

### Renderer Process
- **Vue 3**: Modern reactive framework with Composition API
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first CSS framework
- **ApexCharts**: Professional charting library for price trends
- **Luxon**: Modern date/time library (successor to Moment.js)

## Common Development Tasks

### Adding New Features
1. **IPC Events**: Define types in `ipc/types.ts`
2. **Main Process**: Add logic in appropriate `main/src/` module
3. **Renderer**: Create Vue components in `renderer/src/web/`
4. **Integration**: Wire up IPC communication

### Adding UI Components
1. **Create**: New `.vue` files in appropriate `web/` subdirectory
2. **Style**: Use Tailwind CSS classes + PostCSS nesting
3. **Composition**: Use Vue 3 Composition API patterns
4. **i18n**: Add translations to language files

### Adding Game Data
1. **Interfaces**: Define in `renderer/src/assets/data/interfaces.ts`
2. **Data Files**: Add to `renderer/src/assets/data/`
3. **Index Generation**: Run `yarn make-index-files`

## Building and Distribution

### Electron Builder Configuration
- **Windows**: NSIS installer + portable executable
- **Linux**: AppImage format
- **macOS**: DMG with universal binary (x64 + ARM64)
- **Auto-updater**: GitHub releases integration

### Build Artifacts
- **Main**: Single `main.js` file with bundled dependencies
- **Renderer**: Static HTML/CSS/JS bundle
- **Vision**: Separate `vision.js` worker for OCR operations

This project represents a sophisticated desktop application combining modern web technologies (Vue 3, TypeScript, Vite) with native system integration (Electron, global hotkeys, overlay windows) specifically tailored for Path of Exile gameplay enhancement.
