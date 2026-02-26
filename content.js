// WordPeek v2.1 - Fixed race condition + robust Wikipedia support
let popup = null;
let currentWord = '';
let activeFetchController = null;
let isEnabled = true;
let selectionTimeoutId = null;

function isContextValid() {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime && chrome.runtime.id);
  } catch (_) {
    return false;
  }
}

function isContextInvalidatedError(err) {
  const message = String(err?.message || err || '');
  return message.includes('Extension context invalidated');
}

function initStorageSync() {
  if (!isContextValid()) return;
  try {
    chrome.storage.local.get('enabled', (result) => {
      if (!isContextValid()) return;
      isEnabled = result.enabled ?? true;
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (!isContextValid()) return;
      if (area === 'local' && changes.enabled) {
        isEnabled = changes.enabled.newValue ?? true;
        if (!isEnabled) removePopup();
      }
    });
  } catch (err) {
    if (!isContextInvalidatedError(err)) throw err;
  }
}

initStorageSync();

// ─── Popup Removal ───────────────────────────────────────────
function removePopup() {
  if (selectionTimeoutId) {
    clearTimeout(selectionTimeoutId);
    selectionTimeoutId = null;
  }
  if (popup) {
    popup.remove();
    popup = null;
  }
  currentWord = '';
  if (activeFetchController) {
    activeFetchController.abort();
    activeFetchController = null;
  }
}

function normalizeSelectedWord(raw) {
  if (!raw) return '';

  // Keep letters (including accented letters), apostrophes and hyphens.
  let word = raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}'-]+/gu, ' ')
    .trim();

  // Dictionary API works best with a single token.
  if (word.includes(' ')) word = word.split(/\s+/)[0];

  // Remove leading/trailing separators from copy artifacts.
  word = word.replace(/^['-]+|['-]+$/g, '');

  if (word.length < 2 || word.length > 45) return '';
  return word;
}

// ─── Build Popup DOM ─────────────────────────────────────────
function createPopup(word) {
  const el = document.createElement('div');
  el.className = 'wordpeek-popup';

  const header = document.createElement('div');
  header.className = 'wordpeek-header';

  const titleSpan = document.createElement('span');
  titleSpan.textContent = 'WordPeek';
  header.appendChild(titleSpan);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.className = 'wordpeek-close';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removePopup();
  });
  header.appendChild(closeBtn);
  el.appendChild(header);

  const body = document.createElement('div');
  body.className = 'wordpeek-body';

  const wordEl = document.createElement('div');
  wordEl.className = 'wordpeek-word';
  wordEl.textContent = word;
  body.appendChild(wordEl);

  const phoneticEl = document.createElement('div');
  phoneticEl.className = 'wordpeek-phonetic';
  phoneticEl.textContent = 'Loading...';
  body.appendChild(phoneticEl);

  const posEl = document.createElement('div');
  posEl.className = 'wordpeek-pos';
  body.appendChild(posEl);

  const defEl = document.createElement('div');
  defEl.className = 'wordpeek-def';
  defEl.textContent = 'Fetching definition...';
  body.appendChild(defEl);

  el.appendChild(body);
  return { el, body, phoneticEl, posEl, defEl };
}

// ─── Position Popup ──────────────────────────────────────────
function positionPopup(popupEl, x, y) {
  popupEl.style.left = '-9999px';
  popupEl.style.top = '-9999px';
  document.body.appendChild(popupEl);

  const pw = popupEl.offsetWidth || 300;
  const ph = popupEl.offsetHeight || 180;

  let left = x + 15;
  let top = y + 15;

  if (left + pw > window.innerWidth - 20) left = x - pw - 15;
  if (top + ph > window.innerHeight - 20) top = y - ph - 15;

  popupEl.style.left = Math.max(10, left) + 'px';
  popupEl.style.top = Math.max(10, top) + 'px';
}

// ─── Show Popup with Definition ──────────────────────────────
async function showPopup(word, x, y) {
  if (!isContextValid()) return;
  if (!isEnabled) return;
  if (word === currentWord && popup) return;

  let controller = null;
  let body;
  let phoneticEl;
  let posEl;
  let defEl;

  try {
    // Cleanup previous (prevents race)
    removePopup();

    currentWord = word;

    const popupParts = createPopup(word);
    popup = popupParts.el;
    ({ body, phoneticEl, posEl, defEl } = popupParts);
    positionPopup(popup, x, y);

    controller = new AbortController();
    activeFetchController = controller;

    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal }
    );

    // Stale content-script instance can keep running after extension reload.
    if (!isContextValid()) return;

    // Race check: another request already started
    if (activeFetchController !== controller) return;

    if (!res.ok) {
      if (res.status === 404) throw new Error('Word not found');
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (activeFetchController !== controller) return;

    if (!Array.isArray(data) || !data[0]) throw new Error('Bad response');

    const entry = data[0];
    const meaning = Array.isArray(entry.meanings)
      ? entry.meanings.find((m) => m?.definitions?.length)
      : null;
    if (!meaning?.definitions?.[0]) throw new Error('No definition found');

    const definition = meaning.definitions[0].definition;
    const example = meaning.definitions[0].example || '';
    const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';

    const audioObj = entry.phonetics?.find(
      (p) =>
        typeof p?.audio === 'string' &&
        (p.audio.startsWith('https://') || p.audio.startsWith('http://'))
    );
    const audioUrl = audioObj?.audio || '';

    phoneticEl.textContent = phonetic || '';

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      const btn = document.createElement('button');
      btn.textContent = '🔊';
      btn.className = 'wordpeek-audio';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.currentTime = 0;
        audio.play().catch(() => { });
      });
      phoneticEl.appendChild(btn);
    }

    posEl.textContent = meaning.partOfSpeech || '';
    defEl.textContent = definition;

    if (example) {
      const exDiv = document.createElement('div');
      exDiv.className = 'wordpeek-example';
      exDiv.textContent = `"${example}"`;
      body.appendChild(exDiv);
    }
  } catch (err) {
    if (err?.name === 'AbortError' || activeFetchController !== controller) return;
    if (isContextInvalidatedError(err) || !isContextValid()) return;

    console.error('WordPeek Error for "' + word + '":', err);

    const message = String(err?.message || err || '').toLowerCase();
    let msg = 'No definition found 😕';
    if (message.includes('not found') || message.includes('404')) {
      msg = 'Word not found in dictionary 😕';
    } else if (message.includes('http') || message.includes('fetch')) {
      msg = 'Could not connect to dictionary. Check internet.';
    }
    if (defEl) {
      defEl.textContent = msg;
      defEl.classList.add('wordpeek-error');
    }
  } finally {
    if (activeFetchController === controller) activeFetchController = null;
  }
}

// ─── TRIGGER: mouseup on selected text ───────────────────────
document.addEventListener('mouseup', (e) => {
  if (popup && popup.contains(e.target)) return;

  if (!isEnabled) {
    removePopup();
    return;
  }

  const clickX = e.clientX;
  const clickY = e.clientY;

  if (selectionTimeoutId) clearTimeout(selectionTimeoutId);
  selectionTimeoutId = setTimeout(() => {
    selectionTimeoutId = null;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      removePopup();
      return;
    }

    const word = normalizeSelectedWord(selection.toString());
    if (!word) {
      removePopup();
      return;
    }

    showPopup(word, clickX, clickY);
  }, 10);
});

// ─── Close handlers ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') removePopup();
});

document.addEventListener('mousedown', (e) => {
  if (popup && !popup.contains(e.target)) removePopup();
});

window.addEventListener('popstate', removePopup);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) removePopup();
});
