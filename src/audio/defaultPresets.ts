import { AudioEffectsState, AudioSettingsState, RvcModel, VoiceTransformState } from '../types';

// User requested removal of pre-defined models so only custom .pth models are used
export const DEFAULT_RVC_MODELS: RvcModel[] = [];

export const INITIAL_AUDIO_SETTINGS: AudioSettingsState = {
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  sampleRate: 48000,
  blockSize: 256,
  lookaheadBuffer: 2.0,
  rnnoiseEnabled: true,
  rnnoiseSensitivity: 65,
  sileroVadEnabled: true,
  vadSensitivity: 70,
  vadReleaseMs: 400, // Explicitly documented in README: 400ms release window
  apBweUpscaling: true, // AP-BWE 48k optional upscaling
  exclusiveMode: false,
  selfMonitoringEnabled: true, // Default ON: allows user to hear their transformed voice live in headphones. Can be muted with 1-click for Discord/VAC.
};

export const INITIAL_VOICE_TRANSFORM: VoiceTransformState = {
  pitchSemitones: 0,
  formantShift: 0,
  indexRate: 0.75,
};

export const INITIAL_AUDIO_EFFECTS: AudioEffectsState = {
  // Free / Basic
  gain: 0, // 0 dB
  noiseGateEnabled: true,
  noiseGateThreshold: -48, // dB
  eq2BandEnabled: false,
  eqLowGain: 0,
  eqLowFreq: 120,
  eqHighGain: 0,
  eqHighFreq: 6000,

  // Studio / Patron Effects
  compressorEnabled: true,
  compressorThreshold: -20,
  compressorRatio: 4,
  compressorAttack: 0.015,
  compressorRelease: 0.15,
  compressorKnee: 6,

  filtersEnabled: false,
  highpassFreq: 80,
  lowpassFreq: 16000,

  eq4BandEnabled: false,
  eqMid1Freq: 800,
  eqMid1Gain: 0,
  eqMid1Q: 1.0,
  eqMid2Freq: 3200,
  eqMid2Gain: 0,
  eqMid2Q: 1.0,

  reverbEnabled: false,
  reverbRoomSize: 0.4,
  reverbDamping: 0.5,
  reverbWet: 0.25,

  chorusEnabled: false,
  chorusRate: 1.5,
  chorusDepth: 0.35,
  chorusWet: 0.3,

  lowQualityMicEnabled: false,
  lowQualityMicIntensity: 0.6,

  // 10-Band EQ & Female Voice Defaults
  eq10BandEnabled: true,
  eq10Gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  femalePresetActive: null,
};
