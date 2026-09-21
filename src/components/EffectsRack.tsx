import React, { useState } from 'react';
import { Sliders, Crown, Sparkles, Volume2, Shield, Radio, Disc, Waves } from 'lucide-react';
import { AudioEffectsState } from '../types';

interface EffectsRackProps {
  effects: AudioEffectsState;
  onChange: (newEffects: AudioEffectsState) => void;
}

export const EffectsRack: React.FC<EffectsRackProps> = ({ effects, onChange }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'studio'>('basic');

  const update = (partial: Partial<AudioEffectsState>) => {
    onChange({ ...effects, ...partial });
  };

  return (
    <div id="effects-rack-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Audio Post-Processing DSP Rack</h2>
        </div>

        {/* Tab switch between Basic & Studio / Patron */}
        <div className="bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 flex text-xs">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              activeTab === 'basic' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Basic Effects
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'studio' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crown className="w-3 h-3" />
            <span>Studio / Patron Rack</span>
          </button>
        </div>
      </div>

      {/* Basic Effects View */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Master Output Gain */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Output Gain</span>
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {effects.gain > 0 ? `+${effects.gain}` : effects.gain} dB
              </span>
            </div>
            <input
              type="range"
              min={-24}
              max={24}
              step={0.5}
              value={effects.gain}
              onChange={(e) => update({ gain: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>-24 dB</span>
              <span>0 dB</span>
              <span>+24 dB</span>
            </div>
          </div>

          {/* Noise Gate */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Noise Gate</span>
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.noiseGateEnabled}
                  onChange={(e) => update({ noiseGateEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-400">
              <span>Threshold</span>
              <span className="font-mono text-amber-400">{effects.noiseGateThreshold} dB</span>
            </div>
            <input
              type="range"
              min={-70}
              max={-20}
              step={1}
              value={effects.noiseGateThreshold}
              onChange={(e) => update({ noiseGateThreshold: parseFloat(e.target.value) })}
              disabled={!effects.noiseGateEnabled}
              className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* 2-Band Equalizer */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-amber-500" />
                <span>2-Band EQ</span>
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.eq2BandEnabled}
                  onChange={(e) => update({ eq2BandEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <div className="flex justify-between text-zinc-400">
                  <span>Low Shelf</span>
                  <span className="font-mono text-amber-400">{effects.eqLowGain > 0 ? `+${effects.eqLowGain}` : effects.eqLowGain}dB</span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={effects.eqLowGain}
                  onChange={(e) => update({ eqLowGain: parseFloat(e.target.value) })}
                  disabled={!effects.eq2BandEnabled}
                  className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
                />
              </div>
              <div>
                <div className="flex justify-between text-zinc-400">
                  <span>High Shelf</span>
                  <span className="font-mono text-amber-400">{effects.eqHighGain > 0 ? `+${effects.eqHighGain}` : effects.eqHighGain}dB</span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={effects.eqHighGain}
                  onChange={(e) => update({ eqHighGain: parseFloat(e.target.value) })}
                  disabled={!effects.eq2BandEnabled}
                  className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Studio / Patron Effects View */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Dynamics Compressor */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">1. Compressor</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.compressorEnabled}
                  onChange={(e) => update({ compressorEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between text-zinc-400">
                <span>Threshold</span>
                <span className="font-mono text-amber-400">{effects.compressorThreshold} dB</span>
              </div>
              <input
                type="range"
                min={-60}
                max={0}
                step={1}
                value={effects.compressorThreshold}
                onChange={(e) => update({ compressorThreshold: parseFloat(e.target.value) })}
                disabled={!effects.compressorEnabled}
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
              />

              <div className="flex justify-between text-zinc-400">
                <span>Ratio</span>
                <span className="font-mono text-amber-400">{effects.compressorRatio}:1</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={effects.compressorRatio}
                onChange={(e) => update({ compressorRatio: parseFloat(e.target.value) })}
                disabled={!effects.compressorEnabled}
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* 2. Low & High Pass Filters */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">2. Low / High-Pass</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.filtersEnabled}
                  onChange={(e) => update({ filtersEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between text-zinc-400">
                <span>High-Pass Cutoff</span>
                <span className="font-mono text-amber-400">{effects.highpassFreq} Hz</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={5}
                value={effects.highpassFreq}
                onChange={(e) => update({ highpassFreq: parseFloat(e.target.value) })}
                disabled={!effects.filtersEnabled}
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
              />

              <div className="flex justify-between text-zinc-400">
                <span>Low-Pass Cutoff</span>
                <span className="font-mono text-amber-400">{effects.lowpassFreq} Hz</span>
              </div>
              <input
                type="range"
                min={4000}
                max={20000}
                step={200}
                value={effects.lowpassFreq}
                onChange={(e) => update({ lowpassFreq: parseFloat(e.target.value) })}
                disabled={!effects.filtersEnabled}
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* 3. Reverb & Space */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">3. Studio Reverb</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.reverbEnabled}
                  onChange={(e) => update({ reverbEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between text-zinc-400">
                <span>Wet Mix</span>
                <span className="font-mono text-amber-400">{Math.round(effects.reverbWet * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={effects.reverbWet}
                onChange={(e) => update({ reverbWet: parseFloat(e.target.value) })}
                disabled={!effects.reverbEnabled}
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* 4. Stereo Chorus */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">4. Stereo Chorus</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.chorusEnabled}
                  onChange={(e) => update({ chorusEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between text-zinc-400">
                <span>Modulation Rate</span>
                <span className="font-mono text-amber-400">{effects.chorusRate.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={6}
                step={0.1}
                value={effects.chorusRate}
                onChange={(e) => update({ chorusRate: parseFloat(e.target.value) })}
                disabled={!effects.chorusEnabled}
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* 5. 4-Band Parametric EQ (Mid-1 & Mid-2) */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">5. 4-Band Studio EQ</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.eq4BandEnabled}
                  onChange={(e) => update({ eq4BandEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <div className="flex justify-between text-zinc-400">
                  <span>Mid-1 (800Hz)</span>
                  <span className="font-mono text-amber-400">{effects.eqMid1Gain}dB</span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={effects.eqMid1Gain}
                  onChange={(e) => update({ eqMid1Gain: parseFloat(e.target.value) })}
                  disabled={!effects.eq4BandEnabled}
                  className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
                />
              </div>
              <div>
                <div className="flex justify-between text-zinc-400">
                  <span>Mid-2 (3.2kHz)</span>
                  <span className="font-mono text-amber-400">{effects.eqMid2Gain}dB</span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={effects.eqMid2Gain}
                  onChange={(e) => update({ eqMid2Gain: parseFloat(e.target.value) })}
                  disabled={!effects.eq4BandEnabled}
                  className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* 6. Low Quality Mic Simulator */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">6. Low Quality Mic</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.lowQualityMicEnabled}
                  onChange={(e) => update({ lowQualityMicEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-[10px] text-zinc-500">
              Simulates bandwidth-limited vintage telephone/radio to mask digital RVC artifacts.
            </p>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between text-zinc-400">
                <span>Filter Intensity</span>
                <span className="font-mono text-amber-400">{Math.round(effects.lowQualityMicIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={effects.lowQualityMicIntensity}
                onChange={(e) => update({ lowQualityMicIntensity: parseFloat(e.target.value) })}
                disabled={!effects.lowQualityMicEnabled}
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
