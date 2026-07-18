(function () {
    'use strict';

    if (window.__vamProcessorLoaded) return;
    window.__vamProcessorLoaded = true;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    // Unique per page load so ids never collide with page content
    const FILTER_PREFIX = 'vam-' + Math.random().toString(36).slice(2, 8);
    const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

    const NEUTRAL_AUDIO = {
        volume: 100, bass: 0, pan: 0,
        reverb: false, reverbLevel: 30,
        delay: false, delayLevel: 30,
        stereoReverse: false,
        equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };

    let activeSettings = {
        enabled: true,
        reverbQuality: 'medium',
        videoSettings: {
            brightness: 100, contrast: 100, saturation: 100,
            sharpness: 0, hue: 0, grayscale: 0,
            invert: 0, sepia: 0, blur: 0,
            opacity: 100, vignette: 0, temperature: 0,
            speed: 100
        },
        audioSettings: { ...NEUTRAL_AUDIO }
    };

    // Playback speed is only touched when it differs from 100% so sites that
    // manage playbackRate themselves are left alone by default
    function applyPlaybackSpeed(element, vs) {
        const speed = (vs.speed ?? 100) / 100;
        if (speed !== 1) {
            if (element.playbackRate !== speed) element.playbackRate = speed;
            element.__vamSpeed = true;
        } else if (element.__vamSpeed) {
            element.playbackRate = 1;
            delete element.__vamSpeed;
        }
    }

    /* ------------------------------------------------------------------ */
    /* SVG filters: sharpness, color temperature, vignette                 */
    /* CSS filter functions cannot express these, so a hidden <svg> with   */
    /* referenced filter primitives is injected once per document.         */
    /* ------------------------------------------------------------------ */

    let svgRoot = null;
    let sharpenMatrix = null;
    let temperatureMatrix = null;
    let vignetteImage = null;
    let lastVignetteStrength = -1;

    function vignetteDataUri(strength) {
        // SVG without intrinsic size stretches to the filter region
        const opacity = (0.85 * strength).toFixed(3);
        const svg =
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>" +
            "<radialGradient id='g' cx='50%' cy='50%' r='72%'>" +
            "<stop offset='55%' stop-color='#000' stop-opacity='0'/>" +
            "<stop offset='100%' stop-color='#000' stop-opacity='" + opacity + "'/>" +
            "</radialGradient>" +
            "<rect width='100' height='100' fill='url(#g)'/>" +
            "</svg>";
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function createFilter(idSuffix) {
        const filter = document.createElementNS(SVG_NS, 'filter');
        filter.setAttribute('id', FILTER_PREFIX + '-' + idSuffix);
        filter.setAttribute('x', '0%');
        filter.setAttribute('y', '0%');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        return filter;
    }

    function ensureSvgFilters() {
        if (svgRoot && svgRoot.isConnected) return;

        svgRoot = document.createElementNS(SVG_NS, 'svg');
        svgRoot.setAttribute('width', '0');
        svgRoot.setAttribute('height', '0');
        svgRoot.setAttribute('aria-hidden', 'true');
        svgRoot.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;pointer-events:none;';

        const defs = document.createElementNS(SVG_NS, 'defs');

        // Sharpen: 3x3 unsharp convolution kernel
        const sharpenFilter = createFilter('sharpen');
        sharpenMatrix = document.createElementNS(SVG_NS, 'feConvolveMatrix');
        sharpenMatrix.setAttribute('order', '3');
        sharpenMatrix.setAttribute('preserveAlpha', 'true');
        sharpenMatrix.setAttribute('kernelMatrix', '0 0 0 0 1 0 0 0 0');
        sharpenFilter.appendChild(sharpenMatrix);
        defs.appendChild(sharpenFilter);

        // Color temperature: scale red/blue channels
        const temperatureFilter = createFilter('temperature');
        temperatureMatrix = document.createElementNS(SVG_NS, 'feColorMatrix');
        temperatureMatrix.setAttribute('type', 'matrix');
        temperatureMatrix.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0');
        temperatureFilter.appendChild(temperatureMatrix);
        defs.appendChild(temperatureFilter);

        // Vignette: radial gradient image composited over the source
        const vignetteFilter = createFilter('vignette');
        vignetteImage = document.createElementNS(SVG_NS, 'feImage');
        vignetteImage.setAttribute('preserveAspectRatio', 'none');
        vignetteImage.setAttribute('result', 'vig');
        const vignetteComposite = document.createElementNS(SVG_NS, 'feComposite');
        vignetteComposite.setAttribute('in', 'vig');
        vignetteComposite.setAttribute('in2', 'SourceGraphic');
        vignetteComposite.setAttribute('operator', 'over');
        vignetteFilter.appendChild(vignetteImage);
        vignetteFilter.appendChild(vignetteComposite);
        defs.appendChild(vignetteFilter);

        svgRoot.appendChild(defs);
        (document.body || document.documentElement).appendChild(svgRoot);
    }

    function updateSvgFilterValues(vs) {
        ensureSvgFilters();

        const k = Math.max(0, vs.sharpness || 0) / 50; // 0..2
        sharpenMatrix.setAttribute('kernelMatrix',
            `0 ${-k} 0 ${-k} ${1 + 4 * k} ${-k} 0 ${-k} 0`);

        const t = (vs.temperature || 0) / 100; // -1..1, warm > 0
        const r = 1 + 0.22 * t;
        const g = 1 + 0.06 * t;
        const b = 1 - 0.22 * t;
        temperatureMatrix.setAttribute('values',
            `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`);

        const strength = Math.max(0, Math.min(100, vs.vignette || 0)) / 100;
        if (strength !== lastVignetteStrength) {
            const uri = vignetteDataUri(strength);
            vignetteImage.setAttribute('href', uri);
            vignetteImage.setAttributeNS(XLINK_NS, 'xlink:href', uri);
            lastVignetteStrength = strength;
        }
    }

    function applyVideoEffects(element, vs) {
        const filters = [];
        const sharpness = vs.sharpness || 0;
        const temperature = vs.temperature || 0;
        const vignette = vs.vignette || 0;

        if (sharpness > 0 || temperature !== 0 || vignette > 0) {
            updateSvgFilterValues(vs);
        }

        if (sharpness > 0) filters.push(`url(#${FILTER_PREFIX}-sharpen)`);
        if (temperature !== 0) filters.push(`url(#${FILTER_PREFIX}-temperature)`);

        if (vs.brightness !== 100) filters.push(`brightness(${vs.brightness}%)`);
        if (vs.contrast !== 100) filters.push(`contrast(${vs.contrast}%)`);
        if (vs.saturation !== 100) filters.push(`saturate(${vs.saturation}%)`);
        if (vs.hue !== 0) filters.push(`hue-rotate(${vs.hue}deg)`);
        if (vs.grayscale > 0) filters.push(`grayscale(${vs.grayscale}%)`);
        if (vs.sepia > 0) filters.push(`sepia(${vs.sepia}%)`);
        if (vs.invert > 0) filters.push(`invert(${vs.invert}%)`);
        if (vs.blur > 0) filters.push(`blur(${vs.blur}px)`);
        // Negative sharpness softens the image
        if (sharpness < 0) filters.push(`blur(${(-sharpness * 0.02).toFixed(2)}px)`);
        if (vs.opacity !== undefined && vs.opacity !== 100) filters.push(`opacity(${vs.opacity}%)`);
        if (vignette > 0) filters.push(`url(#${FILTER_PREFIX}-vignette)`);

        element.style.filter = filters.join(' ');
        element.style.willChange = filters.length ? 'filter' : '';
    }

    /* ------------------------------------------------------------------ */
    /* Audio graph                                                          */
    /* source -> gain -> bass -> 10x EQ -> upmix -> splitter -> merger ->  */
    /* pan -> destination (dry) + convolver/delay wet sends                */
    /* ------------------------------------------------------------------ */

    function buildImpulseResponse(ctx, quality) {
        const durations = { low: 1.2, medium: 2.0, high: 3.0 };
        const duration = durations[quality] || 2.0;
        const rate = ctx.sampleRate;
        const length = Math.max(1, Math.floor(rate * duration));
        const impulse = ctx.createBuffer(2, length, rate);
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8);
            }
        }
        return impulse;
    }

    function needsAudioProcessing(element) {
        const audio = activeSettings.audioSettings;
        return (element instanceof HTMLAudioElement || element instanceof HTMLVideoElement) &&
            (audio.volume !== 100 || audio.bass !== 0 || audio.pan !== 0 ||
                audio.stereoReverse || audio.reverb || audio.delay ||
                (audio.equalizer && audio.equalizer.some((gain) => gain !== 0)));
    }

    function setupAudioContext(element) {
        if (element.__vamAudio) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContextClass();
            const source = ctx.createMediaElementSource(element);

            const gainNode = ctx.createGain();

            const bassNode = ctx.createBiquadFilter();
            bassNode.type = 'lowshelf';
            bassNode.frequency.value = 200;

            const eqBands = EQ_FREQUENCIES.map((freq) => {
                const filter = ctx.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1.0;
                filter.gain.value = 0;
                return filter;
            });

            // Force mono sources up to stereo so the splitter always sees 2 channels
            const upmix = ctx.createGain();
            upmix.channelCount = 2;
            upmix.channelCountMode = 'explicit';
            upmix.channelInterpretation = 'speakers';

            const splitter = ctx.createChannelSplitter(2);
            const merger = ctx.createChannelMerger(2);
            const panNode = ctx.createStereoPanner();

            // Soft limiter engaged while volume boost is active to prevent clipping
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -10;
            compressor.knee.value = 12;
            compressor.ratio.value = 6;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // Reverb wet send (impulse buffer built lazily on first enable)
            const convolver = ctx.createConvolver();
            const reverbGain = ctx.createGain();
            reverbGain.gain.value = 0;

            // Delay wet send with feedback
            const delayNode = ctx.createDelay(1.0);
            delayNode.delayTime.value = 0.28;
            const delayFeedback = ctx.createGain();
            delayFeedback.gain.value = 0.35;
            const delayGain = ctx.createGain();
            delayGain.gain.value = 0;

            let node = source;
            [gainNode, bassNode, ...eqBands, upmix].forEach((next) => {
                node.connect(next);
                node = next;
            });
            upmix.connect(splitter);
            // splitter -> merger wiring is done in updateAudioNodes (stereo reverse)
            merger.connect(panNode);

            panNode.connect(ctx.destination);           // dry (rerouted through the
            compressor.connect(ctx.destination);        // limiter when boosting)
            convolver.connect(reverbGain);
            reverbGain.connect(compressor);             // reverb wet
            delayNode.connect(delayFeedback);
            delayFeedback.connect(delayNode);
            delayNode.connect(delayGain);
            delayGain.connect(compressor);              // delay wet

            const state = {
                ctx, source, gainNode, bassNode, eqBands,
                splitter, merger, panNode,
                compressor, compressorEngaged: false,
                convolver, reverbGain, reverbConnected: false, reverbQuality: null,
                delayNode, delayGain, delayConnected: false,
                stereoReversed: null
            };
            element.__vamAudio = state;

            // Autoplay policy: the context may start suspended and produce
            // silence until resumed after a user gesture / playback
            const resume = () => {
                if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            };
            element.addEventListener('play', resume);
            element.addEventListener('playing', resume);
            resume();

            updateAudioNodes(element, activeSettings.audioSettings);
        } catch (e) {
            console.error('Video & Audio Manager: error creating audio context', e);
        }
    }

    function updateAudioNodes(element, audio) {
        const s = element.__vamAudio;
        if (!s) return;

        s.gainNode.gain.value = (audio.volume ?? 100) / 100;
        s.bassNode.gain.value = audio.bass || 0;
        s.panNode.pan.value = Math.max(-1, Math.min(1, (audio.pan || 0) / 100));

        // Route the dry signal through the limiter only while boosting volume,
        // so default playback stays untouched
        const boosting = (audio.volume ?? 100) > 100;
        if (s.compressorEngaged !== boosting) {
            try { s.panNode.disconnect(s.ctx.destination); } catch (e) { /* ignore */ }
            try { s.panNode.disconnect(s.compressor); } catch (e) { /* ignore */ }
            s.panNode.connect(boosting ? s.compressor : s.ctx.destination);
            s.compressorEngaged = boosting;
        }

        if (audio.equalizer) {
            s.eqBands.forEach((band, index) => {
                if (typeof audio.equalizer[index] === 'number') {
                    band.gain.value = audio.equalizer[index];
                }
            });
        }

        // Stereo reverse: rewire splitter -> merger crossed or straight
        const reversed = !!audio.stereoReverse;
        if (s.stereoReversed !== reversed) {
            try { s.splitter.disconnect(); } catch (e) { /* not connected yet */ }
            if (reversed) {
                s.splitter.connect(s.merger, 0, 1);
                s.splitter.connect(s.merger, 1, 0);
            } else {
                s.splitter.connect(s.merger, 0, 0);
                s.splitter.connect(s.merger, 1, 1);
            }
            s.stereoReversed = reversed;
        }

        // Reverb: connect the convolver only while enabled to save CPU
        if (audio.reverb) {
            const quality = activeSettings.reverbQuality || 'medium';
            if (s.reverbQuality !== quality) {
                s.convolver.buffer = buildImpulseResponse(s.ctx, quality);
                s.reverbQuality = quality;
            }
            if (!s.reverbConnected) {
                s.panNode.connect(s.convolver);
                s.reverbConnected = true;
            }
            s.reverbGain.gain.value = (audio.reverbLevel ?? 30) / 100;
        } else {
            if (s.reverbConnected) {
                try { s.panNode.disconnect(s.convolver); } catch (e) { /* ignore */ }
                s.reverbConnected = false;
            }
            s.reverbGain.gain.value = 0;
        }

        // Delay
        if (audio.delay) {
            if (!s.delayConnected) {
                s.panNode.connect(s.delayNode);
                s.delayConnected = true;
            }
            s.delayGain.gain.value = (audio.delayLevel ?? 30) / 100;
        } else {
            if (s.delayConnected) {
                try { s.panNode.disconnect(s.delayNode); } catch (e) { /* ignore */ }
                s.delayConnected = false;
            }
            s.delayGain.gain.value = 0;
        }
    }

    function resetElement(element) {
        element.style.filter = '';
        element.style.willChange = '';
        element.style.boxShadow = '';

        if (element.__vamSpeed) {
            element.playbackRate = 1;
            delete element.__vamSpeed;
        }

        // A MediaElementSource cannot be detached from its element, so the
        // graph is neutralized instead of closed (closing would mute the
        // element permanently and re-creating the source throws)
        if (element.__vamAudio) {
            updateAudioNodes(element, NEUTRAL_AUDIO);
        }
    }

    function processMediaElement(element) {
        if (!activeSettings.enabled) {
            resetElement(element);
            return;
        }

        if (element instanceof HTMLVideoElement) {
            applyVideoEffects(element, activeSettings.videoSettings);
        }

        if (element instanceof HTMLVideoElement || element instanceof HTMLAudioElement) {
            applyPlaybackSpeed(element, activeSettings.videoSettings);
        }

        if (element.__vamAudio) {
            updateAudioNodes(element, activeSettings.audioSettings);
        } else if (needsAudioProcessing(element)) {
            setupAudioContext(element);
        }
    }

    function processAllMedia() {
        document.querySelectorAll('video, audio').forEach(processMediaElement);
    }

    /* ------------------------------------------------------------------ */
    /* Wiring                                                               */
    /* ------------------------------------------------------------------ */

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                if (node instanceof HTMLVideoElement || node instanceof HTMLAudioElement) {
                    processMediaElement(node);
                }
                if (node.querySelectorAll) {
                    node.querySelectorAll('video, audio').forEach(processMediaElement);
                }
            });
        });
    });

    observer.observe(document.documentElement || document, {
        childList: true,
        subtree: true
    });

    // Catches media the observer cannot see (e.g. inside shadow DOM)
    document.addEventListener('play', (event) => {
        const el = event.target;
        if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) {
            processMediaElement(el);
        }
    }, true);

    window.addEventListener('message', (event) => {
        if (event.source !== window || !event.data) return;
        if (event.data.type !== 'VAM_FROM_EXTENSION' || event.data.action !== 'applySettings') return;

        const settings = event.data.settings || {};
        if (settings.videoSettings) activeSettings.videoSettings = settings.videoSettings;
        if (settings.audioSettings) activeSettings.audioSettings = settings.audioSettings;
        if (typeof settings.enabled !== 'undefined') activeSettings.enabled = settings.enabled;
        if (settings.reverbQuality) activeSettings.reverbQuality = settings.reverbQuality;

        processAllMedia();
    });

    processAllMedia();

    window.postMessage({ type: 'VAM_FROM_PAGE', action: 'ready' }, '*');
})();
