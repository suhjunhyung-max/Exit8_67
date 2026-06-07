class ProceduralSoundEngine {
    constructor() {
        this.ctx = null;
        this.ambientHum = null;
        this.ceilingHum = null;
        this.rainNode = null;
        this.rainGain = null;
        this.clockInterval = null;
        this.whisperInterval = null;
        this.isPlayingRain = false;
        this.masterVolume = 0.5;
    }

    init() {
        if (this.ctx) return;
        
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Start background ambient hum
        this.startAmbientHum();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startAmbientHum() {
        if (!this.ctx || this.ambientHum) return;

        try {
            // Low drone hum
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(110, this.ctx.currentTime); // A2 note detuned
            osc2.detune.setValueAtTime(4, this.ctx.currentTime);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(120, this.ctx.currentTime);
            filter.Q.setValueAtTime(1, this.ctx.currentTime);

            // Modulate filter frequency slowly for texture
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // 0.1 Hz
            lfoGain.gain.setValueAtTime(30, this.ctx.currentTime);
            
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start();

            gain.gain.setValueAtTime(this.masterVolume * 0.15, this.ctx.currentTime);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start();
            osc2.start();

            this.ambientHum = { osc1, osc2, lfo, gain };
        } catch (e) {
            console.error("Ambient hum failed to start:", e);
        }
    }

    playFlashlightClick() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);

        gain.gain.setValueAtTime(this.masterVolume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
    }

    playFootstep(isRun = false, isSplash = false) {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = isRun ? 0.12 : 0.18;
        const volume = isRun ? 0.35 : 0.2;

        if (isSplash) {
            // Synthesize splash sound (wet, highpass/bandpass noise)
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.Q.setValueAtTime(3, now);
            filter.frequency.exponentialRampToValueAtTime(300, now + duration);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(this.masterVolume * volume * 1.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Add bubble thump
            const thump = this.ctx.createOscillator();
            const thumpGain = this.ctx.createGain();
            thump.type = 'sine';
            thump.frequency.setValueAtTime(180, now);
            thump.frequency.exponentialRampToValueAtTime(60, now + 0.08);
            thumpGain.gain.setValueAtTime(this.masterVolume * volume * 0.8, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            thump.connect(thumpGain);
            thumpGain.connect(this.ctx.destination);

            noise.start(now);
            thump.start(now);
            noise.stop(now + duration);
            thump.stop(now + 0.08);
        } else {
            // Synthesize clacking heel tap on wooden floor (또각 또각)
            // 1. High click (heel strike)
            const click = this.ctx.createOscillator();
            const clGain = this.ctx.createGain();
            click.type = 'triangle';
            click.frequency.setValueAtTime(1300, now);
            click.frequency.exponentialRampToValueAtTime(800, now + 0.025);

            clGain.gain.setValueAtTime(this.masterVolume * volume * 0.7, now);
            clGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

            // 2. Mid wood resonance thump
            const resonantThump = this.ctx.createOscillator();
            const resGain = this.ctx.createGain();
            resonantThump.type = 'sine';
            resonantThump.frequency.setValueAtTime(240, now);
            resonantThump.frequency.exponentialRampToValueAtTime(120, now + duration * 0.6);

            resGain.gain.setValueAtTime(this.masterVolume * volume * 0.5, now);
            resGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

            // 3. Crisp high-frequency scuff noise
            const bufferSize = this.ctx.sampleRate * 0.02;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const scuff = this.ctx.createBufferSource();
            scuff.buffer = buffer;
            const scFilter = this.ctx.createBiquadFilter();
            scFilter.type = 'highpass';
            scFilter.frequency.setValueAtTime(2200, now);

            const scGain = this.ctx.createGain();
            scGain.gain.setValueAtTime(this.masterVolume * volume * 0.3, now);
            scGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

            // Connections
            click.connect(clGain);
            clGain.connect(this.ctx.destination);

            resonantThump.connect(resGain);
            resGain.connect(this.ctx.destination);

            scuff.connect(scFilter);
            scFilter.connect(scGain);
            scGain.connect(this.ctx.destination);

            // Playback
            click.start(now);
            resonantThump.start(now);
            scuff.start(now);

            click.stop(now + 0.03);
            resonantThump.stop(now + duration * 0.6);
            scuff.stop(now + 0.025);
        }
    }

    playDoorBang() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Play 3 loud bangs: BAM, BAM, BAM
        const triggerBang = (delay) => {
            const time = now + delay;
            
            // Low wood impact
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(90, time);
            osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
            
            oscGain.gain.setValueAtTime(this.masterVolume * 0.8, time);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

            // Noise crash for crunch
            const bufferSize = this.ctx.sampleRate * 0.2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, time);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(this.masterVolume * 0.6, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            osc.start(time);
            noise.start(time);
            osc.stop(time + 0.2);
            noise.stop(time + 0.2);
        };

        triggerBang(0);
        triggerBang(0.18);
        triggerBang(0.36);
    }

    playPosterRattle() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // High frequency paper rattle noise
        for (let i = 0; i < 8; i++) {
            const time = now + i * 0.06;
            const bufferSize = this.ctx.sampleRate * 0.03;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < bufferSize; j++) {
                data[j] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(3000, time);
            filter.Q.setValueAtTime(5, time);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(this.masterVolume * 0.15, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(time);
            noise.stop(time + 0.04);
        }
    }

    playPosterFall() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Poster landing thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

        gain.gain.setValueAtTime(this.masterVolume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    playScream() {
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = 2.0;

        // Terrifying synthesis: detuned saws screaming high pitch with LFO vibrato
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(1000, now);
        osc1.frequency.exponentialRampToValueAtTime(300, now + duration);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1020, now);
        osc2.frequency.exponentialRampToValueAtTime(310, now + duration);

        // LFO for extreme vibrato / screaming tremor
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(25, now); // 25Hz tremor
        lfoGain.gain.setValueAtTime(150, now);

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.Q.setValueAtTime(1, now);
        filter.frequency.exponentialRampToValueAtTime(600, now + duration);

        gain.gain.setValueAtTime(this.masterVolume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        // Add spooky noise undercurrent
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(this.masterVolume * 0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        noise.connect(filter);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noiseGain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        lfo.start(now);
        noise.start(now);

        osc1.stop(now + duration);
        osc2.stop(now + duration);
        lfo.stop(now + duration);
        noise.stop(now + duration);
    }

    startCeilingHum() {
        this.resume();
        if (!this.ctx || this.ceilingHum) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(40, now); // Deep low rumbling

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.6, now + 1.0); // Slow fade in

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);

        this.ceilingHum = { osc, gain };
    }

    stopCeilingHum() {
        if (!this.ctx || !this.ceilingHum) return;
        const now = this.ctx.currentTime;
        try {
            const currentGain = this.ceilingHum.gain;
            currentGain.gain.cancelScheduledValues(now);
            currentGain.gain.setValueAtTime(currentGain.gain.value, now);
            currentGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            const osc = this.ceilingHum.osc;
            setTimeout(() => {
                try { osc.stop(); } catch(e) {}
            }, 600);
        } catch(e) {}
        this.ceilingHum = null;
    }

    playSuccess() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const chime = (freq, time, dur) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(this.masterVolume * 0.25, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + dur);
        };

        // Beautiful major triad arpeggio: C5 -> E5 -> G5 -> C6
        chime(523.25, now, 0.5);
        chime(659.25, now + 0.1, 0.5);
        chime(783.99, now + 0.2, 0.5);
        chime(1046.50, now + 0.3, 0.8);
    }

    playFail() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Dissonant low buzz reset sound
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(130, now);
        osc1.frequency.linearRampToValueAtTime(85, now + 0.6);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(133, now); // Detuned
        osc2.frequency.linearRampToValueAtTime(87, now + 0.6);

        gain.gain.setValueAtTime(this.masterVolume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
    }

    playGameOver() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Dramatic sub-bass brass drops to silence
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.5);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 1.5);

        gain.gain.setValueAtTime(this.masterVolume * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.9);

        // Crashing metal impact sound
        const bufferSize = this.ctx.sampleRate * 2.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / bufferSize);
        }
        const crash = this.ctx.createBufferSource();
        crash.buffer = buffer;
        
        const crashFilter = this.ctx.createBiquadFilter();
        crashFilter.type = 'lowpass';
        crashFilter.frequency.setValueAtTime(200, now);

        const crashGain = this.ctx.createGain();
        crashGain.gain.setValueAtTime(this.masterVolume * 0.6, now);
        crashGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        crash.connect(crashFilter);
        crashFilter.connect(crashGain);
        crashGain.connect(this.ctx.destination);

        crash.start(now);
        crash.stop(now + 2.0);
    }

    playVictory() {
        this.resume();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Long arpeggiated cosmic synth sweep
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00]; // C major
        notes.forEach((freq, idx) => {
            const time = now + idx * 0.12;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.2, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

            if (panner) {
                panner.pan.setValueAtTime((idx % 2 === 0 ? -0.5 : 0.5), time);
                osc.connect(panner);
                panner.connect(gain);
            } else {
                osc.connect(gain);
            }
            gain.connect(this.ctx.destination);
            
            osc.start(time);
            osc.stop(time + 2.0);
        });
    }

    startClockTick(volume = 0.5) {
        this.resume();
        if (!this.ctx || this.clockInterval) return;

        let isTick = true;
        this.clockInterval = setInterval(() => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            // Alternating ticking sound (higher/lower)
            osc.frequency.setValueAtTime(isTick ? 1200 : 900, now);
            isTick = !isTick;

            gain.gain.setValueAtTime(this.masterVolume * volume * 0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.04);
        }, 1000);
    }

    stopClockTick() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
    }

    startWhisper() {
        this.resume();
        if (!this.ctx || this.whisperInterval) return;

        this.whisperInterval = setInterval(() => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            
            // Generate whispering noise bursts
            const duration = 0.3 + Math.random() * 0.4;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            // Speech-like bandpass filtering
            filter.frequency.setValueAtTime(1200 + Math.random() * 800, now);
            filter.Q.setValueAtTime(8, now);

            const gain = this.ctx.createGain();
            // Pulsate the volume to mimic syllables
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.18, now + 0.05);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.05, now + duration * 0.4);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.15, now + duration * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + duration + 0.05);
        }, 1200);
    }

    stopWhisper() {
        if (this.whisperInterval) {
            clearInterval(this.whisperInterval);
            this.whisperInterval = null;
        }
    }

    startRainAndThunder() {
        this.resume();
        if (!this.ctx || this.isPlayingRain) return;
        this.isPlayingRain = true;

        const now = this.ctx.currentTime;

        // Continuous Rain Synthesizer (White noise through bandpass)
        const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds looping buffer
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const rainSource = this.ctx.createBufferSource();
        rainSource.buffer = buffer;
        rainSource.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(0.8, now);

        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.setValueAtTime(0, now);
        this.rainGain.linearRampToValueAtTime(this.masterVolume * 0.25, now + 1.5); // Fade in rain

        rainSource.connect(filter);
        filter.connect(this.rainGain);
        this.rainGain.connect(this.ctx.destination);

        rainSource.start(now);
        this.rainNode = rainSource;

        // Occasional thunder schedule
        this.thunderTimer = setInterval(() => {
            if (Math.random() < 0.4) {
                this.triggerThunder();
            }
        }, 10000);
    }

    triggerThunder() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Initial crack
        const crack = this.ctx.createOscillator();
        const crackFilter = this.ctx.createBiquadFilter();
        const crackGain = this.ctx.createGain();

        crack.type = 'triangle';
        crack.frequency.setValueAtTime(60, now);
        crack.frequency.linearRampToValueAtTime(30, now + 0.3);

        crackFilter.type = 'lowpass';
        crackFilter.frequency.setValueAtTime(120, now);

        crackGain.gain.setValueAtTime(this.masterVolume * 0.6, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        crack.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(this.ctx.destination);
        crack.start(now);
        crack.stop(now + 0.3);

        // Low rumble
        const duration = 2.0 + Math.random() * 3.0;
        const rumbleBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
        const rData = rumbleBuffer.getChannelData(0);
        for (let i = 0; i < rData.length; i++) {
            rData[i] = (Math.random() * 2 - 1) * Math.exp(-2.5 * i / rData.length);
        }

        const rumble = this.ctx.createBufferSource();
        rumble.buffer = rumbleBuffer;

        const rumbleFilter = this.ctx.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.setValueAtTime(45, now);

        const rumbleGain = this.ctx.createGain();
        rumbleGain.gain.setValueAtTime(this.masterVolume * 0.8, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        rumble.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(this.ctx.destination);

        rumble.start(now);
        rumble.stop(now + duration);
    }

    stopRainAndThunder() {
        if (!this.isPlayingRain) return;
        this.isPlayingRain = false;
        
        if (this.thunderTimer) {
            clearInterval(this.thunderTimer);
            this.thunderTimer = null;
        }

        const now = this.ctx.currentTime;
        if (this.rainGain) {
            try {
                this.rainGain.gain.cancelScheduledValues(now);
                this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, now);
                this.rainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
            } catch(e) {}
        }
        
        const node = this.rainNode;
        setTimeout(() => {
            try { node.stop(); } catch(e) {}
        }, 1100);

        this.rainNode = null;
        this.rainGain = null;
    }

    setMasterVolume(val) {
        this.masterVolume = val;
        if (this.ambientHum) {
            try {
                this.ambientHum.gain.gain.setValueAtTime(val * 0.15, this.ctx.currentTime);
            } catch(e) {}
        }
        if (this.rainGain && this.isPlayingRain) {
            try {
                this.rainGain.gain.setValueAtTime(val * 0.25, this.ctx.currentTime);
            } catch(e) {}
        }
    }
}

// Export single global instance
const gameAudio = new ProceduralSoundEngine();
window.gameAudio = gameAudio;
