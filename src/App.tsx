import React, { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { PitchControl } from './components/PitchControl';
import { SoundFilePlayer } from './components/SoundFilePlayer';
import { GeneralSettings } from './components/GeneralSettings';
import { AudioSettings } from './components/AudioSettings';
import { EffectsRack } from './components/EffectsRack';
import { ModelManagerModal } from './components/ModelManagerModal';
import { audioEngine } from './audio/audioEngine';
import {
  DEFAULT_RVC_MODELS,
  INITIAL_AUDIO_EFFECTS,
  INITIAL_AUDIO_SETTINGS,
  INITIAL_VOICE_TRANSFORM,
} from './audio/defaultPresets';
import { AudioEffectsState, AudioSettingsState, EngineStats, RvcModel, VoiceTransformState } from './types';

export const App: React.FC = () => {
  // State
  const [models, setModels] = useState<RvcModel[]>(DEFAULT_RVC_MODELS);
  const [selectedModel, setSelectedModel] = useState<RvcModel>(DEFAULT_RVC_MODELS[0]);
  const [settings, setSettings] = useState<AudioSettingsState>(INITIAL_AUDIO_SETTINGS);
  const [transform, setTransform] = useState<VoiceTransformState>(INITIAL_VOICE_TRANSFORM);
  const [effects, setEffects] = useState<AudioEffectsState>(INITIAL_AUDIO_EFFECTS);

  const [isEngineActive, setIsEngineActive] = useState<boolean>(false);
  const [isSoundFilePlaying, setIsSoundFilePlaying] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);

  const [stats, setStats] = useState<EngineStats>({
    isActive: false,
    isMicActive: false,
    isSoundFileActive: false,
    calculatedLatencyMs: 18.2,
    inputPeakLevel: 0,
    outputPeakLevel: 0,
    speechDetected: false,
    isRecording: false,
    recordingDuration: 0,
  });

  const recordingTimerRef = useRef<number | null>(null);

  // Compute live latency based on block size + lookahead
  useEffect(() => {
    const blockMs = (settings.blockSize / settings.sampleRate) * 1000;
    const lookaheadMs = blockMs * (settings.lookaheadBuffer - 1.0);
    const estimatedTotal = Math.max(8.0, blockMs + lookaheadMs + 6.0); // includes CUDA pipeline & DAC buffer
    setStats((prev) => ({ ...prev, calculatedLatencyMs: estimatedTotal }));
  }, [settings.blockSize, settings.sampleRate, settings.lookaheadBuffer]);

  // Sync settings, transforms, and effects to audio engine whenever they change
  useEffect(() => {
    audioEngine.applyTransform(transform);
  }, [transform]);

  useEffect(() => {
    audioEngine.applyEffects(effects);
  }, [effects]);

  useEffect(() => {
    audioEngine.applySettings(settings);
  }, [settings]);

  // Polling loop for VU meters & VAD status
  useEffect(() => {
    let animId: number;
    const checkPeaks = () => {
      const peaks = audioEngine.getMeterPeaks();
      setStats((prev) => ({
        ...prev,
        inputPeakLevel: peaks.inPeak,
        outputPeakLevel: peaks.outPeak,
        speechDetected: peaks.speech,
      }));
      animId = requestAnimationFrame(checkPeaks);
    };

    if (isEngineActive) {
      animId = requestAnimationFrame(checkPeaks);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isEngineActive]);

  const ensureEngineStarted = async () => {
    await audioEngine.initAudio(settings);
    audioEngine.applyTransform(transform);
    audioEngine.applyEffects(effects);
    audioEngine.applySettings(settings);
  };

  const handleToggleEngine = async () => {
    if (isEngineActive) {
      // Stop engine
      audioEngine.stopMicrophone();
      audioEngine.stopSoundFile();
      setIsEngineActive(false);
      setStats((prev) => ({
        ...prev,
        isActive: false,
        isMicActive: false,
        isSoundFileActive: false,
      }));
    } else {
      // Start engine with mic
      await ensureEngineStarted();
      const success = await audioEngine.startMicrophone(settings.inputDeviceId);
      setIsEngineActive(true);
      setStats((prev) => ({
        ...prev,
        isActive: true,
        isMicActive: success,
      }));
    }
  };

  const handleSoundPlayingStateChange = (playing: boolean) => {
    setIsSoundFilePlaying(playing);
    setStats((prev) => ({
      ...prev,
      isSoundFileActive: playing,
    }));
  };

  const handleToggleRecording = () => {
    if (!stats.isRecording) {
      const started = audioEngine.startRecording();
      if (started) {
        setStats((prev) => ({ ...prev, isRecording: true, recordingDuration: 0 }));
        recordingTimerRef.current = window.setInterval(() => {
          setStats((prev) => ({ ...prev, recordingDuration: prev.recordingDuration + 1 }));
        }, 1000);
      }
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      const blob = audioEngine.stopRecording();
      setStats((prev) => ({ ...prev, isRecording: false, recordingDuration: 0 }));

      if (blob) {
        // Trigger auto-download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UltimateVC_Converted_${selectedModel.name.replace(/\s+/g, '_')}_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleResetDefaults = () => {
    setSettings(INITIAL_AUDIO_SETTINGS);
    setTransform(INITIAL_VOICE_TRANSFORM);
    setEffects(INITIAL_AUDIO_EFFECTS);
    audioEngine.applySettings(INITIAL_AUDIO_SETTINGS);
    audioEngine.applyTransform(INITIAL_VOICE_TRANSFORM);
    audioEngine.applyEffects(INITIAL_AUDIO_EFFECTS);
  };

  const handleAddCustomModel = (model: RvcModel) => {
    setModels((prev) => [model, ...prev]);
    setSelectedModel(model);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      {/* Top Navigation & Status Bar */}
      <Header
        stats={stats}
        isEngineActive={isEngineActive}
        onToggleEngine={handleToggleEngine}
        onToggleRecording={handleToggleRecording}
        onResetDefaults={handleResetDefaults}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* Realtime Dual Visualizer & Peak Meters */}
        <Visualizer stats={stats} isEngineActive={isEngineActive} />

        {/* Primary Controls Row: Pitch & Formant and Realtime Sound File Inferencing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PitchControl transform={transform} onChange={setTransform} />
          <SoundFilePlayer
            isEngineActive={isEngineActive}
            onEnsureEngineStarted={ensureEngineStarted}
            onSoundPlayingStateChange={handleSoundPlayingStateChange}
          />
        </div>

        {/* Core RVC Configuration: General Model Settings and Audio I/O */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <GeneralSettings
            settings={settings}
            models={models}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            onOpenModelModal={() => setIsModelModalOpen(true)}
            onUpdateSettings={(newPartial) => setSettings((prev) => ({ ...prev, ...newPartial }))}
          />

          <AudioSettings
            settings={settings}
            onUpdateSettings={(newPartial) => setSettings((prev) => ({ ...prev, ...newPartial }))}
          />
        </div>

        {/* Studio Audio DSP Effects Rack */}
        <EffectsRack effects={effects} onChange={setEffects} />
      </main>

      {/* Model Loader Modal */}
      <ModelManagerModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        onAddCustomModel={handleAddCustomModel}
        currentModel={selectedModel}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 px-6 text-center text-xs text-zinc-500">
        <p>UltimateVC / Vonovox • Realtime AI Voice Converter for RVC Models • Web Audio DSP & CUDA Accelerated Pipeline</p>
      </footer>
    </div>
  );
};

export default App;
