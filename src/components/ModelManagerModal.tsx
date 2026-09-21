import React, { useState } from 'react';
import { X, Upload, CheckCircle2, FileCode, AlertCircle } from 'lucide-react';
import { EmbedderType, PitchExtractorType, RvcModel, SampleRateType } from '../types';

interface ModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomModel: (model: RvcModel) => void;
  currentModel: RvcModel;
}

export const ModelManagerModal: React.FC<ModelManagerModalProps> = ({
  isOpen,
  onClose,
  onAddCustomModel,
  currentModel,
}) => {
  const [modelName, setModelName] = useState('');
  const [embedder, setEmbedder] = useState<EmbedderType>('contentvec');
  const [pitchExtractor, setPitchExtractor] = useState<PitchExtractorType>('rmvpe');
  const [sampleRate, setSampleRate] = useState<SampleRateType>(48000);
  const [pthFileName, setPthFileName] = useState<string | null>(null);
  const [indexFileName, setIndexFileName] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePthUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPthFileName(file.name);
      if (!modelName) {
        // Auto-fill model name from filename
        const cleanName = file.name.replace(/\.pth$/i, '').replace(/_/g, ' ');
        setModelName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleIndexUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIndexFileName(file.name);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim() && !pthFileName) return;

    const newModel: RvcModel = {
      id: `custom-${Date.now()}`,
      name: modelName.trim() || pthFileName || 'Custom Imported Model',
      author: 'User Imported',
      embedder,
      pitchExtractor,
      sampleRate,
      description: `User-imported RVC v2 model (${sampleRate / 1000}k) using ${embedder.toUpperCase()} & ${pitchExtractor.toUpperCase()}.`,
      isCustom: true,
      filename: pthFileName || undefined,
      indexRate: 0.75,
    };

    onAddCustomModel(newModel);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
              PTH
            </div>
            <h3 className="font-bold text-zinc-100 text-sm">Load Custom RVC v2 Model</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* File Upload Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* .pth file */}
            <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-xl p-3.5 text-center flex flex-col items-center justify-center gap-2 relative">
              <input
                type="file"
                accept=".pth,.bin,.pt"
                onChange={handlePthUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileCode className="w-6 h-6 text-amber-400" />
              <div className="text-xs font-semibold text-zinc-300">
                {pthFileName ? (
                  <span className="text-amber-400 truncate block max-w-40">{pthFileName}</span>
                ) : (
                  'Select Model (.pth)'
                )}
              </div>
              <span className="text-[10px] text-zinc-500">RVC v2 PyTorch weights</span>
            </div>

            {/* .index file */}
            <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-xl p-3.5 text-center flex flex-col items-center justify-center gap-2 relative">
              <input
                type="file"
                accept=".index"
                onChange={handleIndexUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileCode className="w-6 h-6 text-emerald-400" />
              <div className="text-xs font-semibold text-zinc-300">
                {indexFileName ? (
                  <span className="text-emerald-400 truncate block max-w-40">{indexFileName}</span>
                ) : (
                  'Select Index (.index)'
                )}
              </div>
              <span className="text-[10px] text-zinc-500">Optional FAISS index</span>
            </div>
          </div>

          {/* Model Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Model Display Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. Studio Vocalist v2"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Architecture parameters */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Embedder</label>
              <select
                value={embedder}
                onChange={(e) => setEmbedder(e.target.value as EmbedderType)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="contentvec">ContentVec</option>
                <option value="spin">SPIN</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Pitch Extract</label>
              <select
                value={pitchExtractor}
                onChange={(e) => setPitchExtractor(e.target.value as PitchExtractorType)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 uppercase font-mono"
              >
                <option value="rmvpe">RMVPE</option>
                <option value="fcpe">FCPE</option>
                <option value="swiftf0">SwiftF0</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Sample Rate</label>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(parseInt(e.target.value, 10) as SampleRateType)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value={48000}>48000 Hz</option>
                <option value={40000}>40000 Hz</option>
                <option value={32000}>32000 Hz</option>
              </select>
            </div>
          </div>

          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>RVC v2 models trained with RMVPE or FCPE pitch extraction produce the best realtime latency and timbre fidelity.</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!modelName.trim() && !pthFileName}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                  <span>Model Loaded!</span>
                </>
              ) : (
                <span>Add & Activate Model</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
