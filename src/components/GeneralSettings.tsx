import React from 'react';
import { Cpu, Layers, HardDrive, Settings, Box } from 'lucide-react';
import { AudioSettingsState, BlockSizeType, EmbedderType, PitchExtractorType, RvcModel, SampleRateType } from '../types';

interface GeneralSettingsProps {
  settings: AudioSettingsState;
  models: RvcModel[];
  selectedModel: RvcModel;
  onSelectModel: (model: RvcModel) => void;
  onOpenModelModal: () => void;
  onUpdateSettings: (newSettings: Partial<AudioSettingsState>) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  models,
  selectedModel,
  onSelectModel,
  onOpenModelModal,
  onUpdateSettings,
}) => {
  const blockSizes: BlockSizeType[] = [64, 128, 256, 512, 1024, 2048];

  const getBlockLatencyMs = (size: number, rate: number) => {
    return ((size / rate) * 1000).toFixed(1);
  };

  return (
    <div id="general-settings-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">General Model & CUDA Settings</h2>
        </div>
        <button
          onClick={onOpenModelModal}
          className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition"
        >
          + Load Custom .pth
        </button>
      </div>

      {/* Model Selection Dropdown & Info Card */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
          <span>Active RVC v2 Voice Model</span>
          <span className="text-[10px] text-zinc-500 font-mono">PyTorch 2.7 / RVCv2</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {models.map((model) => {
            const isSelected = model.id === selectedModel.id;
            return (
              <button
                key={model.id}
                onClick={() => onSelectModel(model)}
                className={`text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40 text-amber-200'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 truncate">{model.name}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                    {model.sampleRate / 1000}k
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                  <span>{model.embedder.toUpperCase()}</span>
                  <span>•</span>
                  <span>{model.pitchExtractor.toUpperCase()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Embedder & Pitch Extractor Specifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
        {/* Embedder Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Speech Embedder</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['contentvec', 'spin'] as EmbedderType[]).map((type) => (
              <button
                key={type}
                onClick={() => onSelectModel({ ...selectedModel, embedder: type })}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition ${
                  selectedModel.embedder === type
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {type === 'contentvec' ? 'ContentVec' : 'SPIN'}
              </button>
            ))}
          </div>
        </div>

        {/* Pitch Extractor Algorithm */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-500" />
            <span>F0 Pitch Extractor</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['rmvpe', 'fcpe', 'swiftf0'] as PitchExtractorType[]).map((type) => (
              <button
                key={type}
                onClick={() => onSelectModel({ ...selectedModel, pitchExtractor: type })}
                className={`py-1.5 px-1 rounded-lg text-xs font-medium border text-center transition uppercase font-mono ${
                  selectedModel.pitchExtractor === type
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Block Size Selection */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <div className="flex justify-between items-baseline">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-amber-500" />
            <span>CUDA Block Size (Samples)</span>
          </label>
          <span className="text-[11px] font-mono text-amber-400">
            {settings.blockSize} samples (~{getBlockLatencyMs(settings.blockSize, settings.sampleRate)} ms)
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {blockSizes.map((size) => {
            const isSelected = settings.blockSize === size;
            return (
              <button
                key={size}
                onClick={() => onUpdateSettings({ blockSize: size })}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium border text-center transition ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/30 font-bold'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-500">
          Lower block sizes reduce latency for fast GPUs. 256 is recommended for low latency stability.
        </p>
      </div>

      {/* Lookahead Buffer Slider */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
        <div className="flex justify-between items-baseline">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-500" />
            <span>Lookahead Context Buffer</span>
          </label>
          <span className="text-xs font-mono font-bold text-amber-400">
            {settings.lookaheadBuffer.toFixed(1)}x
          </span>
        </div>
        <input
          id="slider-lookahead"
          type="range"
          min={1.0}
          max={4.0}
          step={0.1}
          value={settings.lookaheadBuffer}
          onChange={(e) => onUpdateSettings({ lookaheadBuffer: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-zinc-950 rounded-lg cursor-pointer"
        />
        <p className="text-[10px] text-zinc-500">
          Recommended: 2.0 for best quality/latency ratio. Provides context window for F0 extraction.
        </p>
      </div>
    </div>
  );
};
