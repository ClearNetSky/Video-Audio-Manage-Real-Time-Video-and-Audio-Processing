document.addEventListener('DOMContentLoaded', function() {
    let currentSettings = {
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
        enabled: true
    };
    let saveTimeout;

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    function loadSettings() {
        chrome.storage.sync.get(['videoSettings', 'audioSettings', 'enabled', 'uiTheme'], (data) => {
            if (data.videoSettings) {
                currentSettings.videoSettings = data.videoSettings;
            }
            if (data.audioSettings) {
                currentSettings.audioSettings = {
                    ...currentSettings.audioSettings,
                    ...data.audioSettings
                };
            }
            if (typeof data.enabled !== 'undefined') {
                currentSettings.enabled = data.enabled;
            }

            updateUIWithSettings();
            sendSettingsToContent();
            
            // Apply theme
            if (data.uiTheme) {
                document.body.className = data.uiTheme;
            }
        });
    }
    
    function updateUIWithSettings() {
        document.getElementById('extensionToggle').checked = currentSettings.enabled;
        document.getElementById('toggleStatus').textContent = chrome.i18n.getMessage(currentSettings.enabled ? 'enabled' : 'disabled');
        
        // Video settings
        setSliderValue('brightness', currentSettings.videoSettings.brightness);
        setSliderValue('contrast', currentSettings.videoSettings.contrast);
        setSliderValue('saturation', currentSettings.videoSettings.saturation);
        setSliderValue('sharpness', currentSettings.videoSettings.sharpness);
        setSliderValue('hue', currentSettings.videoSettings.hue);
        setSliderValue('grayscale', currentSettings.videoSettings.grayscale);
        setSliderValue('invert', currentSettings.videoSettings.invert);
        setSliderValue('sepia', currentSettings.videoSettings.sepia);
        setSliderValue('blur', currentSettings.videoSettings.blur);
        setSliderValue('opacity', currentSettings.videoSettings.opacity || 100);
        setSliderValue('vignette', currentSettings.videoSettings.vignette || 0);
        
        // Audio settings
        setSliderValue('volume', currentSettings.audioSettings.volume);
        setSliderValue('bass', currentSettings.audioSettings.bass);
        setSliderValue('pan', currentSettings.audioSettings.pan);
        setSliderValue('reverbLevel', currentSettings.audioSettings.reverbLevel);
        setSliderValue('delayLevel', currentSettings.audioSettings.delayLevel);
        
        document.getElementById('stereoReverse').checked = currentSettings.audioSettings.stereoReverse || false;
        document.getElementById('reverb').checked = currentSettings.audioSettings.reverb || false;
        document.getElementById('delay').checked = currentSettings.audioSettings.delay || false;
        
        // Equalizer
        const eqIds = ['eq-32', 'eq-64', 'eq-125', 'eq-250', 'eq-500', 'eq-1k', 'eq-2k', 'eq-4k', 'eq-8k', 'eq-16k'];
        if (currentSettings.audioSettings.equalizer) {
            eqIds.forEach((id, index) => {
                const slider = document.getElementById(id);
                if (slider && currentSettings.audioSettings.equalizer[index] !== undefined) {
                    slider.value = currentSettings.audioSettings.equalizer[index];
                    updateEQDisplay(id, currentSettings.audioSettings.equalizer[index]);
                }
            });
        }
        
        toggleDependentControls();
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
        if (!displayElement) return;
        
        switch (id) {
            case 'brightness':
            case 'contrast':
            case 'saturation':
            case 'volume':
            case 'opacity':
                displayElement.textContent = `${value}%`;
                break;
            case 'sharpness':
                displayElement.textContent = value;
                break;
            case 'hue':
                displayElement.textContent = `${value}°`;
                break;
            case 'grayscale':
            case 'invert':
            case 'sepia':
            case 'reverbLevel':
            case 'delayLevel':
            case 'vignette':
                displayElement.textContent = `${value}%`;
                break;
            case 'blur':
                displayElement.textContent = `${value}px`;
                break;
            case 'bass':
                displayElement.textContent = `${value}dB`;
                break;
            case 'pan':
                if (value === 0) {
                    displayElement.textContent = chrome.i18n.getMessage('center') || 'Center';
                } else if (value < 0) {
                    displayElement.textContent = `${chrome.i18n.getMessage('left') || 'Left'} ${Math.abs(value)}%`;
                } else {
                    displayElement.textContent = `${chrome.i18n.getMessage('right') || 'Right'} ${value}%`;
                }
                break;
            default:
                displayElement.textContent = value;
        }
        
        // Update slider background gradient
        const slider = document.getElementById(id);
        if (slider) {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const percentage = ((value - min) / (max - min)) * 100;
            slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percentage}%, var(--border-dark) ${percentage}%, var(--border-dark) 100%)`;
        }
    }
    
    function updateEQDisplay(id, value) {
        const displayElement = document.getElementById(`${id}-value`);
        if (displayElement) {
            displayElement.textContent = `${value > 0 ? '+' : ''}${value}dB`;
        }
    }
    
    function toggleDependentControls() {
        const reverbChecked = document.getElementById('reverb').checked;
        const delayChecked = document.getElementById('delay').checked;
        
        document.getElementById('reverbLevelGroup').style.display = reverbChecked ? 'block' : 'none';
        document.getElementById('delayLevelGroup').style.display = delayChecked ? 'block' : 'none';
    }
    
    document.getElementById('extensionToggle').addEventListener('change', function() {
        currentSettings.enabled = this.checked;
        document.getElementById('toggleStatus').textContent = chrome.i18n.getMessage(this.checked ? 'enabled' : 'disabled');
        
        sendSettingsToContent();
        chrome.storage.sync.set({ enabled: currentSettings.enabled });
    });
    
    const videoControls = ['brightness', 'contrast', 'saturation', 'sharpness', 'hue', 
                         'grayscale', 'invert', 'sepia', 'blur', 'opacity', 'vignette'];
    
    videoControls.forEach(control => {
        const slider = document.getElementById(control);
        if (slider) {
            slider.addEventListener('input', () => {
                const value = parseInt(slider.value);
                updateSliderDisplay(control, value);
                
                currentSettings.videoSettings[control] = value;
                slider.classList.add('active');
                
                sendSettingsToContent();
                scheduleSave();
                
                setTimeout(() => {
                    slider.classList.remove('active');
                }, 300);
            });
        }
    });
    
    // Equalizer controls
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
                
                sendSettingsToContent();
                scheduleSave();
            });
        }
    });
    
    // EQ Reset button
    const eqResetBtn = document.getElementById('eqResetBtn');
    if (eqResetBtn) {
        eqResetBtn.addEventListener('click', () => {
            currentSettings.audioSettings.equalizer = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            eqIds.forEach((id, index) => {
                const slider = document.getElementById(id);
                if (slider) {
                    slider.value = 0;
                    updateEQDisplay(id, 0);
                }
            });
            sendSettingsToContent();
            scheduleSave();
        });
    }
    
    const audioSliders = ['volume', 'bass', 'pan', 'reverbLevel', 'delayLevel'];
    
    audioSliders.forEach(control => {
        const slider = document.getElementById(control);
        if (slider) {
            slider.addEventListener('input', () => {
                const value = parseInt(slider.value);
                updateSliderDisplay(control, value);
                
                currentSettings.audioSettings[control] = value;
                slider.classList.add('active');
                
                sendSettingsToContent();
                scheduleSave();
                
                setTimeout(() => {
                    slider.classList.remove('active');
                }, 300);
            });
        }
    });
    
    const audioCheckboxes = ['stereoReverse', 'reverb', 'delay'];
    
    audioCheckboxes.forEach(control => {
        const checkbox = document.getElementById(control);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                const checked = checkbox.checked;
                currentSettings.audioSettings[control] = checked;
                
                sendSettingsToContent();
                scheduleSave();
                toggleDependentControls();
            });
        }
    });
    
    function scheduleSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            chrome.storage.sync.set({
                videoSettings: currentSettings.videoSettings,
                audioSettings: currentSettings.audioSettings
            });
        }, 500);
    }
    
    function sendSettingsToContent() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "applySettings",
                    settings: currentSettings
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("Cannot send message to tab:", chrome.runtime.lastError);
                    }
                });
            }
        });
    }

    // Preset handling
    document.getElementById('applyPresetBtn').addEventListener('click', applyPreset);
    document.getElementById('savePresetBtn').addEventListener('click', savePreset);
    document.getElementById('deletePresetBtn').addEventListener('click', deletePreset);
    document.getElementById('exportBtn').addEventListener('click', exportSettings);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importSettings);

    // Donation buttons
    document.getElementById('coffeeBtn').addEventListener('click', () => {
        window.open('https://www.buymeacoffee.com/aristarh.ucolov', '_blank');
    });

    // Quick actions
    document.getElementById('resetBtn').addEventListener('click', resetSettings);
    document.getElementById('advancedBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    function applyPreset() {
        const presetSelect = document.getElementById('presetSelect');
        const presetName = presetSelect.value;
        
        if (presetName === 'default') {
            resetSettings();
            return;
        }
        
        chrome.storage.sync.get(['customPresets'], (data) => {
            const customPresets = data.customPresets || {};
            const builtInPresets = getBuiltInPresets();
            const allPresets = {...builtInPresets, ...customPresets};
            
            if (allPresets[presetName]) {
                currentSettings = {
                    videoSettings: {...allPresets[presetName].videoSettings},
                    audioSettings: {...allPresets[presetName].audioSettings},
                    enabled: true
                };
                
                updateUIWithSettings();
                sendSettingsToContent();
                
                chrome.storage.sync.set({
                    videoSettings: currentSettings.videoSettings,
                    audioSettings: currentSettings.audioSettings,
                    lastPreset: presetName
                });
                
                updatePresetDescription(presetName);
            }
        });
    }
    
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
                videoSettings: {
                    brightness: 100, contrast: 100, saturation: 100,
                    sharpness: 0, hue: 0, grayscale: 0,
                    invert: 0, sepia: 0, blur: 0,
                    opacity: 100, vignette: 0, temperature: 0
                },
                audioSettings: {
                    volume: 100, bass: 12, pan: 0,
                    reverb: false, reverbLevel: 30,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [10, 8, 6, 4, 2, 0, 0, 0, 0, 0]
                }
            },
            voiceClarity: {
                videoSettings: {
                    brightness: 100, contrast: 100, saturation: 100,
                    sharpness: 5, hue: 0, grayscale: 0,
                    invert: 0, sepia: 0, blur: 0,
                    opacity: 100, vignette: 0, temperature: 0
                },
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
                audioSettings: {
                    volume: 100, bass: 0, pan: 0,
                    reverb: false, reverbLevel: 30,
                    delay: false, delayLevel: 30,
                    stereoReverse: false,
                    equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                }
            }
        };
    }
    
    function savePreset() {
        const promptMsg = chrome.i18n.getMessage('enterPresetName') || "Enter a name for your preset:";
        const presetName = prompt(promptMsg);
        if (!presetName) return;
        
        chrome.storage.sync.get(['customPresets'], (data) => {
            const customPresets = data.customPresets || {};
            customPresets[presetName] = {
                videoSettings: {...currentSettings.videoSettings},
                audioSettings: {...currentSettings.audioSettings}
            };
            
            chrome.storage.sync.set({ customPresets }, () => {
                updatePresetDropdown();
                document.getElementById('presetSelect').value = presetName;
                updatePresetDescription(presetName);
                const savedMsg = chrome.i18n.getMessage('presetSaved', [presetName]) || `Preset "${presetName}" saved successfully!`;
                alert(savedMsg);
            });
        });
    }
    
    function deletePreset() {
        const presetSelect = document.getElementById('presetSelect');
        const presetName = presetSelect.value;
        
        const builtInPresets = ['default', 'cinematic', 'vintage', 'night', 'bassBoost', 'voiceClarity', 'warm', 'cool', 'highContrast'];
        if (builtInPresets.includes(presetName)) {
            const cannotDeleteMsg = chrome.i18n.getMessage('cannotDeleteBuiltIn') || "Cannot delete built-in presets!";
            alert(cannotDeleteMsg);
            return;
        }
        
        const confirmMsg = chrome.i18n.getMessage('confirmDelete', [presetName]) || `Are you sure you want to delete the "${presetName}" preset?`;
        if (!confirm(confirmMsg)) {
            return;
        }
        
        chrome.storage.sync.get(['customPresets'], (data) => {
            const customPresets = data.customPresets || {};
            
            if (customPresets[presetName]) {
                delete customPresets[presetName];
                
                chrome.storage.sync.set({ customPresets }, () => {
                    updatePresetDropdown();
                    presetSelect.value = 'default';
                    updatePresetDescription('default');
                });
            } else {
                const notFoundMsg = chrome.i18n.getMessage('presetNotFound') || "Preset not found!";
                alert(notFoundMsg);
            }
        });
    }
    
    function updatePresetDropdown() {
        chrome.storage.sync.get(['customPresets', 'lastPreset'], (data) => {
            const presetSelect = document.getElementById('presetSelect');
            const customPresets = data.customPresets || {};
            
            while (presetSelect.options.length > 6) {
                presetSelect.remove(6);
            }
            
            Object.keys(customPresets).forEach(presetName => {
                const option = document.createElement('option');
                option.value = presetName;
                option.textContent = presetName;
                presetSelect.appendChild(option);
            });
            
            if (data.lastPreset) {
                presetSelect.value = data.lastPreset;
            }
            
            updatePresetDescription(presetSelect.value);
        });
    }
    
    function updatePresetDescription(presetName) {
        const descriptions = {
            default: chrome.i18n.getMessage('presetDescriptionDefault'),
            cinematic: chrome.i18n.getMessage('presetDescriptionCinematic'),
            vintage: chrome.i18n.getMessage('presetDescriptionVintage'),
            night: chrome.i18n.getMessage('presetDescriptionNight'),
            bassBoost: chrome.i18n.getMessage('presetDescriptionBassBoost'),
            voiceClarity: chrome.i18n.getMessage('presetDescriptionVoiceClarity'),
            warm: "Adds warm, cozy tones with enhanced low frequencies. Perfect for relaxed viewing.",
            cool: "Creates cool, crisp tones with enhanced high frequencies. Ideal for modern content.",
            highContrast: "Dramatically enhances contrast and sharpness for maximum visual impact."
        };
        
        const customDescription = chrome.i18n.getMessage('presetDescriptionCustom');
        document.getElementById('presetDescription').textContent = 
            descriptions[presetName] || customDescription;
    }
    
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
                        updatePresetDropdown();
                        const successMsg = chrome.i18n.getMessage('settingsImported') || 'Settings imported successfully!';
                        alert(successMsg);
                    });
                } else {
                    const invalidMsg = chrome.i18n.getMessage('invalidFileFormat') || 'Invalid settings file format!';
                    alert(invalidMsg);
                }
            } catch (err) {
                const errorMsg = chrome.i18n.getMessage('errorParsingFile', [err.message]) || `Error parsing settings file: ${err.message}`;
                alert(errorMsg);
            }
        };
        reader.readAsText(file);
        
        e.target.value = '';
    }
    
    function resetSettings() {
        const confirmMsg = chrome.i18n.getMessage('confirmReset') || "Are you sure you want to reset all settings to default?";
        if (!confirm(confirmMsg)) {
            return;
        }
        
        currentSettings = {
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
            enabled: true
        };
        
        updateUIWithSettings();
        sendSettingsToContent();
        
        chrome.storage.sync.set({
            videoSettings: currentSettings.videoSettings,
            audioSettings: currentSettings.audioSettings,
            lastPreset: 'default'
        });
        
        document.getElementById('presetSelect').value = 'default';
        updatePresetDescription('default');
    }

    // Initialize
    loadSettings();
    updatePresetDropdown();
    
    // Add tooltips
    addTooltips();
    
    function addTooltips() {
        const tooltips = {
            'brightness': 'Adjusts the overall lightness/darkness of the video',
            'contrast': 'Controls the difference between light and dark areas',
            'saturation': 'Changes the intensity of colors',
            'sharpness': 'Adjusts edge definition (positive) or softens image (negative)',
            'hue': 'Rotates all colors by the specified angle',
            'grayscale': 'Converts the image to grayscale at the specified percentage',
            'invert': 'Inverts the colors of the video',
            'sepia': 'Applies a vintage sepia tone effect',
            'blur': 'Adds Gaussian blur to the video',
            'volume': 'Adjusts the overall volume level',
            'bass': 'Boosts or reduces low frequencies',
            'pan': 'Controls stereo balance (left/right)',
            'stereoReverse': 'Swaps left and right audio channels',
            'reverb': 'Adds ambient room simulation effect',
            'delay': 'Adds echo/delay effect to the audio'
        };
        
        Object.entries(tooltips).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                const label = element.closest('.control-group')?.querySelector('label');
                if (label && !label.querySelector('.tooltiptext')) {
                    label.classList.add('tooltip');
                    const tooltipSpan = document.createElement('span');
                    tooltipSpan.className = 'tooltiptext';
                    tooltipSpan.textContent = text;
                    label.appendChild(tooltipSpan);
                }
            }
        });
    }
});