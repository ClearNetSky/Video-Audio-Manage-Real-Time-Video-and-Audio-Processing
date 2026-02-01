(function() {
    const processedElements = new WeakMap();
    let activeSettings = {
        enabled: true,
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
            equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // 10-band EQ
        }
    };

    function processMediaElement(element) {
        if (!activeSettings.enabled) {
            resetElement(element);
            return;
        }

        if (element instanceof HTMLVideoElement) {
            applyVideoEffects(element, activeSettings.videoSettings);
        }

        if (element.audioContext || needsAudioProcessing(element)) {
            setupAudioContext(element);
            updateAudioNodes(element, activeSettings.audioSettings);
        }
    }

    function needsAudioProcessing(element) {
        const audio = activeSettings.audioSettings;
        return (element instanceof HTMLAudioElement || element instanceof HTMLVideoElement) &&
               (audio.volume !== 100 || audio.bass !== 0 || audio.pan !== 0 ||
                audio.stereoReverse || audio.reverb || audio.delay || 
                (audio.equalizer && audio.equalizer.some(gain => gain !== 0)));
    }
    
    function updateAudioNodes(element, audioSettings) {
        if (!element.audioContext) return;
        
        // Update gain (volume)
        if (element.gainNode) {
            element.gainNode.gain.value = audioSettings.volume / 100;
        }
        
        // Update bass
        if (element.bassNode) {
            const bassGain = audioSettings.bass || 0;
            element.bassNode.gain.value = bassGain;
        }
        
        // Update stereo pan
        if (element.panNode) {
            const panValue = (audioSettings.pan || 0) / 100;
            element.panNode.pan.value = Math.max(-1, Math.min(1, panValue));
        }
        
        // Update equalizer
        if (element.eqBands && audioSettings.equalizer) {
            element.eqBands.forEach((band, index) => {
                if (audioSettings.equalizer[index] !== undefined) {
                    band.gain.value = audioSettings.equalizer[index];
                }
            });
        }
    }

    function setupAudioContext(element) {
        if (element.audioContext) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContext();
            const source = audioContext.createMediaElementSource(element);
            
            // Create nodes for better audio quality
            const gainNode = audioContext.createGain();
            const bassNode = audioContext.createBiquadFilter();
            const panNode = audioContext.createStereoPanner();
            
            // Configure bass filter
            bassNode.type = 'lowshelf';
            bassNode.frequency.value = 200;
            
            // Create equalizer nodes (10-band)
            const eqBands = [];
            const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
            frequencies.forEach(freq => {
                const filter = audioContext.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1.0;
                filter.gain.value = 0;
                eqBands.push(filter);
            });

            // Store nodes in element
            element.audioContext = audioContext;
            element.audioSource = source;
            element.gainNode = gainNode;
            element.bassNode = bassNode;
            element.panNode = panNode;
            element.eqBands = eqBands;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(bassNode);
            bassNode.connect(panNode);
            
            // Connect equalizer bands in series
            let lastNode = panNode;
            eqBands.forEach(band => {
                lastNode.connect(band);
                lastNode = band;
            });
            
            lastNode.connect(audioContext.destination);
            
            // Apply current settings
            updateAudioNodes(element, activeSettings.audioSettings);
        } catch (e) {
            console.error("Video & Audio Manager: Error creating audio context", e);
        }
    }
    
    function applyVideoEffects(element, videoSettings) {
        const filters = [];
        
        if (videoSettings.brightness !== 100) filters.push(`brightness(${videoSettings.brightness}%)`);
        if (videoSettings.contrast !== 100) filters.push(`contrast(${videoSettings.contrast}%)`);
        if (videoSettings.saturation !== 100) filters.push(`saturate(${videoSettings.saturation}%)`);
        if (videoSettings.hue !== 0) filters.push(`hue-rotate(${videoSettings.hue}deg)`);
        if (videoSettings.grayscale > 0) filters.push(`grayscale(${videoSettings.grayscale}%)`);
        if (videoSettings.sepia > 0) filters.push(`sepia(${videoSettings.sepia}%)`);
        if (videoSettings.invert > 0) filters.push(`invert(${videoSettings.invert}%)`);
        if (videoSettings.blur > 0) filters.push(`blur(${videoSettings.blur}px)`);
        if (videoSettings.opacity !== undefined && videoSettings.opacity !== 100) {
            filters.push(`opacity(${videoSettings.opacity}%)`);
        }
        
        element.style.filter = filters.join(' ');
        element.style.willChange = 'filter';
        
        // Apply additional effects via box-shadow for vignette
        if (videoSettings.vignette > 0) {
            const vignetteStrength = videoSettings.vignette / 100;
            element.style.boxShadow = `inset 0 0 ${100 * vignetteStrength}px ${50 * vignetteStrength}px rgba(0,0,0,${0.7 * vignetteStrength})`;
        } else {
            element.style.boxShadow = '';
        }
    }

    function resetElement(element) {
        element.style.filter = '';
        element.style.willChange = '';
        element.style.boxShadow = '';
        
        if (element.audioContext) {
            try {
                element.audioSource.disconnect();
                if (element.gainNode) element.gainNode.disconnect();
                if (element.bassNode) element.bassNode.disconnect();
                if (element.panNode) element.panNode.disconnect();
                if (element.eqBands) {
                    element.eqBands.forEach(band => band.disconnect());
                }
                element.audioContext.close();
                
                delete element.audioContext;
                delete element.audioSource;
                delete element.gainNode;
                delete element.bassNode;
                delete element.panNode;
                delete element.eqBands;
            } catch (e) {
                console.error("Error resetting audio context:", e);
            }
        }
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node instanceof HTMLVideoElement || node instanceof HTMLAudioElement) {
                        processMediaElement(node);
                    }
                    
                    const mediaElements = node.querySelectorAll('video, audio');
                    mediaElements.forEach((el) => processMediaElement(el));
                }
            });
        });
    });

    window.addEventListener('message', (event) => {
        if (event.data.type === 'FROM_EXTENSION' && event.data.action === 'applySettings') {
            if (event.data.settings.videoSettings) {
                activeSettings.videoSettings = event.data.settings.videoSettings;
            }
            if (event.data.settings.audioSettings) {
                activeSettings.audioSettings = event.data.settings.audioSettings;
            }
            if (typeof event.data.settings.enabled !== 'undefined') {
                activeSettings.enabled = event.data.settings.enabled;
            }

            document.querySelectorAll('video, audio').forEach(el => {
                processMediaElement(el);
            });
        }
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });

    document.querySelectorAll('video, audio').forEach(el => {
        processMediaElement(el);
    });

    window.postMessage({
        type: 'FROM_PAGE',
        action: 'ready'
    }, '*');
})();