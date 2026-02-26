// background.js - Service Worker for WordPeek Toggle

// Initialize storage on install and always sync action state after install/update.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({ enabled: true });
  }
  await syncActionState();
  await reloadWebTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncActionState();
});

// Keep title/icon correct after service worker restarts/reloads.
syncActionState().catch(() => {
  // No-op fallback: state will sync on next lifecycle event.
});

async function syncActionState() {
  const result = await chrome.storage.local.get('enabled');
  const enabled = result.enabled ?? true;
  updateActionTitle(enabled);
  updateActionBadge(enabled);
  updateActionIcon(enabled);
}

function updateActionTitle(enabled) {
  chrome.action.setTitle({
    title: enabled
      ? 'WordPeek - Enabled (Click to Disable)'
      : 'WordPeek - Disabled (Click to Enable)'
  });
}

function updateActionBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({
    color: enabled ? '#0B5FFF' : '#6B7280'
  });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

function updateActionIcon(enabled) {
  const path = enabled
    ? {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png'
      }
    : {
        16: 'icons/icon16grey.png',
        48: 'icons/icon48grey.png',
        128: 'icons/icon128.png'
      };

  chrome.action.setIcon({ path });
}

chrome.action.onClicked.addListener(async () => {
  const result = await chrome.storage.local.get('enabled');
  const newState = !(result.enabled ?? true);

  await chrome.storage.local.set({ enabled: newState });
  updateActionTitle(newState);
  updateActionBadge(newState);
  updateActionIcon(newState);
  // No need to send messages; storage.onChanged updates content scripts.
});

async function reloadWebTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const reloadJobs = tabs
      .filter((tab) => typeof tab.id === 'number' && /^https?:\/\//.test(tab.url || ''))
      .map((tab) => chrome.tabs.reload(tab.id));
    await Promise.allSettled(reloadJobs);
  } catch (_) {
    // Best-effort cleanup only.
  }
}
