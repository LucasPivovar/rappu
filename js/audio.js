/**
 * Tactical Paper Audio Synthesizer (Web Audio API)
 * Procedurally generates realistic paper flip, whoosh, and settle sounds
 * with zero external audio assets.
 */
class PaperAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.noiseBuffer = null;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.createNoiseBuffer();
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    // Pink-ish noise generation for organic paper texture
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.noiseBuffer = buffer;
  }

  playFlipSound(direction = 1) {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    const duration = 0.45;

    // Source noise
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    // Bandpass filter for papery rustle
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.5, now);

    // Frequency sweep simulates paper lifting and sweeping through air
    const startFreq = direction > 0 ? 900 : 1300;
    const peakFreq = 2200;
    const endFreq = 700;

    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    // Gain envelope (rise and smooth decay)
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + duration * 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);

    // Soft landing thud at end of page flip
    setTimeout(() => {
      this.playSettleSound();
    }, duration * 650);
  }

  playSettleSound() {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const duration = 0.18;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(450, now);
    lowpass.frequency.exponentialRampToValueAtTime(150, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  playKeyClick() {
    if (!this.enabled || !this.ctx) return;
    this.ensureRunning();
    const now = this.ctx.currentTime;
    
    // Crisp click impulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.025);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  playHoverTick() {
    if (!this.enabled || !this.ctx) return;
    this.ensureRunning();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.015);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

window.paperAudio = new PaperAudioEngine();
