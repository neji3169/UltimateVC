import React from 'react';
import { Volume2, Sliders, Sparkles, RefreshCw, Play } from 'lucide-react';
import { VoiceTransformState } from '../types';

interface PitchControlProps {
  transform: VoiceTransformState;
  onChange: (newTransform: VoiceTransformState) => void;
  onTestVoice?: () => void;
}

export const PitchControl: React.FC<PitchControlProps> = ({ transform, onChange, onTestVoice }) => {
  const getIntervalLabel = (semitones: number) => {
    if (semitones === 0) return 'Original Key (0 st)';
    if (semitones === 12) return '+1 Octave (Female shift)';
    if (semitones === -12) return '-1 Octave (Male shift)';
    if (semitones === 7) return '+Perfect 5th';
    if (semitones === -7) return '-Perfect 5th';
    if (semitones > 0) return `+${semitones} Semitones Higher`;
    return `${semitones} Semitones Lower`;
  };

  const setPitch = (val: number) => {
    onChange({ ...transform, pitchSemitones: val });
  };

  const setFormant = (val: number) => {
    onChange({ ...transform, formantShift: val });
  };

  const setIndexRate = (val: number) => {
    onChange({ ...transform, indexRate: val });
  };

  return (
    <div id="pitch-control-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Pitch & Formant Voice Modulation</h2>
        </div>
        <div className="flex items-center gap-2">
          {onTestVoice && (
            <button
              onClick={onTestVoice}
              title="Play test speech sample through the current pitch shifter and 10-band EQ"
              className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition font-medium"
            >
              <Play className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Preview Voice</span>
            </button>
          )}
          <button
            onClick={() => onChange({ pitchSemitones: 0, formantShift: 0, indexRate: 0.75 })}
            className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition"
            title="Reset to normal voice"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Pitch Shift Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-200">Pitch Shift</span>
            <span className="text-xs text-zinc-500 font-mono">(-24 to +24 st)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400">{getIntervalLabel(transform.pitchSemitones)}</span>
            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-400 min-w-14 text-center">
              {transform.pitchSemitones > 0 ? `+${transform.pitchSemitones}` : transform.pitchSemitones} st
            </span>
          </div>
        </div>

        <input
          id="slider-pitch-shift"
          type="range"
          min={-24}
          max={24}
          step={1}
          value={transform.pitchSemitones}
          title={`Pitch shift: ${transform.pitchSemitones > 0 ? '+' : ''}${transform.pitchSemitones} semitones`}
          onChange={(e) => setPitch(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-zinc-950 rounded-lg cursor-pointer accent-amber-500"
        />

        {/* Quick Pitch Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            onClick={() => setPitch(-12)}
            title="Male conversion preset (-12 semitones / 1 octave down)"
            className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
              transform.pitchSemitones === -12
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Male (-12 st)
          </button>
          <button
            onClick={() => setPitch(-7)}
            title="Deep masculine voice preset (-7 semitones)"
            className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
              transform.pitchSemitones === -7
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Deep (-7 st)
          </button>
          <button
            onClick={() => setPitch(0)}
            title="Original natural pitch (0 semitones)"
            className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
              transform.pitchSemitones === 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Original (0 st)
          </button>
          <button
            onClick={() => setPitch(8)}
            title="Slight high pitch (+8 semitones)"
            className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
              transform.pitchSemitones === 8
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            High (+8 st)
          </button>
          <button
            onClick={() => setPitch(12)}
            title="Female conversion preset (+12 semitones / 1 octave up)"
            className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${
              transform.pitchSemitones === 12
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Female (+12 st)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
        {/* Formant Shift Slider */}
        <div className="space-y-1.5" title="Alters vocal tract length and resonance characteristics without modifying pitch key">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-zinc-300">Formant Shift</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {transform.formantShift > 0 ? `+${transform.formantShift}` : transform.formantShift}
            </span>
          </div>
          <input
            id="slider-formant-shift"
            type="range"
            min={-12}
            max={12}
            step={0.5}
            value={transform.formantShift}
            title={`Formant shift: ${transform.formantShift > 0 ? '+' : ''}${transform.formantShift}`}
            onChange={(e) => setFormant(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-950 rounded-lg cursor-pointer accent-amber-500"
          />
          <p className="text-[10px] text-zinc-500">Alters vocal tract resonance without affecting pitch</p>
        </div>

        {/* Index Feature Rate */}
        <div className="space-y-1.5" title="Feature Retrieval Index ratio: controls target voice similarity and accent match">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-zinc-300">Feature Index Rate</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {(transform.indexRate * 100).toFixed(0)}%
            </span>
          </div>
          <input
            id="slider-index-rate"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={transform.indexRate}
            title={`Index retrieval weight: ${(transform.indexRate * 100).toFixed(0)}%`}
            onChange={(e) => setIndexRate(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-950 rounded-lg cursor-pointer accent-amber-500"
          />
          <p className="text-[10px] text-zinc-500">Balance between voice timbre accuracy and source accent</p>
        </div>
      </div>
    </div>
  );
};
