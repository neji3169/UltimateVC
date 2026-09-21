export type EmbedderType = 'contentvec' | 'spin';
export type PitchExtractorType = 'rmvpe' | 'fcpe' | 'swiftf0';
export type SampleRateType = 32000 | 40000 | 48000;
export type BlockSizeType = 64 | 128 | 256 | 512 | 1024 | 2048;

export interface RvcModel {
  id: string;
  name: string;
  author: string;
  embedder: EmbedderType;
  pitchExtractor: PitchExtractorType;
  sampleRate: SampleRateType;
  description: string;
  isCustom?: boolean;
  filename?: string;
  indexRate?: number;
}

export interface AudioSettingsState {
  inputDeviceId: string;
  outputDeviceId: string;
  sampleRate: SampleRateType;
  blockSize: BlockSizeType;
  lookaheadBuffer: number;
  rnnoiseEnabled: boolean;
  rnnoiseSensitivity: number; // 0 to 100
  sileroVadEnabled: boolean;
  vadSensitivity: number; // 0 to 100
  vadReleaseMs: number; // Default 400ms from README
  apBweUpscaling: boolean; // 48k bandwidth extension
  exclusiveMode: boolean;
  selfMonitoringEnabled: boolean; // Controls whether user hears their own voice through headphones (Direct monitoring)
}

export interface VoiceTransformState {
  pitchSemitones: number; // -24 to +24
  formantShift: number; // -12 to +12
  indexRate: number; // 0 to 1.0
}

export interface AudioEffectsState {
  // Free / Basic
  gain: number; // dB -24 to +24
  noiseGateEnabled: boolean;
  noiseGateThreshold: number; // dB -80 to 0
  eq2BandEnabled: boolean;
  eqLowGain: number; // dB -15 to +15
  eqLowFreq: number; // Hz 80 to 300
  eqHighGain: number; // dB -15 to +15
  eqHighFreq: number; // Hz 3000 to 12000

  // Studio / Patron Effects
  compressorEnabled: boolean;
  compressorThreshold: number; // dB -60 to 0
  compressorRatio: number; // 1 to 20
  compressorAttack: number; // seconds 0.001 to 0.1
  compressorRelease: number; // seconds 0.05 to 1.0
  compressorKnee: number; // dB 0 to 40

  filtersEnabled: boolean;
  highpassFreq: number; // Hz 20 to 1000
  lowpassFreq: number; // Hz 2000 to 20000

  eq4BandEnabled: boolean;
  eqMid1Freq: number; // Hz 200 to 2000
  eqMid1Gain: number; // dB -15 to +15
  eqMid1Q: number; // 0.1 to 10
  eqMid2Freq: number; // Hz 1000 to 8000
  eqMid2Gain: number; // dB -15 to +15
  eqMid2Q: number; // 0.1 to 10

  reverbEnabled: boolean;
  reverbRoomSize: number; // 0.1 to 0.95
  reverbDamping: number; // 0.1 to 0.9
  reverbWet: number; // 0 to 1.0

  chorusEnabled: boolean;
  chorusRate: number; // Hz 0.1 to 10
  chorusDepth: number; // 0 to 1.0
  chorusWet: number; // 0 to 1.0

  lowQualityMicEnabled: boolean;
  lowQualityMicIntensity: number; // 0 to 1.0

  // 10-Band Precision Mastering EQ & Female Voice Presets
  eq10BandEnabled: boolean;
  eq10Gains: number[]; // 10 bands: [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] Hz
  femalePresetActive: string | null; // 'anime' | 'natural' | 'bright' | 'compensator' | null
}

export interface SoundFileState {
  loadedFileName: string | null;
  fileBuffer: AudioBuffer | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  isCustomLoaded: boolean;
}

export interface EngineStats {
  isActive: boolean;
  isMicActive: boolean;
  isSoundFileActive: boolean;
  calculatedLatencyMs: number;
  inputPeakLevel: number;
  outputPeakLevel: number;
  speechDetected: boolean;
  isRecording: boolean;
  recordingDuration: number;
}
