document.addEventListener('DOMContentLoaded', async function() {
  await i18n.init();
  i18n.localizePage();

  document.getElementById('versionValue').textContent = chrome.runtime.getManifest().version;

  /* ---------------- Toast ---------------- */

  let toastTimeout;
  function showToast(message, isError) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  /* ---------------- Theme ---------------- */

  function applyTheme(theme) {
    let resolved = theme || 'dark';
    if (resolved === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(resolved);
  }

  /* ---------------- Load & autosave ---------------- */

  function loadSettings() {
    chrome.storage.sync.get(['reverbQuality', 'uiTheme', 'showTooltips', 'language'], (data) => {
      document.getElementById('reverbQuality').value = data.reverbQuality || 'medium';
      document.getElementById('uiTheme').value = data.uiTheme || 'dark';
      document.getElementById('showTooltips').checked = data.showTooltips !== false;
      document.getElementById('languageSelect').value = data.language || 'auto';
      applyTheme(data.uiTheme);
    });
  }

  function save(partial) {
    chrome.storage.sync.set(partial, () => {
      showToast(i18n.getMessage('settingsSaved'));
    });
  }

  document.getElementById('languageSelect').addEventListener('change', async function() {
    await i18n.setLanguage(this.value);
    i18n.localizePage();
    renderShortcuts();
    showToast(i18n.getMessage('settingsSaved'));
  });

  document.getElementById('uiTheme').addEventListener('change', function() {
    applyTheme(this.value);
    save({ uiTheme: this.value });
  });

  document.getElementById('showTooltips').addEventListener('change', function() {
    save({ showTooltips: this.checked });
  });

  document.getElementById('reverbQuality').addEventListener('change', function() {
    save({ reverbQuality: this.value });
  });

  /* ---------------- Keyboard shortcuts ---------------- */

  function renderShortcuts() {
    const list = document.getElementById('shortcutList');
    list.textContent = '';

    chrome.commands.getAll((commands) => {
      commands.forEach((command) => {
        if (!command.description) return;

        const row = document.createElement('div');
        row.className = 'shortcut-row';

        const name = document.createElement('span');
        name.textContent = command.description;

        const key = document.createElement('span');
        if (command.shortcut) {
          key.className = 'shortcut-key';
          key.textContent = command.shortcut;
        } else {
          key.className = 'shortcut-key unset';
          key.textContent = i18n.getMessage('shortcutNotSet');
        }

        row.appendChild(name);
        row.appendChild(key);
        list.appendChild(row);
      });
    });
  }

  document.getElementById('openShortcuts').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  /* ---------------- Backup ---------------- */

  function exportAllSettings() {
    chrome.storage.sync.get(null, (data) => {
      const settingsStr = JSON.stringify(data, null, 2);
      const blob = new Blob([settingsStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'video_audio_manager_settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  function importAllSettings(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target.result);
        chrome.storage.sync.set(settings, () => {
          showToast(i18n.getMessage('settingsImported'));
          loadSettings();
        });
      } catch (err) {
        showToast(i18n.getMessage('errorParsingFile', [err.message]), true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  /* ---------------- Reset (two-step confirm) ---------------- */

  function confirmClick(button, onConfirm) {
    if (button.dataset.confirming === 'true') {
      delete button.dataset.confirming;
      button.classList.remove('confirming');
      button.textContent = button.dataset.originalText;
      onConfirm();
      return;
    }
    button.dataset.confirming = 'true';
    button.dataset.originalText = button.textContent;
    button.classList.add('confirming');
    button.textContent = i18n.getMessage('confirmQuestion');
    setTimeout(() => {
      if (button.dataset.confirming === 'true') {
        delete button.dataset.confirming;
        button.classList.remove('confirming');
        button.textContent = button.dataset.originalText;
      }
    }, 3000);
  }

  function resetToDefaults() {
    chrome.storage.sync.set({
      videoSettings: {
        brightness: 100, contrast: 100, saturation: 100,
        sharpness: 0, hue: 0, grayscale: 0,
        invert: 0, sepia: 0, blur: 0,
        opacity: 100, vignette: 0, temperature: 0,
        speed: 100
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
      reverbQuality: 'medium',
      uiTheme: 'dark',
      showTooltips: true
    }, () => {
      showToast(i18n.getMessage('settingsResetDone'));
      loadSettings();
    });
  }

  /* ---------------- Wiring ---------------- */

  document.getElementById('exportAllSettings').addEventListener('click', exportAllSettings);
  document.getElementById('importAllSettings').addEventListener('click', () => {
    document.getElementById('importAllSettingsFile').click();
  });
  document.getElementById('importAllSettingsFile').addEventListener('change', importAllSettings);
  document.getElementById('resetToDefaults').addEventListener('click', function() {
    confirmClick(this, resetToDefaults);
  });

  loadSettings();
  renderShortcuts();
});
