// Default settings shared by install, reset command and options page
const DEFAULT_VIDEO_SETTINGS = {
  brightness: 100, contrast: 100, saturation: 100,
  sharpness: 0, hue: 0, grayscale: 0,
  invert: 0, sepia: 0, blur: 0,
  opacity: 100, vignette: 0, temperature: 0,
  speed: 100
};

const DEFAULT_AUDIO_SETTINGS = {
  volume: 100, bass: 0, pan: 0,
  reverb: false, reverbLevel: 30,
  delay: false, delayLevel: 30,
  stereoReverse: false,
  equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

const DEFAULT_SETTINGS = {
  videoSettings: DEFAULT_VIDEO_SETTINGS,
  audioSettings: DEFAULT_AUDIO_SETTINGS,
  enabled: true,
  lastPreset: 'default',
  reverbQuality: 'medium',
  uiTheme: 'dark',
  showTooltips: true,
  language: 'auto'
};

// Set default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, (settings) => {
    if (!settings.videoSettings || !settings.audioSettings) {
      chrome.storage.sync.set(DEFAULT_SETTINGS);
    }
  });
});

// Sends a message to a tab, ignoring tabs that have no content script
function sendToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, () => {
    void chrome.runtime.lastError;
  });
}

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    chrome.storage.sync.get(['videoSettings', 'audioSettings', 'enabled', 'reverbQuality'], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (request.action === "applySettings") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        sendToTab(tabs[0].id, {
          action: "applySettings",
          settings: request.settings
        });
      }
    });
  }
});

// Sync settings across tabs
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;

  const relevant = ['videoSettings', 'audioSettings', 'enabled', 'reverbQuality'];
  if (!relevant.some((key) => key in changes)) return;

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        sendToTab(tab.id, {
          action: "applySettings",
          settings: {
            videoSettings: changes.videoSettings?.newValue,
            audioSettings: changes.audioSettings?.newValue,
            enabled: changes.enabled?.newValue,
            reverbQuality: changes.reverbQuality?.newValue
          }
        });
      }
    });
  });
});

// Keyboard shortcuts (defined in manifest "commands")
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-extension') {
    chrome.storage.sync.get(['enabled'], (data) => {
      chrome.storage.sync.set({ enabled: data.enabled === false });
    });
  }

  if (command === 'reset-settings') {
    chrome.storage.sync.set({
      videoSettings: DEFAULT_VIDEO_SETTINGS,
      audioSettings: DEFAULT_AUDIO_SETTINGS,
      lastPreset: 'default'
    });
  }
});
