import { AudioEffectsState, AudioSettingsState, RvcModel, VoiceTransformState } from '../types';

export const DEFAULT_RVC_MODELS: RvcModel[] = [
  {
    id: 'rvc-anime-f',
    name: 'Yuki - Anime Protagonist (48k)',
    author: 'dr87 / Vonovox',
    embedder: 'contentvec',
    pitchExtractor: 'rmvpe',
    sampleRate: 48000,
    description: 'Crisp female vocal model trained on 15 hours of high-fidelity studio voice acting.',
    indexRate: 0.75,
  },
  {
    id: 'rvc-radio-m',
    name: 'Marcus - Deep Radio Host (48k)',
    author: 'dr87 / Vonovox',
    embedder: 'contentvec',
    pitchExtractor: 'rmvpe',
    sampleRate: 48000,
    description: 'Warm broadcast baritone voice with rich lower resonances, ideal for podcasts.',
    indexRate: 0.85,
  },
  {
    id: 'rvc-vocal-pop',
    name: 'Serena - Pop Vocalist (40k)',
    author: 'dr87 / Vonovox',
    embedder: 'spin',
    pitchExtractor: 'fcpe',
    sampleRate: 40000,
    description: 'Dynamic pop singing model with wide pitch agility, trained with SPIN & FCPE.',
    indexRate: 0.65,
  },
  {
    id: 'rvc-cyber-synth',
    name: 'Nexus - Cyberpunk Synth (48k)',
    author: 'dr87 / Vonovox',
    embedder: 'contentvec',
    pitchExtractor: 'swiftf0',
    sampleRate: 48000,
    description: 'Electronic modulated voice tone with robotic texture and low latency tracking.',
    indexRate: 0.70,
  },
];

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
};
