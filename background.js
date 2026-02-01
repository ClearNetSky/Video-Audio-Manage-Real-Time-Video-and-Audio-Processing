// Set default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, (settings) => {
    const defaults = {
      videoSettings: {
        brightness: 100, contrast: 100, saturation: 100,
        sharpness: 0, hue: 0, grayscale: 0,
        invert: 0, sepia: 0, blur: 0,
        opacity: 100, vignette: 0, temperature: 0
      },
      audioSettings: {
        volume: 100, bass: 0, pan: 0,
        reverb: false, reverbLevel: 30,
        delay: false, delayLevel: 30,
        stereoReverse: false,
        equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      enabled: true,
      lastPreset: 'default',
      processingMode: 'auto',
      maxAudioChannels: 2,
      disableForBackgroundTabs: true,
      toggleShortcut: 'Ctrl+Shift+V',
      resetShortcut: 'Ctrl+Shift+R',
      reverbQuality: 'medium',
      uiTheme: 'dark',
      showTooltips: true,
      language: chrome.i18n.getUILanguage()
    };

    if (!settings.videoSettings || !settings.audioSettings) {
      chrome.storage.sync.set(defaults);
    }
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    chrome.storage.sync.get(['videoSettings', 'audioSettings', 'enabled'], (data) => {
      sendResponse(data);
    });
    return true;
  }
  
  if (request.action === "applySettings") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "applySettings",
          settings: request.settings
        });
      }
    });
  }
});

// Sync settings across tabs
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.videoSettings || changes.audioSettings || changes.enabled)) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: "applySettings",
            settings: {
              videoSettings: changes.videoSettings?.newValue,
              audioSettings: changes.audioSettings?.newValue,
              enabled: changes.enabled?.newValue
            }
          });
        }
      });
    });
  }
});