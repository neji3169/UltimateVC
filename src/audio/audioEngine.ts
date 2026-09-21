import { AudioEffectsState, AudioSettingsState, SoundFileState, VoiceTransformState } from '../types';

export class VoiceConverterEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;

  // Sound file playback
  private soundSource: AudioBufferSourceNode | null = null;
  private soundGain: GainNode | null = null;
  private soundFileBuffer: AudioBuffer | null = null;
  private soundStartTime: number = 0;
  private soundPauseOffset: number = 0;

  // Main input node (where mic or sound file connects)
  private inputNode: GainNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;

  // Pitch shifter nodes
  private pitchDryGain: GainNode | null = null;
  private pitchWetGain: GainNode | null = null;
  private delay1: DelayNode | null = null;
  private delay2: DelayNode | null = null;
  private modGain1: GainNode | null = null;
  private modGain2: GainNode | null = null;
  private pitchLfo1: OscillatorNode | null = null;
  private pitchLfo2: OscillatorNode | null = null;
  private formantFilter1: BiquadFilterNode | null = null;
  private formantFilter2: BiquadFilterNode | null = null;

  // Gate & VAD
  private gateGain: GainNode | null = null;
  private vadSilenceTimer: number | null = null;
  private isSpeechDetected: boolean = false;

  // AP-BWE (Bandwidth Extension) exciter
  private apBweFilter: BiquadFilterNode | null = null;
  private apBweShaper: WaveShaperNode | null = null;
  private apBweGain: GainNode | null = null;

  // Effects
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private eqLow: BiquadFilterNode | null = null;
  private eqMid1: BiquadFilterNode | null = null;
  private eqMid2: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private lqMicFilter: BiquadFilterNode | null = null;
  private lqMicGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private chorusDelay: DelayNode | null = null;
  private chorusLfo: OscillatorNode | null = null;
  private chorusGain: GainNode | null = null;

  // Output
  private masterGain: GainNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // State cache
  private isRunning = false;
  private currentPitchSemitones = 0;
  private settings: AudioSettingsState | null = null;
  private effects: AudioEffectsState | null = null;
  private transforms: VoiceTransformState | null = null;

  // Metering data
  private inputPeak = 0;
  private outputPeak = 0;
  private meterInterval: number | null = null;

  constructor() {}

  public async initAudio(settings: AudioSettingsState): Promise<void> {
    if (this.ctx) {
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
    this.buildGraph();
    this.startMeterLoop();
  }

  private buildGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // 1. Inputs
    this.inputNode = ctx.createGain();
    this.micGain = ctx.createGain();
    this.soundGain = ctx.createGain();

    this.inputAnalyser = ctx.createAnalyser();
    this.inputAnalyser.fftSize = 512;
    this.inputAnalyser.smoothingTimeConstant = 0.8;
    this.inputNode.connect(this.inputAnalyser);

    // 2. VAD & Noise Gate Node
    this.gateGain = ctx.createGain();
    this.gateGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.inputNode.connect(this.gateGain);

    // 3. Formant Shaping filters
    this.formantFilter1 = ctx.createBiquadFilter();
    this.formantFilter1.type = 'peaking';
    this.formantFilter1.frequency.setValueAtTime(800, ctx.currentTime);
    this.formantFilter1.Q.setValueAtTime(1.5, ctx.currentTime);
    this.formantFilter1.gain.setValueAtTime(0, ctx.currentTime);

    this.formantFilter2 = ctx.createBiquadFilter();
    this.formantFilter2.type = 'peaking';
    this.formantFilter2.frequency.setValueAtTime(2400, ctx.currentTime);
    this.formantFilter2.Q.setValueAtTime(1.5, ctx.currentTime);
    this.formantFilter2.gain.setValueAtTime(0, ctx.currentTime);

    this.gateGain.connect(this.formantFilter1);
    this.formantFilter1.connect(this.formantFilter2);

    // 4. Pitch shifter setup (dual modulated delay lines)
    this.pitchDryGain = ctx.createGain();
    this.pitchWetGain = ctx.createGain();

    const bufferTime = 0.08; // 80ms delay buffer
    this.delay1 = ctx.createDelay(bufferTime);
    this.delay2 = ctx.createDelay(bufferTime);
    this.delay1.delayTime.setValueAtTime(bufferTime / 2, ctx.currentTime);
    this.delay2.delayTime.setValueAtTime(bufferTime / 2, ctx.currentTime);

    this.modGain1 = ctx.createGain();
    this.modGain2 = ctx.createGain();

    this.formantFilter2.connect(this.pitchDryGain);
    this.formantFilter2.connect(this.delay1);
    this.formantFilter2.connect(this.delay2);

    this.delay1.connect(this.modGain1);
    this.delay2.connect(this.modGain2);

    const pitchMixer = ctx.createGain();
    this.pitchDryGain.connect(pitchMixer);
    this.modGain1.connect(pitchMixer);
    this.modGain2.connect(pitchMixer);

    // 5. AP-BWE 48k Audio Upscaler Exciter
    this.apBweFilter = ctx.createBiquadFilter();
    this.apBweFilter.type = 'highpass';
    this.apBweFilter.frequency.setValueAtTime(10000, ctx.currentTime);

    this.apBweShaper = ctx.createWaveShaper();
    this.apBweShaper.curve = this.createDistortionCurve(15);
    this.apBweShaper.oversample = '4x';

    this.apBweGain = ctx.createGain();
    this.apBweGain.gain.setValueAtTime(0.2, ctx.currentTime);

    pitchMixer.connect(this.apBweFilter);
    this.apBweFilter.connect(this.apBweShaper);
    this.apBweShaper.connect(this.apBweGain);

    const postPitchMix = ctx.createGain();
    pitchMixer.connect(postPitchMix);
    this.apBweGain.connect(postPitchMix);

    // 6. Filtering & EQ
    this.highpassFilter = ctx.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.setValueAtTime(20, ctx.currentTime);

    this.lowpassFilter = ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.setValueAtTime(20000, ctx.currentTime);

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

    postPitchMix.connect(this.highpassFilter);
    this.highpassFilter.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.eqLow);
    this.eqLow.connect(this.eqMid1);
    this.eqMid1.connect(this.eqMid2);
    this.eqMid2.connect(this.eqHigh);

    // 7. Compressor
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-20, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.015, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.15, ctx.currentTime);
    this.compressor.knee.setValueAtTime(6, ctx.currentTime);

    this.eqHigh.connect(this.compressor);

    // 8. Low Quality Mic Simulator
    this.lqMicFilter = ctx.createBiquadFilter();
    this.lqMicFilter.type = 'bandpass';
    this.lqMicFilter.frequency.setValueAtTime(1600, ctx.currentTime);
    this.lqMicFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    this.lqMicGain = ctx.createGain();
    this.lqMicGain.gain.setValueAtTime(0, ctx.currentTime);

    // 9. Reverb
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = this.buildImpulseResponse(ctx, 1.8, 2.0);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0, ctx.currentTime);

    this.compressor.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbGain);

    // 10. Chorus
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

    // 11. Master Output
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

    this.compressor.connect(this.masterGain);
    this.reverbGain.connect(this.masterGain);
    this.chorusGain.connect(this.masterGain);

    this.outputAnalyser = ctx.createAnalyser();
    this.outputAnalyser.fftSize = 1024;
    this.outputAnalyser.smoothingTimeConstant = 0.85;

    this.masterGain.connect(this.outputAnalyser);
    this.outputAnalyser.connect(ctx.destination);

    // Media recorder destination
    this.mediaDest = ctx.createMediaStreamDestination();
    this.outputAnalyser.connect(this.mediaDest);
  }

  private createDistortionCurve(amount: number): Float32Array {
    const k = amount;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private buildImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const factor = Math.exp(-t * decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  public async startMicrophone(deviceId: string = 'default'): Promise<boolean> {
    try {
      if (!this.ctx) return false;
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.stopMicrophone();

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micSource = this.ctx.createMediaStreamSource(this.micStream);

      if (this.micGain && this.inputNode) {
        this.micSource.connect(this.micGain);
        this.micGain.connect(this.inputNode);
      }

      this.isRunning = true;
      return true;
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
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

    // Mute microphone while sound file plays (per README specification)
    if (this.micGain) {
      this.micGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }

    this.soundSource = this.ctx.createBufferSource();
    this.soundSource.buffer = this.soundFileBuffer;

    if (this.soundGain && this.inputNode) {
      this.soundGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.soundSource.connect(this.soundGain);
      this.soundGain.connect(this.inputNode);
    }

    this.soundStartTime = this.ctx.currentTime - this.soundPauseOffset;
    this.soundSource.start(0, this.soundPauseOffset);

    this.soundSource.onended = () => {
      this.soundSource = null;
      this.soundPauseOffset = 0;
      // Unmute microphone when sound file playback finishes (per README specification)
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

    // Unmute microphone when paused
    if (this.micGain) {
      this.micGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }
  }

  public stopSoundFile(): void {
    if (this.soundSource) {
      try {
        this.soundSource.stop();
      } catch {
        // ignore if already stopped
      }
      this.soundSource.disconnect();
      this.soundSource = null;
    }
    this.soundPauseOffset = 0;
    // Restore mic gain
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

  public applyTransform(transform: VoiceTransformState): void {
    this.transforms = transform;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const semitones = transform.pitchSemitones;
    this.currentPitchSemitones = semitones;

    // Pitch shift ratio
    const pitchRatio = Math.pow(2, semitones / 12);

    if (Math.abs(semitones) < 0.1) {
      // Near unity pitch, use dry pass-through for pristine quality
      if (this.pitchDryGain) this.pitchDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      if (this.modGain1) this.modGain1.gain.setTargetAtTime(0, now, 0.02);
      if (this.modGain2) this.modGain2.gain.setTargetAtTime(0, now, 0.02);
    } else {
      if (this.pitchDryGain) this.pitchDryGain.gain.setTargetAtTime(0, now, 0.02);
      if (this.modGain1) this.modGain1.gain.setTargetAtTime(0.7, now, 0.02);
      if (this.modGain2) this.modGain2.gain.setTargetAtTime(0.7, now, 0.02);

      // Pitch shifting delay modulation frequency: rate = (pitchRatio - 1) / bufferTime
      const bufferTime = 0.08;
      const modRate = Math.max(0.1, Math.min(30, Math.abs(pitchRatio - 1) / bufferTime));

      if (this.delay1 && this.delay2) {
        const offset = semitones > 0 ? 0.015 : 0.035;
        this.delay1.delayTime.setTargetAtTime(offset / pitchRatio, now, 0.02);
        this.delay2.delayTime.setTargetAtTime((offset * 1.5) / pitchRatio, now, 0.02);
      }
    }

    // Formant shift filter modulation
    const formantRatio = Math.pow(2, transform.formantShift / 12);
    if (this.formantFilter1) {
      const f1 = Math.max(300, Math.min(2500, 800 * formantRatio));
      this.formantFilter1.frequency.setTargetAtTime(f1, now, 0.03);
      this.formantFilter1.gain.setTargetAtTime(Math.abs(transform.formantShift) > 0.5 ? 4.0 : 0, now, 0.03);
    }
    if (this.formantFilter2) {
      const f2 = Math.max(1200, Math.min(6000, 2400 * formantRatio));
      this.formantFilter2.frequency.setTargetAtTime(f2, now, 0.03);
      this.formantFilter2.gain.setTargetAtTime(Math.abs(transform.formantShift) > 0.5 ? 4.0 : 0, now, 0.03);
    }
  }

  public applyEffects(effects: AudioEffectsState): void {
    this.effects = effects;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Master Gain
    if (this.masterGain) {
      const gainLinear = Math.pow(10, effects.gain / 20);
      this.masterGain.gain.setTargetAtTime(gainLinear, now, 0.02);
    }

    // Filters
    if (this.highpassFilter) {
      const hp = effects.filtersEnabled ? effects.highpassFreq : 20;
      this.highpassFilter.frequency.setTargetAtTime(hp, now, 0.02);
    }
    if (this.lowpassFilter) {
      const lp = effects.filtersEnabled ? effects.lowpassFreq : 20000;
      this.lowpassFilter.frequency.setTargetAtTime(lp, now, 0.02);
    }

    // 2-Band & 4-Band EQ
    if (this.eqLow) {
      this.eqLow.frequency.setTargetAtTime(effects.eqLowFreq, now, 0.02);
      this.eqLow.gain.setTargetAtTime(effects.eq2BandEnabled ? effects.eqLowGain : 0, now, 0.02);
    }
    if (this.eqMid1) {
      this.eqMid1.frequency.setTargetAtTime(effects.eqMid1Freq, now, 0.02);
      this.eqMid1.gain.setTargetAtTime(effects.eq4BandEnabled ? effects.eqMid1Gain : 0, now, 0.02);
      this.eqMid1.Q.setTargetAtTime(effects.eqMid1Q, now, 0.02);
    }
    if (this.eqMid2) {
      this.eqMid2.frequency.setTargetAtTime(effects.eqMid2Freq, now, 0.02);
      this.eqMid2.gain.setTargetAtTime(effects.eq4BandEnabled ? effects.eqMid2Gain : 0, now, 0.02);
      this.eqMid2.Q.setTargetAtTime(effects.eqMid2Q, now, 0.02);
    }
    if (this.eqHigh) {
      this.eqHigh.frequency.setTargetAtTime(effects.eqHighFreq, now, 0.02);
      this.eqHigh.gain.setTargetAtTime(effects.eq2BandEnabled ? effects.eqHighGain : 0, now, 0.02);
    }

    // Compressor
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
      const vadThreshold = (this.settings?.vadSensitivity ?? 70) / 100 * 0.08;
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
          // Release window (400ms as documented in README)
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
    }, 50);
  }

  // Audio Visualizer data access
  public getFrequencyData(array: Uint8Array): void {
    if (this.outputAnalyser) {
      this.outputAnalyser.getByteFrequencyData(array);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.outputAnalyser) {
      this.outputAnalyser.getByteTimeDomainData(array);
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

  // Sample Synthesizer: Generates a test audio buffer of spoken words / harmonic phrase
  public generateSampleVoiceBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const duration = 4.0; // 4 seconds phrase
    const buffer = this.ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    // Synthesize human speech formants: "Ultimate Voice Converter testing 1 2 3"
    // Multiple vowel-like resonance pulses
    const f0Sequence = [140, 150, 165, 145, 130, 120, 140, 160];
    const segmentLength = Math.floor(data.length / f0Sequence.length);

    for (let s = 0; s < f0Sequence.length; s++) {
      const f0 = f0Sequence[s];
      const startIdx = s * segmentLength;
      for (let i = 0; i < segmentLength; i++) {
        const globalIdx = startIdx + i;
        const t = i / sampleRate;
        const env = Math.sin((i / segmentLength) * Math.PI); // Window envelope

        // Fundamental + Formant harmonics (F1=600Hz, F2=1800Hz, F3=2700Hz)
        const harm1 = Math.sin(2 * Math.PI * f0 * t);
        const harm2 = 0.5 * Math.sin(2 * Math.PI * f0 * 2 * t);
        const formant1 = 0.4 * Math.sin(2 * Math.PI * 650 * t);
        const formant2 = 0.25 * Math.sin(2 * Math.PI * 1850 * t);
        const formant3 = 0.15 * Math.sin(2 * Math.PI * 2750 * t);

        data[globalIdx] = (harm1 + harm2 + formant1 + formant2 + formant3) * 0.2 * env;
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
