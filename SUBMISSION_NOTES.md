# Chrome Web Store Submission Notes

## Privacy Policy

- Privacy policy URL: <https://jagroopnatt.github.io/wordpeek/privacy-policy.html>
- Data policy summary:
  - WordPeek does not collect, sell, or share personal data.
  - Only user-selected words are sent to `https://api.dictionaryapi.dev` to fetch definitions.
  - No personal information is stored locally, except basic ON/OFF extension state.

## Store Listing Text

- Short description:
  - `Instantly see dictionary meanings when you select a word on any webpage.`
- Long description:
  - `WordPeek helps you understand words without leaving the page.`
  - `Select any English word on a website and WordPeek opens a clean popup with definition details.`
  - `Features include instant meaning on text selection, phonetic text, part of speech, example sentence (when available), optional audio pronunciation, and a simple ON/OFF toggle.`

## Screenshots

- Upload at least 3 screenshots.
- Recommended size: `1280 x 800` PNG.
- Include:
  - ON state with selected word and popup visible.
  - Popup details (phonetic, part of speech, example, audio icon).
  - OFF state (selected word, no popup).

## Permissions Justification (Privacy Tab)

- `storage`: saves ON/OFF state.
- `tabs`: refreshes tabs after install/update so content script activation is consistent.
- `https://api.dictionaryapi.dev/*`: dictionary lookup requests for selected words.

## Notes for Reviewer

WordPeek shows dictionary definitions when a user selects a word on a webpage.
The extension sends only the selected word to `https://api.dictionaryapi.dev` to fetch meaning, phonetic, part of speech, example, and optional audio.
No personal data is collected, sold, or shared.
Only basic local extension state (ON/OFF) is stored using `chrome.storage`.
`tabs` permission is used to refresh open tabs after install/update so content script activation is consistent.
Users can disable functionality anytime using the toolbar toggle.

## Ready-to-Upload Checklist

- Privacy Policy page is live and publicly accessible.
- 2-3 screenshots uploaded.
- Store listing and Privacy tab completed.
- Zip package has `manifest.json` at the root.
- Extension uploaded in Chrome Developer Dashboard.
