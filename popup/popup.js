document.addEventListener('DOMContentLoaded', async function() {
    // Localization must be ready before anything renders text
    // (MV3 CSP forbids inline scripts, so this runs from popup.js)
    await i18n.init();

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

    let currentSettings = {
        videoSettings: { ...DEFAULT_VIDEO_SETTINGS },
        audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
        enabled: true
    };
    let saveTimeout;
    let tooltipsEnabled = true;

    // Show real version from the manifest
    const version = chrome.runtime.getManifest().version;
    document.getElementById('versionValue').textContent = version;
    document.querySelectorAll('.credits-version').forEach((el) => { el.textContent = version; });

    /* ---------------- Toast & inline confirmation ---------------- */

    let toastTimeout;
    function showToast(message, isError) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.toggle('error', !!isError);
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    // Two-step confirmation: first click arms the button, second confirms.
    // window.confirm() is unreliable in MV3 popups.
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

    /* ---------------- Theme ---------------- */

    function applyTheme(theme) {
        let resolved = theme || 'dark';
        if (resolved === 'system') {
            resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        document.body.classList.remove('dark', 'light');
        document.body.classList.add(resolved);
    }

    /* ---------------- Language switching ---------------- */

    const langBtn = document.getElementById('langToggle');

    function updateLangButton() {
        langBtn.textContent = i18n.getLanguage().toUpperCase();
        langBtn.title = i18n.getMessage('switchLanguage');
    }

    langBtn.addEventListener('click', async () => {
        const next = i18n.getLanguage() === 'ru' ? 'en' : 'ru';
        await i18n.setLanguage(next);
        relocalize();
    });

    // Re-renders every localized string after a language change
    function relocalize() {
        i18n.localizePage();
        updateLangButton();
        updateUIWithSettings();
        renderPresetGrid();
        rebuildTooltips();
        applyValueChipTitles();
    }

    /* ---------------- Tabs ---------------- */

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `${tabId}-tab`);
            });
        });
    });

    // Dot badge on tabs whose settings differ from defaults
    function updateTabBadges() {
        const vs = currentSettings.videoSettings;
        const as = currentSettings.audioSettings;

        const videoChanged = videoControls.some(
            (c) => (vs[c] ?? DEFAULT_VIDEO_SETTINGS[c]) !== DEFAULT_VIDEO_SETTINGS[c]);
        const audioChanged = ['volume', 'bass', 'pan'].some(
            (c) => (as[c] ?? DEFAULT_AUDIO_SETTINGS[c]) !== DEFAULT_AUDIO_SETTINGS[c]) ||
            !!as.reverb || !!as.delay || !!as.stereoReverse;
        const eqChanged = (as.equalizer || []).some((v) => v !== 0);

        document.querySelector('.tab-btn[data-tab="video"]').classList.toggle('has-changes', videoChanged);
        document.querySelector('.tab-btn[data-tab="audio"]').classList.toggle('has-changes', audioChanged);
        document.querySelector('.tab-btn[data-tab="equalizer"]').classList.toggle('has-changes', eqChanged);
    }

    /* ---------------- Settings load / UI sync ---------------- */

    function loadSettings() {
        chrome.storage.sync.get(['videoSettings', 'audioSettings', 'enabled', 'uiTheme', 'showTooltips'], (data) => {
            if (data.videoSettings) {
                currentSettings.videoSettings = { ...DEFAULT_VIDEO_SETTINGS, ...data.videoSettings };
            }
            if (data.audioSettings) {
                currentSettings.audioSettings = { ...DEFAULT_AUDIO_SETTINGS, ...data.audioSettings };
            }
            if (typeof data.enabled !== 'undefined') {
                currentSettings.enabled = data.enabled;
            }
            tooltipsEnabled = data.showTooltips !== false;

            updateUIWithSettings();
            sendSettingsToContent();
            applyTheme(data.uiTheme);
            rebuildTooltips();
        });
    }

    function updateUIWithSettings() {
        document.getElementById('extensionToggle').checked = currentSettings.enabled;
        document.body.classList.toggle('ext-off', !currentSettings.enabled);

        videoControls.forEach((control) => {
            setSliderValue(control, currentSettings.videoSettings[control] ?? DEFAULT_VIDEO_SETTINGS[control]);
        });

        setSliderValue('volume', currentSettings.audioSettings.volume);
        setSliderValue('bass', currentSettings.audioSettings.bass);
        setSliderValue('pan', currentSettings.audioSettings.pan);
        setSliderValue('reverbLevel', currentSettings.audioSettings.reverbLevel);
        setSliderValue('delayLevel', currentSettings.audioSettings.delayLevel);

        document.getElementById('stereoReverse').checked = currentSettings.audioSettings.stereoReverse || false;
        document.getElementById('reverb').checked = currentSettings.audioSettings.reverb || false;
        document.getElementById('delay').checked = currentSettings.audioSettings.delay || false;

        if (currentSettings.audioSettings.equalizer) {
            eqIds.forEach((id, index) => {
                const slider = document.getElementById(id);
                const value = currentSettings.audioSettings.equalizer[index];
                if (slider && value !== undefined) {
                    slider.value = value;
                    updateEQDisplay(id, value);
                }
            });
        }

        toggleDependentControls();
        updateTabBadges();
    }

    function setSliderValue(id, value) {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = value;
            updateSliderDisplay(id, value);
        }
    }

    function updateSliderDisplay(id, value) {
        const displayElement = document.getElementById(`${id}Value`);
        if (displayElement) {
            switch (id) {
                case 'brightness':
                case 'contrast':
                case 'saturation':
                case 'volume':
                case 'opacity':
                case 'grayscale':
                case 'invert':
                case 'sepia':
                case 'reverbLevel':
                case 'delayLevel':
                case 'vignette':
                    displayElement.textContent = `${value}%`;
                    break;
                case 'speed':
                    displayElement.textContent = `${parseFloat((value / 100).toFixed(2))}x`;
                    break;
                case 'sharpness':
                case 'temperature':
                    displayElement.textContent = value > 0 ? `+${value}` : `${value}`;
                    break;
                case 'hue':
                    displayElement.textContent = `${value}°`;
                    break;
                case 'blur':
                    displayElement.textContent = `${value}px`;
                    break;
                case 'bass':
                    displayElement.textContent = `${value}dB`;
                    break;
                case 'pan':
                    if (value === 0) {
                        displayElement.textContent = i18n.getMessage('center');
                    } else if (value < 0) {
                        displayElement.textContent = `${i18n.getMessage('left')} ${Math.abs(value)}%`;
                    } else {
                        displayElement.textContent = `${i18n.getMessage('right')} ${value}%`;
                    }
                    break;
                default:
                    displayElement.textContent = value;
            }
        }

        // Fill the track up to the current position
        const slider = document.getElementById(id);
        if (slider) {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const percentage = ((value - min) / (max - min)) * 100;
            slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percentage}%, var(--track) ${percentage}%, var(--track) 100%)`;
        }
    }

    function updateEQDisplay(id, value) {
        const displayElement = document.getElementById(`${id}-value`);
        if (displayElement) {
            displayElement.textContent = `${value > 0 ? '+' : ''}${value}`;
        }
    }

    function toggleDependentControls() {
        document.getElementById('reverbLevelGroup').style.display =
            document.getElementById('reverb').checked ? 'block' : 'none';
        document.getElementById('delayLevelGroup').style.display =
            document.getElementById('delay').checked ? 'block' : 'none';
    }

    // Manual tweaks mean the current state no longer matches a preset
    function markCustomized() {
        activePresetName = null;
        highlightActiveChip();
        updateTabBadges();
    }

    /* ---------------- Control listeners ---------------- */

    document.getElementById('extensionToggle').addEventListener('change', function() {
        currentSettings.enabled = this.checked;
        document.body.classList.toggle('ext-off', !this.checked);
        sendSettingsToContent();
        chrome.storage.sync.set({ enabled: currentSettings.enabled });
    });

    const videoControls = ['speed', 'brightness', 'contrast', 'saturation', 'sharpness', 'temperature',
                           'hue', 'grayscale', 'invert', 'sepia', 'blur', 'opacity', 'vignette'];

    videoControls.forEach(control => {
        const slider = document.getElementById(control);
        if (slider) {
            slider.addEventListener('input', () => {
                const value = parseInt(slider.value, 10);
                updateSliderDisplay(control, value);
                currentSettings.videoSettings[control] = value;
                markCustomized();
                sendSettingsToContent();
                scheduleSave();
            });
        }
    });

    const eqIds = ['eq-32', 'eq-64', 'eq-125', 'eq-250', 'eq-500', 'eq-1k', 'eq-2k', 'eq-4k', 'eq-8k', 'eq-16k'];
    eqIds.forEach((id, index) => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.addEventListener('input', () => {
                const value = parseFloat(slider.value);
                updateEQDisplay(id, value);
                if (!currentSettings.audioSettings.equalizer) {
                    currentSettings.audioSettings.equalizer = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                }
                currentSettings.audioSettings.equalizer[index] = value;
                markCustomized();
                sendSettingsToContent();
                scheduleSave();
            });
        }
    });

    document.getElementById('eqResetBtn').addEventListener('click', () => {
        currentSettings.audioSettings.equalizer = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        eqIds.forEach((id) => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = 0;
                updateEQDisplay(id, 0);
            }
        });
        markCustomized();
        sendSettingsToContent();
        scheduleSave();
    });

    document.getElementById('videoResetBtn').addEventListener('click', () => {
        currentSettings.videoSettings = { ...DEFAULT_VIDEO_SETTINGS };
        updateUIWithSettings();
        markCustomized();
        sendSettingsToContent();
        scheduleSave();
    });

    document.getElementById('audioResetBtn').addEventListener('click', () => {
        // Keep the equalizer: it has its own reset on the EQ tab
        const equalizer = currentSettings.audioSettings.equalizer;
        currentSettings.audioSettings = { ...DEFAULT_AUDIO_SETTINGS, equalizer };
        updateUIWithSettings();
        markCustomized();
        sendSettingsToContent();
        scheduleSave();
    });

    const audioSliders = ['volume', 'bass', 'pan', 'reverbLevel', 'delayLevel'];
    audioSliders.forEach(control => {
        const slider = document.getElementById(control);
        if (slider) {
            slider.addEventListener('input', () => {
                const value = parseInt(slider.value, 10);
                updateSliderDisplay(control, value);
                currentSettings.audioSettings[control] = value;
                markCustomized();
                sendSettingsToContent();
                scheduleSave();
            });
        }
    });

    const audioCheckboxes = ['stereoReverse', 'reverb', 'delay'];
    audioCheckboxes.forEach(control => {
        const checkbox = document.getElementById(control);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                currentSettings.audioSettings[control] = checkbox.checked;
                markCustomized();
                sendSettingsToContent();
                scheduleSave();
                toggleDependentControls();
            });
        }
    });

    // Double-click on a value chip resets that single control to its default
    function resetSingleControl(id) {
        if (videoControls.includes(id)) {
            currentSettings.videoSettings[id] = DEFAULT_VIDEO_SETTINGS[id];
            setSliderValue(id, DEFAULT_VIDEO_SETTINGS[id]);
        } else if (id in DEFAULT_AUDIO_SETTINGS) {
            currentSettings.audioSettings[id] = DEFAULT_AUDIO_SETTINGS[id];
            setSliderValue(id, DEFAULT_AUDIO_SETTINGS[id]);
        } else {
            return;
        }
        markCustomized();
        sendSettingsToContent();
        scheduleSave();
    }

    function applyValueChipTitles() {
        const hint = i18n.getMessage('dblClickReset');
        document.querySelectorAll('.value[id$="Value"]').forEach((chip) => {
            chip.title = hint;
        });
    }

    document.querySelectorAll('.value[id$="Value"]').forEach((chip) => {
        const id = chip.id.slice(0, -'Value'.length);
        chip.addEventListener('dblclick', () => resetSingleControl(id));
    });

    function scheduleSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            chrome.storage.sync.set({
                videoSettings: currentSettings.videoSettings,
                audioSettings: currentSettings.audioSettings,
                lastPreset: activePresetName || ''
            });
        }, 500);
    }

    function sendSettingsToContent() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "applySettings",
                    settings: currentSettings
                }, () => {
                    void chrome.runtime.lastError; // tab may have no content script
                });
            }
        });
    }

    /* ---------------- Presets ---------------- */

    const BUILT_IN_PRESET_DEFS = [
        { id: 'default', nameKey: 'presetDefault' },
        { id: 'cinematic', nameKey: 'presetCinematic' },
        { id: 'vintage', nameKey: 'presetVintage' },
        { id: 'night', nameKey: 'presetNight' },
        { id: 'bassBoost', nameKey: 'presetBassBoost' },
        { id: 'voiceClarity', nameKey: 'presetVoiceClarity' },
        { id: 'warm', nameKey: 'presetWarm' },
        { id: 'cool', nameKey: 'presetCool' },
        { id: 'highContrast', nameKey: 'presetHighContrast' }
    ];
    const BUILT_IN_PRESET_IDS = BUILT_IN_PRESET_DEFS.map((def) => def.id);
    let activePresetName = null;

    function getBuiltInPresets() {
        return {
            cinematic: {
                videoSettings: {
                    brightness: 90, contrast: 120, saturation: 90,
                    sharpness: 10, hue: 0, grayscale: 0,
                    invert: 0, sepia: 0, blur: 0,
                    opacity: 100, vignette: 15, temperature: 0
                },
                audioSettings: {
                    volume: 100, bass: 5, pan: 0,
                    reverb: false, reverbLevel: 30,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [0, 0, 0, -2, -3, -2, 0, 2, 0, 0]
                }
            },
            vintage: {
                videoSettings: {
                    brightness: 95, contrast: 110, saturation: 85,
                    sharpness: -5, hue: 0, grayscale: 0,
                    invert: 0, sepia: 40, blur: 1,
                    opacity: 100, vignette: 25, temperature: 10
                },
                audioSettings: {
                    volume: 100, bass: 2, pan: 0,
                    reverb: true, reverbLevel: 25,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [0, 0, -3, -4, 2, 3, 0, -2, -4, -6]
                }
            },
            night: {
                videoSettings: {
                    brightness: 70, contrast: 90, saturation: 80,
                    sharpness: 5, hue: -10, grayscale: 0,
                    invert: 0, sepia: 0, blur: 0,
                    opacity: 100, vignette: 10, temperature: -15
                },
                audioSettings: {
                    volume: 80, bass: -2, pan: 0,
                    reverb: false, reverbLevel: 30,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [0, 0, 0, 0, -3, -3, -2, 0, 0, 0]
                }
            },
            bassBoost: {
                videoSettings: { ...DEFAULT_VIDEO_SETTINGS },
                audioSettings: {
                    volume: 100, bass: 12, pan: 0,
                    reverb: false, reverbLevel: 30,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [10, 8, 6, 4, 2, 0, 0, 0, 0, 0]
                }
            },
            voiceClarity: {
                videoSettings: { ...DEFAULT_VIDEO_SETTINGS, sharpness: 5 },
                audioSettings: {
                    volume: 100, bass: -5, pan: 0,
                    reverb: false, reverbLevel: 30,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [-4, -4, -2, 0, 4, 6, 4, 0, -2, -3]
                }
            },
            warm: {
                videoSettings: {
                    brightness: 105, contrast: 105, saturation: 110,
                    sharpness: 0, hue: 10, grayscale: 0,
                    invert: 0, sepia: 15, blur: 0,
                    opacity: 100, vignette: 5, temperature: 20
                },
                audioSettings: {
                    volume: 100, bass: 3, pan: 0,
                    reverb: false, reverbLevel: 30,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [2, 2, 1, 0, 0, 0, -1, -2, -2, -2]
                }
            },
            cool: {
                videoSettings: {
                    brightness: 100, contrast: 105, saturation: 95,
                    sharpness: 5, hue: -15, grayscale: 0,
                    invert: 0, sepia: 0, blur: 0,
                    opacity: 100, vignette: 0, temperature: -20
                },
                audioSettings: {
                    volume: 100, bass: 0, pan: 0,
                    reverb: false, reverbLevel: 30,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [0, 0, 0, 0, 0, 2, 3, 3, 2, 2]
                }
            },
            highContrast: {
                videoSettings: {
                    brightness: 100, contrast: 150, saturation: 120,
                    sharpness: 15, hue: 0, grayscale: 0,
                    invert: 0, sepia: 0, blur: 0,
                    opacity: 100, vignette: 20, temperature: 0
                },
                audioSettings: { ...DEFAULT_AUDIO_SETTINGS }
            }
        };
    }

    function renderPresetGrid() {
        chrome.storage.sync.get(['customPresets', 'lastPreset'], (data) => {
            const grid = document.getElementById('presetGrid');
            grid.textContent = '';
            activePresetName = data.lastPreset || null;

            BUILT_IN_PRESET_DEFS.forEach((def) => {
                grid.appendChild(makePresetChip(def.id, i18n.getMessage(def.nameKey), false));
            });
            Object.keys(data.customPresets || {}).forEach((name) => {
                grid.appendChild(makePresetChip(name, name, true));
            });

            highlightActiveChip();
            updatePresetDescription(activePresetName);
        });
    }

    function makePresetChip(name, label, isCustom) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'preset-chip' + (isCustom ? ' custom' : '');
        chip.dataset.preset = name;
        chip.title = label;

        const text = document.createElement('span');
        text.textContent = label;
        chip.appendChild(text);

        chip.addEventListener('click', () => applyPresetByName(name));

        if (isCustom) {
            const del = document.createElement('span');
            del.className = 'chip-delete';
            del.textContent = '×';
            del.title = i18n.getMessage('deletePreset');
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                if (del.classList.contains('arm')) {
                    deleteCustomPreset(name);
                } else {
                    del.classList.add('arm');
                    setTimeout(() => del.classList.remove('arm'), 2500);
                }
            });
            chip.appendChild(del);
        }

        return chip;
    }

    function highlightActiveChip() {
        document.querySelectorAll('.preset-chip').forEach((chip) => {
            chip.classList.toggle('active', chip.dataset.preset === activePresetName);
        });
    }

    function applyPresetByName(presetName) {
        if (presetName === 'default') {
            doResetSettings();
            return;
        }

        chrome.storage.sync.get(['customPresets'], (data) => {
            const customPresets = data.customPresets || {};
            const allPresets = { ...getBuiltInPresets(), ...customPresets };
            if (!allPresets[presetName]) return;

            currentSettings = {
                videoSettings: { ...DEFAULT_VIDEO_SETTINGS, ...allPresets[presetName].videoSettings },
                audioSettings: { ...DEFAULT_AUDIO_SETTINGS, ...allPresets[presetName].audioSettings },
                enabled: true
            };
            activePresetName = presetName;

            updateUIWithSettings();
            highlightActiveChip();
            updatePresetDescription(presetName);
            sendSettingsToContent();

            chrome.storage.sync.set({
                videoSettings: currentSettings.videoSettings,
                audioSettings: currentSettings.audioSettings,
                lastPreset: presetName
            });
        });
    }

    function confirmSavePreset() {
        const input = document.getElementById('presetNameInput');
        const presetName = input.value.trim();
        if (!presetName) {
            input.focus();
            return;
        }

        chrome.storage.sync.get(['customPresets'], (data) => {
            const customPresets = data.customPresets || {};
            customPresets[presetName] = {
                videoSettings: { ...currentSettings.videoSettings },
                audioSettings: { ...currentSettings.audioSettings }
            };

            chrome.storage.sync.set({ customPresets, lastPreset: presetName }, () => {
                input.value = '';
                renderPresetGrid();
                showToast(i18n.getMessage('presetSaved', [presetName]));
            });
        });
    }

    function deleteCustomPreset(presetName) {
        if (BUILT_IN_PRESET_IDS.includes(presetName)) return;

        chrome.storage.sync.get(['customPresets'], (data) => {
            const customPresets = data.customPresets || {};
            if (!customPresets[presetName]) return;

            delete customPresets[presetName];
            const update = { customPresets };
            if (activePresetName === presetName) {
                activePresetName = null;
                update.lastPreset = '';
            }
            chrome.storage.sync.set(update, () => renderPresetGrid());
        });
    }

    function updatePresetDescription(presetName) {
        const descriptionKeys = {
            default: 'presetDescriptionDefault',
            cinematic: 'presetDescriptionCinematic',
            vintage: 'presetDescriptionVintage',
            night: 'presetDescriptionNight',
            bassBoost: 'presetDescriptionBassBoost',
            voiceClarity: 'presetDescriptionVoiceClarity',
            warm: 'presetDescriptionWarm',
            cool: 'presetDescriptionCool',
            highContrast: 'presetDescriptionHighContrast'
        };

        let key;
        if (!presetName) {
            key = 'selectPresetMessage';
        } else {
            key = descriptionKeys[presetName] || 'presetDescriptionCustom';
        }
        document.getElementById('presetDescription').textContent = i18n.getMessage(key);
    }

    /* ---------------- Import / export ---------------- */

    function exportSettings() {
        chrome.storage.sync.get(['videoSettings', 'audioSettings', 'customPresets'], (data) => {
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

    function importSettings(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const settings = JSON.parse(event.target.result);

                if (settings.videoSettings || settings.audioSettings || settings.customPresets) {
                    chrome.storage.sync.set(settings, () => {
                        loadSettings();
                        renderPresetGrid();
                        showToast(i18n.getMessage('settingsImported'));
                    });
                } else {
                    showToast(i18n.getMessage('invalidFileFormat'), true);
                }
            } catch (err) {
                showToast(i18n.getMessage('errorParsingFile', [err.message]), true);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    /* ---------------- Reset ---------------- */

    function doResetSettings() {
        currentSettings = {
            videoSettings: { ...DEFAULT_VIDEO_SETTINGS },
            audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
            enabled: true
        };
        activePresetName = 'default';

        updateUIWithSettings();
        highlightActiveChip();
        updatePresetDescription('default');
        sendSettingsToContent();

        chrome.storage.sync.set({
            videoSettings: currentSettings.videoSettings,
            audioSettings: currentSettings.audioSettings,
            lastPreset: 'default'
        });
    }

    /* ---------------- Buttons ---------------- */

    document.getElementById('confirmSavePresetBtn').addEventListener('click', confirmSavePreset);
    document.getElementById('presetNameInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmSavePreset();
    });
    document.getElementById('exportBtn').addEventListener('click', exportSettings);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importSettings);

    document.getElementById('coffeeBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.buymeacoffee.com/aristarh.ucolov' });
    });

    document.getElementById('resetBtn').addEventListener('click', function() {
        confirmClick(this, doResetSettings);
    });
    document.getElementById('advancedBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    /* ---------------- Tooltips ---------------- */

    function addTooltips() {
        const tooltipKeys = {
            speed: 'tooltipSpeed',
            brightness: 'tooltipBrightness',
            contrast: 'tooltipContrast',
            saturation: 'tooltipSaturation',
            sharpness: 'tooltipSharpness',
            temperature: 'tooltipTemperature',
            hue: 'tooltipHue',
            grayscale: 'tooltipGrayscale',
            invert: 'tooltipInvert',
            sepia: 'tooltipSepia',
            blur: 'tooltipBlur',
            vignette: 'tooltipVignette',
            volume: 'tooltipVolume',
            bass: 'tooltipBass',
            pan: 'tooltipPan',
            stereoReverse: 'tooltipStereoReverse',
            reverb: 'tooltipReverb',
            delay: 'tooltipDelay'
        };

        Object.entries(tooltipKeys).forEach(([id, key]) => {
            const text = i18n.getMessage(key);
            if (!text || text === key) return;

            const element = document.getElementById(id);
            const label = element?.closest('.control-group')?.querySelector(`label[for="${id}"]`);
            if (label && !label.querySelector('.tooltiptext')) {
                label.classList.add('tooltip');
                const tooltipSpan = document.createElement('span');
                tooltipSpan.className = 'tooltiptext';
                tooltipSpan.textContent = text;
                label.appendChild(tooltipSpan);
            }
        });
    }

    function rebuildTooltips() {
        document.querySelectorAll('.tooltiptext').forEach((el) => el.remove());
        document.querySelectorAll('label.tooltip').forEach((el) => el.classList.remove('tooltip'));
        if (tooltipsEnabled) addTooltips();
    }

    /* ---------------- Init ---------------- */

    i18n.localizePage();
    updateLangButton();
    applyValueChipTitles();
    loadSettings();
    renderPresetGrid();
});
