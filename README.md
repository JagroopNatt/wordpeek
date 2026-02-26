# WordPeek - Hover Dictionary

WordPeek is a Chrome extension that shows instant dictionary definitions when you select a word on any webpage.

## Features

- Select a word to see a popup definition.
- Shows phonetic text, part of speech, and example (when available).
- Optional pronunciation audio button.
- Toggle extension ON/OFF from the toolbar icon.
- Robust popup cleanup and request cancellation to avoid stale results.

## Tech Stack

- Manifest V3 Chrome extension
- Content script (`content.js`)
- Background service worker (`background.js`)
- Styling via `styles.css`
- Dictionary API: <https://api.dictionaryapi.dev>

## Project Structure

- `manifest.json` - Extension config, permissions, scripts, and assets
- `background.js` - Toolbar toggle state, badge/icon updates, startup/install sync
- `content.js` - Selection handling, popup rendering, dictionary fetch logic
- `styles.css` - Popup UI styles
- `icons/` - Extension and toggle icons

## Installation (Local)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder (`wordpeek`).

## Usage

1. Open any webpage.
2. Select a word.
3. WordPeek displays meaning details in a popup near the selection.
4. Click the extension icon to toggle WordPeek ON/OFF.

## Permissions Used

- `storage`: saves enabled/disabled state.
- `tabs`: reloads open web tabs after install/update for clean activation.
- `host_permissions` for `https://api.dictionaryapi.dev/*`: fetches definitions.

## Notes

- Works best with single English words.
- Requires internet access for dictionary lookups.

## License

Add your preferred license here (for example, MIT).
