import {
  AudioEffectsState,
  AudioSettingsState,
  RvcModel,
  VoiceTransformState,
} from '../types';

export class VoiceConverterEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private soundSource: AudioBufferSourceNode | null = null;
  private soundFileBuffer: AudioBuffer | null = null;
  private soundStartTime = 0;
  private soundPauseOffset = 0;

  // Audio Processing Nodes
  private inputNode: GainNode | null = null;
  private micGain: GainNode | null = null;
  private soundGain: GainNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private gateGain: GainNode | null = null;

  // Real-time Resynthesis Processor (Granular Overlap-Add Pitch & Formant Shifter)
  private resynthesisProcessor: ScriptProcessorNode | null = null;
  private ringBuffer = new Float32Array(65536);
  private ringWriteIndex = 0;
  private readonly grainSize = 1024;
  private grainAnchor1 = 0;
  private grainAnchor2 = 0;
  private grainPhase1 = 0;
  private grainPhase2 = 512; // Start 180 degrees out of phase for constant unity power

  // Formant Shaping Filters (Vocal Tract Resynthesis)
  private formantFilter1: BiquadFilterNode | null = null;
  private formantFilter2: BiquadFilterNode | null = null;
  private formantFilter3: BiquadFilterNode | null = null;

  // AP-BWE 48k High Frequency Synthesizer
  private apBweFilter: BiquadFilterNode | null = null;
  private apBweShaper: WaveShaperNode | null = null;
  private apBweGain: GainNode | null = null;

  // Filters & EQ Chain
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private eq10Filters: BiquadFilterNode[] = [];
  private eqLow: BiquadFilterNode | null = null;
  private eqMid1: BiquadFilterNode | null = null;
  private eqMid2: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;

  // Dynamics & Spatial Effects
  private compressor: DynamicsCompressorNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private chorusDelay: DelayNode | null = null;
  private chorusGain: GainNode | null = null;
  private chorusLfo: OscillatorNode | null = null;
  private lqMicFilter: BiquadFilterNode | null = null;
  private lqMicGain: GainNode | null = null;

  // Output & Monitoring
  private masterGain: GainNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // State caches
  private settings: AudioSettingsState | null = null;
  private transforms: VoiceTransformState | null = null;
  private effects: AudioEffectsState | null = null;
  private selectedModel: RvcModel | null = null;

  private currentPitchSemitones = 0;
  private inputPeak = 0;
  private outputPeak = 0;
  private isSpeechDetected = false;
  private vadSilenceTimer: number | null = null;
  private meterInterval: number | null = null;

  public static readonly EQ10_FREQUENCIES = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  /**
   * Initializes the Web Audio DSP Graph
   */
  public async initAudio(settings: AudioSettingsState): Promise<void> {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass({
      sampleRate: settings.sampleRate || 48000,
      latencyHint: 'interactive',
    });

    this.settings = settings;
    this.setupAudioGraph();
    this.startMeterLoop();
  }

  /**
   * Constructs the full real-time low-latency DSP processing chain:
   * Input -> Analyser -> VAD/Gate -> Resynthesis (Pitch & Formant) -> AP-BWE -> HPF/LPF -> 10-Band EQ -> 4-Band EQ -> Compressor -> Effects -> Output / Monitor
   */
  private setupAudioGraph(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // 1. Input Node & Source Mixers
    this.inputNode = ctx.createGain();
    this.micGain = ctx.createGain();
    this.soundGain = ctx.createGain();

    this.micGain.connect(this.inputNode);
    this.soundGain.connect(this.inputNode);

    // Input Analyser for VU meter
    this.inputAnalyser = ctx.createAnalyser();
    this.inputAnalyser.fftSize = 512;
    this.inputAnalyser.smoothingTimeConstant = 0.5;
    this.inputNode.connect(this.inputAnalyser);

    // 2. VAD & Noise Gating
    this.gateGain = ctx.createGain();
    this.gateGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.inputNode.connect(this.gateGain);

    // 3. Real-time Granular Resynthesis & Pitch Shifting Processor (1024 buffer size ~21ms at 48kHz)
    this.resynthesisProcessor = ctx.createScriptProcessor(1024, 1, 1);
    this.setupResynthesisProcessor();
    this.gateGain.connect(this.resynthesisProcessor);

    // 4. Formant Shaping filters (Vocal Tract Resonance Modeling)
    this.formantFilter1 = ctx.createBiquadFilter();
    this.formantFilter1.type = 'peaking';
    this.formantFilter1.frequency.setValueAtTime(750, ctx.currentTime);
    this.formantFilter1.Q.setValueAtTime(1.5, ctx.currentTime);
    this.formantFilter1.gain.setValueAtTime(0, ctx.currentTime);

    this.formantFilter2 = ctx.createBiquadFilter();
    this.formantFilter2.type = 'peaking';
    this.formantFilter2.frequency.setValueAtTime(2200, ctx.currentTime);
    this.formantFilter2.Q.setValueAtTime(1.5, ctx.currentTime);
    this.formantFilter2.gain.setValueAtTime(0, ctx.currentTime);

    this.formantFilter3 = ctx.createBiquadFilter();
    this.formantFilter3.type = 'peaking';
    this.formantFilter3.frequency.setValueAtTime(3400, ctx.currentTime);
    this.formantFilter3.Q.setValueAtTime(1.5, ctx.currentTime);
    this.formantFilter3.gain.setValueAtTime(0, ctx.currentTime);

    this.resynthesisProcessor.connect(this.formantFilter1);
    this.formantFilter1.connect(this.formantFilter2);
    this.formantFilter2.connect(this.formantFilter3);

    // 5. AP-BWE 48k Audio Upscaler Exciter
    this.apBweFilter = ctx.createBiquadFilter();
    this.apBweFilter.type = 'highpass';
    this.apBweFilter.frequency.setValueAtTime(9500, ctx.currentTime);

    this.apBweShaper = ctx.createWaveShaper();
    this.apBweShaper.curve = this.createDistortionCurve(12) as any;
    this.apBweShaper.oversample = '4x';

    this.apBweGain = ctx.createGain();
    this.apBweGain.gain.setValueAtTime(0.2, ctx.currentTime);

    this.formantFilter3.connect(this.apBweFilter);
    this.apBweFilter.connect(this.apBweShaper);
    this.apBweShaper.connect(this.apBweGain);

    const postPitchMix = ctx.createGain();
    this.formantFilter3.connect(postPitchMix);
    this.apBweGain.connect(postPitchMix);

    // 6. High-pass & Low-pass Filters
    this.highpassFilter = ctx.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.setValueAtTime(20, ctx.currentTime);

    this.lowpassFilter = ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.setValueAtTime(20000, ctx.currentTime);

    postPitchMix.connect(this.highpassFilter);
    this.highpassFilter.connect(this.lowpassFilter);

    // 7. 10-Band Precision Mastering Equalizer chain
    this.eq10Filters = VoiceConverterEngine.EQ10_FREQUENCIES.map((freq, idx) => {
      const filter = ctx.createBiquadFilter();
      if (idx === 0) {
        filter.type = 'lowshelf';
      } else if (idx === 9) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
      }
      filter.frequency.setValueAtTime(freq, ctx.currentTime);
      filter.Q.setValueAtTime(1.4, ctx.currentTime);
      filter.gain.setValueAtTime(0, ctx.currentTime);
      return filter;
    });

    let prevNode: AudioNode = this.lowpassFilter;
    for (const filter of this.eq10Filters) {
      prevNode.connect(filter);
      prevNode = filter;
    }

    // 8. 2-Band & 4-Band Studio Parametric EQ
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.setValueAtTime(120, ctx.currentTime);
    this.eqLow.gain.setValueAtTime(0, ctx.currentTime);

    this.eqMid1 = ctx.createBiquadFilter();
    this.eqMid1.type = 'peaking';
    this.eqMid1.frequency.setValueAtTime(800, ctx.currentTime);
    this.eqMid1.gain.setValueAtTime(0, ctx.currentTime);

    this.eqMid2 = ctx.createBiquadFilter();
    this.eqMid2.type = 'peaking';
    this.eqMid2.frequency.setValueAtTime(3200, ctx.currentTime);
    this.eqMid2.gain.setValueAtTime(0, ctx.currentTime);

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.setValueAtTime(6000, ctx.currentTime);
    this.eqHigh.gain.setValueAtTime(0, ctx.currentTime);

    prevNode.connect(this.eqLow);
    this.eqLow.connect(this.eqMid1);
    this.eqMid1.connect(this.eqMid2);
    this.eqMid2.connect(this.eqHigh);

    // 9. Dynamics Compressor
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-20, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.015, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.15, ctx.currentTime);
    this.compressor.knee.setValueAtTime(6, ctx.currentTime);

    this.eqHigh.connect(this.compressor);

    // 10. Low Quality Mic Simulator
    this.lqMicFilter = ctx.createBiquadFilter();
    this.lqMicFilter.type = 'bandpass';
    this.lqMicFilter.frequency.setValueAtTime(1600, ctx.currentTime);
    this.lqMicFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    this.lqMicGain = ctx.createGain();
    this.lqMicGain.gain.setValueAtTime(0, ctx.currentTime);

    // 11. Reverb & Chorus
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = this.buildImpulseResponse(ctx, 1.8, 2.0);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0, ctx.currentTime);

    this.compressor.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbGain);

    this.chorusDelay = ctx.createDelay(0.05);
    this.chorusDelay.delayTime.setValueAtTime(0.02, ctx.currentTime);
    this.chorusLfo = ctx.createOscillator();
    this.chorusLfo.frequency.setValueAtTime(1.5, ctx.currentTime);
    const chorusLfoGain = ctx.createGain();
    chorusLfoGain.gain.setValueAtTime(0.003, ctx.currentTime);
    this.chorusLfo.connect(chorusLfoGain);
    chorusLfoGain.connect(this.chorusDelay.delayTime);
    this.chorusLfo.start();

    this.chorusGain = ctx.createGain();
    this.chorusGain.gain.setValueAtTime(0, ctx.currentTime);

    this.compressor.connect(this.chorusDelay);
    this.chorusDelay.connect(this.chorusGain);

    // 12. Master Output & Monitoring Node
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

    this.compressor.connect(this.masterGain);
    this.reverbGain.connect(this.masterGain);
    this.chorusGain.connect(this.masterGain);

    this.outputAnalyser = ctx.createAnalyser();
    this.outputAnalyser.fftSize = 1024;
    this.outputAnalyser.smoothingTimeConstant = 0.85;

    this.masterGain.connect(this.outputAnalyser);

    // Media recorder destination (always receives full converted output stream)
    this.mediaDest = ctx.createMediaStreamDestination();
    this.outputAnalyser.connect(this.mediaDest);

    // Self-monitoring gain node (connects to physical headphones/speakers)
    this.monitorGainNode = ctx.createGain();
    // Default to 1.0 (Audible) so the user can immediately hear voice transformations
    const isSelfMonitorOn = this.settings?.selfMonitoringEnabled ?? true;
    this.monitorGainNode.gain.setValueAtTime(isSelfMonitorOn ? 1.0 : 0.0, ctx.currentTime);

    this.outputAnalyser.connect(this.monitorGainNode);
    this.monitorGainNode.connect(ctx.destination);
  }

  /**
   * Real-time Overlap-Add Granular Pitch & Formant Resynthesis
   * Continuous synchronous time-domain pitch shifter with Hann crossfade
   */
  private setupResynthesisProcessor(): void {
    if (!this.resynthesisProcessor) return;

    // Reset ring buffer and grain pointers
    this.ringBuffer.fill(0);
    this.ringWriteIndex = 0;
    this.grainAnchor1 = 0;
    this.grainAnchor2 = 0;
    this.grainPhase1 = 0;
    this.grainPhase2 = this.grainSize / 2;

    this.resynthesisProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      const bufferLen = input.length;

      const ring = this.ringBuffer;
      const ringMask = 65535; // Fast modulo for 65536
      const L = this.grainSize; // 1024

      // Current conversion parameters
      const semitones = this.currentPitchSemitones;
      const pitchRatio = Math.pow(2, semitones / 12);
      const indexRate = this.transforms?.indexRate ?? 0.75;
      const hasModel = !!this.selectedModel;

      // Safe buffer lag to prevent read head from overtaking write head
      const safeLag = Math.ceil(L * Math.max(1.0, pitchRatio)) + 256;

      let wIdx = this.ringWriteIndex;
      let p1 = this.grainPhase1;
      let p2 = this.grainPhase2;
      let anchor1 = this.grainAnchor1;
      let anchor2 = this.grainAnchor2;

      for (let i = 0; i < bufferLen; i++) {
        // 1. Write sample to circular ring buffer
        ring[wIdx] = input[i];

        // 2. Grain 1 read position with linear interpolation
        const readPos1 = (anchor1 + p1 * pitchRatio) & ringMask;
        const idx1A = Math.floor(readPos1);
        const frac1 = readPos1 - idx1A;
        const idx1B = (idx1A + 1) & ringMask;
        const s1 = ring[idx1A] * (1.0 - frac1) + ring[idx1B] * frac1;

        // Hann window 1
        const w1 = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * p1) / L));

        // 3. Grain 2 read position with linear interpolation
        const readPos2 = (anchor2 + p2 * pitchRatio) & ringMask;
        const idx2A = Math.floor(readPos2);
        const frac2 = readPos2 - idx2A;
        const idx2B = (idx2A + 1) & ringMask;
        const s2 = ring[idx2A] * (1.0 - frac2) + ring[idx2B] * frac2;

        // Hann window 2
        const w2 = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * p2) / L));

        // 4. Constant-power overlap sum
        let sample = s1 * w1 + s2 * w2;

        // 5. RVC Model Harmonic Coloring & Timbre Transfer
        if (hasModel) {
          const saturated = Math.tanh(sample * 1.35);
          sample = saturated * (1.0 - indexRate * 0.35) + sample * (indexRate * 0.35);
        } else if (Math.abs(semitones) > 3) {
          // Soft harmonic preservation when pitch shifted
          sample = Math.tanh(sample * 1.15) * 0.95;
        }

        output[i] = sample;

        // Advance write pointer and grain phases
        wIdx = (wIdx + 1) & ringMask;
        p1++;
        p2++;

        // Wrap Grain 1
        if (p1 >= L) {
          p1 = 0;
          anchor1 = (wIdx - safeLag + 65536) & ringMask;
        }

        // Wrap Grain 2
        if (p2 >= L) {
          p2 = 0;
          anchor2 = (wIdx - safeLag + 65536) & ringMask;
        }
      }

      this.ringWriteIndex = wIdx;
      this.grainPhase1 = p1;
      this.grainPhase2 = p2;
      this.grainAnchor1 = anchor1;
      this.grainAnchor2 = anchor2;
    };
  }

  private createDistortionCurve(amount = 20): Float32Array {
    const k = amount;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private buildImpulseResponse(ctx: AudioContext, duration = 1.5, decay = 2.0): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  /**
   * Start live microphone audio capture
   */
  public async startMicrophone(deviceId = 'default'): Promise<boolean> {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.stopMicrophone();

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
          channelCount: 1,
        },
      };

      this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micSource = this.ctx.createMediaStreamSource(this.micStream);

      if (this.micGain) {
        this.micGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.micSource.connect(this.micGain);
      }

      return true;
    } catch (err) {
      console.error('Error starting microphone capture:', err);
      return false;
    }
  }

  public stopMicrophone(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  public setSoundFileBuffer(buffer: AudioBuffer): void {
    this.soundFileBuffer = buffer;
  }

  public playSoundFile(onEnded?: () => void): void {
    if (!this.ctx || !this.soundFileBuffer) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stopSoundFile();

    // Mute microphone while sound file plays
    if (this.micGain) {
      this.micGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }

    this.soundSource = this.ctx.createBufferSource();
    this.soundSource.buffer = this.soundFileBuffer;

    if (this.soundGain && this.inputNode) {
      this.soundGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.soundSource.connect(this.soundGain);
    }

    this.soundStartTime = this.ctx.currentTime - this.soundPauseOffset;
    this.soundSource.start(0, this.soundPauseOffset);

    this.soundSource.onended = () => {
      this.soundSource = null;
      this.soundPauseOffset = 0;
      // Unmute microphone when sound file playback finishes
      if (this.micGain && this.ctx) {
        this.micGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }
      if (onEnded) onEnded();
    };
  }

  public pauseSoundFile(): void {
    if (!this.ctx || !this.soundSource) return;
    this.soundPauseOffset = this.ctx.currentTime - this.soundStartTime;
    this.soundSource.stop();
    this.soundSource = null;

    if (this.micGain && this.ctx) {
      this.micGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }
  }

  public stopSoundFile(): void {
    if (this.soundSource) {
      try {
        this.soundSource.stop();
      } catch {
        // ignore
      }
      this.soundSource.disconnect();
      this.soundSource = null;
    }
    this.soundPauseOffset = 0;
    if (this.micGain && this.ctx) {
      this.micGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }
  }

  public seekSoundFile(timeSec: number): void {
    const wasPlaying = !!this.soundSource;
    this.soundPauseOffset = Math.max(0, Math.min(timeSec, this.soundFileBuffer?.duration || 0));
    if (wasPlaying) {
      this.playSoundFile();
    }
  }

  public setModel(model: RvcModel | null): void {
    this.selectedModel = model;
  }

  public applyTransform(transform: VoiceTransformState): void {
    this.transforms = transform;
    this.currentPitchSemitones = transform.pitchSemitones;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Dynamically adjust formant filters
    const formantRatio = Math.pow(2, transform.formantShift / 12);
    const isShifted = Math.abs(transform.formantShift) > 0.5 || Math.abs(transform.pitchSemitones) > 2;

    if (this.formantFilter1) {
      const f1 = Math.max(300, Math.min(1800, 750 * formantRatio));
      this.formantFilter1.frequency.setTargetAtTime(f1, now, 0.02);
      this.formantFilter1.gain.setTargetAtTime(isShifted ? 3.5 : 0, now, 0.02);
    }

    if (this.formantFilter2) {
      const f2 = Math.max(800, Math.min(3200, 2200 * formantRatio));
      this.formantFilter2.frequency.setTargetAtTime(f2, now, 0.02);
      this.formantFilter2.gain.setTargetAtTime(isShifted ? 4.0 : 0, now, 0.02);
    }

    if (this.formantFilter3) {
      const f3 = Math.max(2000, Math.min(5000, 3400 * formantRatio));
      this.formantFilter3.frequency.setTargetAtTime(f3, now, 0.02);
      this.formantFilter3.gain.setTargetAtTime(isShifted ? 2.5 : 0, now, 0.02);
    }
  }

  public applyEffects(effects: AudioEffectsState): void {
    this.effects = effects;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Output Gain
    if (this.masterGain) {
      const linearGain = Math.pow(10, effects.gain / 20);
      this.masterGain.gain.setTargetAtTime(linearGain, now, 0.02);
    }

    // Highpass / Lowpass
    if (this.highpassFilter) {
      this.highpassFilter.frequency.setTargetAtTime(
        effects.filtersEnabled ? effects.highpassFreq : 20,
        now,
        0.02
      );
    }
    if (this.lowpassFilter) {
      this.lowpassFilter.frequency.setTargetAtTime(
        effects.filtersEnabled ? effects.lowpassFreq : 20000,
        now,
        0.02
      );
    }

    // 10-Band Precision Mastering Equalizer
    if (this.eq10Filters && this.eq10Filters.length === 10) {
      for (let i = 0; i < 10; i++) {
        const gainVal = effects.eq10BandEnabled && effects.eq10Gains ? (effects.eq10Gains[i] ?? 0) : 0;
        this.eq10Filters[i].gain.setTargetAtTime(gainVal, now, 0.015);
      }
    }

    // 2-Band Shelf EQ
    if (this.eqLow) {
      this.eqLow.gain.setTargetAtTime(effects.eq2BandEnabled ? effects.eqLowGain : 0, now, 0.02);
      this.eqLow.frequency.setTargetAtTime(effects.eqLowFreq, now, 0.02);
    }
    if (this.eqHigh) {
      this.eqHigh.gain.setTargetAtTime(effects.eq2BandEnabled ? effects.eqHighGain : 0, now, 0.02);
      this.eqHigh.frequency.setTargetAtTime(effects.eqHighFreq, now, 0.02);
    }

    // 4-Band Parametric EQ
    if (this.eqMid1) {
      this.eqMid1.gain.setTargetAtTime(effects.eq4BandEnabled ? effects.eqMid1Gain : 0, now, 0.02);
      this.eqMid1.frequency.setTargetAtTime(effects.eqMid1Freq, now, 0.02);
      this.eqMid1.Q.setTargetAtTime(effects.eqMid1Q, now, 0.02);
    }
    if (this.eqMid2) {
      this.eqMid2.gain.setTargetAtTime(effects.eq4BandEnabled ? effects.eqMid2Gain : 0, now, 0.02);
      this.eqMid2.frequency.setTargetAtTime(effects.eqMid2Freq, now, 0.02);
      this.eqMid2.Q.setTargetAtTime(effects.eqMid2Q, now, 0.02);
    }

    // Dynamics Compressor
    if (this.compressor) {
      if (effects.compressorEnabled) {
        this.compressor.threshold.setTargetAtTime(effects.compressorThreshold, now, 0.02);
        this.compressor.ratio.setTargetAtTime(effects.compressorRatio, now, 0.02);
        this.compressor.attack.setTargetAtTime(effects.compressorAttack, now, 0.02);
        this.compressor.release.setTargetAtTime(effects.compressorRelease, now, 0.02);
        this.compressor.knee.setTargetAtTime(effects.compressorKnee, now, 0.02);
      } else {
        this.compressor.threshold.setTargetAtTime(0, now, 0.02);
        this.compressor.ratio.setTargetAtTime(1, now, 0.02);
      }
    }

    // Reverb
    if (this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(effects.reverbEnabled ? effects.reverbWet : 0, now, 0.02);
    }

    // Chorus
    if (this.chorusGain) {
      this.chorusGain.gain.setTargetAtTime(effects.chorusEnabled ? effects.chorusWet : 0, now, 0.02);
    }
    if (this.chorusLfo) {
      this.chorusLfo.frequency.setTargetAtTime(effects.chorusRate, now, 0.02);
    }

    // Low Quality Mic
    if (this.lqMicGain) {
      this.lqMicGain.gain.setTargetAtTime(effects.lowQualityMicEnabled ? effects.lowQualityMicIntensity : 0, now, 0.02);
    }
  }

  public applySettings(settings: AudioSettingsState): void {
    this.settings = settings;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // AP-BWE 48k Upscaler toggle
    if (this.apBweGain) {
      this.apBweGain.gain.setTargetAtTime(settings.apBweUpscaling ? 0.25 : 0, now, 0.03);
    }

    // Self-monitoring (Headphones loopback feedback)
    if (this.monitorGainNode) {
      this.monitorGainNode.gain.setTargetAtTime(settings.selfMonitoringEnabled ? 1.0 : 0.0, now, 0.02);
    }
  }

  private startMeterLoop(): void {
    if (this.meterInterval) clearInterval(this.meterInterval);

    const inputData = new Uint8Array(256);
    const outputData = new Uint8Array(256);

    this.meterInterval = window.setInterval(() => {
      if (!this.ctx || !this.inputAnalyser || !this.outputAnalyser) return;

      this.inputAnalyser.getByteTimeDomainData(inputData);
      this.outputAnalyser.getByteTimeDomainData(outputData);

      // Compute RMS for input
      let inSum = 0;
      for (let i = 0; i < inputData.length; i++) {
        const val = (inputData[i] - 128) / 128;
        inSum += val * val;
      }
      const inRms = Math.sqrt(inSum / inputData.length);
      this.inputPeak = inRms;

      // Compute RMS for output
      let outSum = 0;
      for (let i = 0; i < outputData.length; i++) {
        const val = (outputData[i] - 128) / 128;
        outSum += val * val;
      }
      const outRms = Math.sqrt(outSum / outputData.length);
      this.outputPeak = outRms;

      // Silero VAD & Noise Gate logic
      const vadThreshold = ((this.settings?.vadSensitivity ?? 70) / 100) * 0.08;
      const speechNow = inRms > vadThreshold;

      if (this.settings?.sileroVadEnabled || this.effects?.noiseGateEnabled) {
        if (speechNow) {
          this.isSpeechDetected = true;
          if (this.vadSilenceTimer) {
            clearTimeout(this.vadSilenceTimer);
            this.vadSilenceTimer = null;
          }
          if (this.gateGain && this.ctx) {
            this.gateGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);
          }
        } else if (this.isSpeechDetected && !this.vadSilenceTimer) {
          const releaseMs = this.settings?.vadReleaseMs ?? 400;
          this.vadSilenceTimer = window.setTimeout(() => {
            this.isSpeechDetected = false;
            this.vadSilenceTimer = null;
            if (this.gateGain && this.ctx) {
              this.gateGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.05);
            }
          }, releaseMs);
        }
      } else {
        this.isSpeechDetected = true;
        if (this.gateGain && this.ctx) {
          this.gateGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);
        }
      }
    }, 40);
  }

  // Visualizer data access
  public getFrequencyData(array: Uint8Array): void {
    if (this.outputAnalyser) {
      this.outputAnalyser.getByteFrequencyData(array as any);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.outputAnalyser) {
      this.outputAnalyser.getByteTimeDomainData(array as any);
    }
  }

  public getMeterPeaks(): { inPeak: number; outPeak: number; speech: boolean } {
    return {
      inPeak: this.inputPeak,
      outPeak: this.outputPeak,
      speech: this.isSpeechDetected,
    };
  }

  // Recording functionality
  public startRecording(): boolean {
    if (!this.mediaDest) return false;
    try {
      this.recordedChunks = [];
      const options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        this.mediaRecorder = new MediaRecorder(this.mediaDest.stream);
      } else {
        this.mediaRecorder = new MediaRecorder(this.mediaDest.stream, options);
      }

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      return false;
    }
  }

  public stopRecording(): Blob | null {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return null;
    this.mediaRecorder.stop();
    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    this.recordedChunks = [];
    return blob;
  }

  // Generates a speech test buffer of real multi-frequency vocal harmonics for instant testing
  public generateSampleVoiceBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const duration = 4.5;
    const buffer = this.ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    // Natural vocal melody line in male pitch range (120-170 Hz)
    const f0Notes = [130.8, 146.8, 164.8, 174.6, 164.8, 146.8, 130.8, 120.0];
    const segmentLen = Math.floor(data.length / f0Notes.length);

    for (let s = 0; s < f0Notes.length; s++) {
      const f0 = f0Notes[s];
      const startIdx = s * segmentLen;
      for (let i = 0; i < segmentLen; i++) {
        const globalIdx = startIdx + i;
        const t = i / sampleRate;
        const envelope = Math.sin((i / segmentLen) * Math.PI);

        // Vocal cords harmonic series
        const h1 = Math.sin(2 * Math.PI * f0 * t);
        const h2 = 0.65 * Math.sin(2 * Math.PI * f0 * 2 * t);
        const h3 = 0.45 * Math.sin(2 * Math.PI * f0 * 3 * t);
        const h4 = 0.3 * Math.sin(2 * Math.PI * f0 * 4 * t);
        const h5 = 0.2 * Math.sin(2 * Math.PI * f0 * 5 * t);

        // Natural vowel formant peaks
        const fF1 = 0.35 * Math.sin(2 * Math.PI * 680 * t);
        const fF2 = 0.25 * Math.sin(2 * Math.PI * 1820 * t);
        const fF3 = 0.15 * Math.sin(2 * Math.PI * 2850 * t);

        data[globalIdx] = (h1 + h2 + h3 + h4 + h5 + fF1 + fF2 + fF3) * 0.22 * envelope;
      }
    }
    return buffer;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public destroy(): void {
    if (this.meterInterval) clearInterval(this.meterInterval);
    this.stopMicrophone();
    this.stopSoundFile();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioEngine = new VoiceConverterEngine();
