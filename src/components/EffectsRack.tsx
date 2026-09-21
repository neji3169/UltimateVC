import React, { useState } from 'react';
import { Sliders, Crown, Sparkles, Volume2, Shield, Radio, Disc, Waves } from 'lucide-react';
import { AudioEffectsState } from '../types';

interface EffectsRackProps {
  effects: AudioEffectsState;
  onChange: (newEffects: AudioEffectsState) => void;
}

export const EffectsRack: React.FC<EffectsRackProps> = ({ effects, onChange }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'eq10' | 'studio'>('eq10');

  const update = (partial: Partial<AudioEffectsState>) => {
    onChange({ ...effects, ...partial });
  };

  const EQ10_FREQUENCIES = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const EQ10_LABELS = ['31Hz', '63Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

  const applyFemalePreset = (type: 'anime' | 'ince' | 'natural' | 'derin_erkek' | 'podcast' | 'radyo' | 'flat') => {
    let gains: number[];
    switch (type) {
      case 'anime':
        // Cuts heavy male chest resonances (31-250Hz), boosts female anime vocal presence & sparkle
        gains = [-8, -8, -9, -5, 0.5, 2.0, 4.5, 6.0, 5.0, 4.0];
        break;
      case 'ince':
        // Extreme low cut, high-shelf air and sweet sparkle for ultra-fine high tone
        gains = [-12, -11, -10, -7, -1.0, 2.0, 4.5, 6.5, 6.0, 5.0];
        break;
      case 'natural':
        // Smooth organic natural female speech formant profile
        gains = [-5, -4.5, -4, -2, 1.0, 2.5, 3.5, 3.0, 2.5, 1.5];
        break;
      case 'derin_erkek':
        // Warm low chest resonance (60-150Hz), softened harsh highs
        gains = [4.0, 5.0, 4.0, 2.0, 0.0, -1.0, -1.5, -2.0, -2.0, -3.0];
        break;
      case 'podcast':
        // Clarity, removes boxiness and low hum
        gains = [-6, -6, -4, -2.5, 0.0, 1.5, 3.0, 3.5, 2.0, 1.0];
        break;
      case 'radyo':
        // Telephone / Walkie-talkie bandpass
        gains = [-15, -15, -15, -8, 3.0, 6.0, 5.0, 1.0, -12, -15];
        break;
      case 'flat':
      default:
        gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        break;
    }
    update({
      eq10BandEnabled: true,
      eq10Gains: gains,
      femalePresetActive: type === 'flat' ? null : type,
    });
  };

  const handleBandChange = (index: number, val: number) => {
    const newGains = [...(effects.eq10Gains || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0])];
    newGains[index] = val;
    update({
      eq10Gains: newGains,
      femalePresetActive: null,
    });
  };

  return (
    <div id="effects-rack-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Audio Post-Processing DSP Rack</h2>
        </div>

        {/* Tab switch between Basic & 10-Band EQ & Studio */}
        <div className="bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 flex text-xs">
          <button
            onClick={() => setActiveTab('basic')}
            title="Basic tone controls, output gain, noise gate, and 2-band shelf EQ"
            className={`px-3 py-1 rounded-md font-semibold transition ${
              activeTab === 'basic' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Basic Tone
          </button>
          <button
            onClick={() => setActiveTab('eq10')}
            title="10-Band Precision Mastering Equalizer with Instant Vocal Presets"
            className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'eq10' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>10-Band EQ & Vocal</span>
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            title="Studio DSP rack: Compressor, LPF/HPF, Reverb, Chorus, 4-Band EQ, and Vintage Mic emulator"
            className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'studio' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crown className="w-3 h-3" />
            <span>Studio DSP Rack</span>
          </button>
        </div>
      </div>

      {/* Basic Effects View */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Master Output Gain */}
          <div title="Adjusts the master post-DSP output volume" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
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
              className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>-24 dB</span>
              <span>0 dB</span>
              <span>+24 dB</span>
            </div>
          </div>

          {/* Noise Gate */}
          <div title="Mutes audio below the volume threshold to eliminate breathing and background room noise" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
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
              className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
            />
          </div>

          {/* 2-Band Equalizer */}
          <div title="Quick 2-band low shelf and high shelf tone sculpting" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-amber-500" />
                <span>2-Band Shelf EQ</span>
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
                  <span>Low Shelf (200Hz)</span>
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
                  className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-zinc-400">
                  <span>High Shelf (3kHz)</span>
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
                  className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10-Band Precision EQ & Female Voice Presets View */}
      {activeTab === 'eq10' && (
        <div className="flex flex-col gap-3">
          {/* Header Controls: Master Toggle & Female Voice Presets */}
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={effects.eq10BandEnabled}
                  onChange={(e) => update({ eq10BandEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
              <div>
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>10-Band Studio Master Equalizer</span>
                  {effects.eq10BandEnabled ? (
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">ACTIVE (Live DSP)</span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">BYPASS</span>
                  )}
                </span>
                <p className="text-[10px] text-zinc-400">Zero-latency hardware-timed parametric filters for precision vocal shaping.</p>
              </div>
            </div>

            {/* Equalizer Vocal Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mr-1">Hazır EQ:</span>
              <button
                type="button"
                onClick={() => applyFemalePreset('anime')}
                title="Anime Kadın Sesi: Kalın göğüs rezonansını (31-250Hz) keser, sevimli anime & parlak üst frekansları (2k-8k) güçlendirir."
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1 border ${
                  effects.femalePresetActive === 'anime'
                    ? 'bg-pink-600 text-white border-pink-400 shadow-md shadow-pink-900/30'
                    : 'bg-zinc-900 text-pink-300 border-pink-900/50 hover:bg-zinc-800'
                }`}
              >
                <span>🎀 Anime Kadın</span>
              </button>
              <button
                type="button"
                onClick={() => applyFemalePreset('ince')}
                title="İnce Ses: Alt frekansları tamamen tıraşlar, üst frekansları parlatarak ultra ince/tiz vokal oluşturur."
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1 border ${
                  effects.femalePresetActive === 'ince'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/30'
                    : 'bg-zinc-900 text-purple-300 border-purple-900/50 hover:bg-zinc-800'
                }`}
              >
                <span>✨ İnce Ses</span>
              </button>
              <button
                type="button"
                onClick={() => applyFemalePreset('natural')}
                title="Natural Kadın Sesi: Organik ve dengeli kadın konuşma formantı: Basları yumuşatır, anlaşılırlık ve doğallık katar."
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1 border ${
                  effects.femalePresetActive === 'natural'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/30'
                    : 'bg-zinc-900 text-blue-300 border-blue-900/50 hover:bg-zinc-800'
                }`}
              >
                <span>🎙️ Natural Kadın</span>
              </button>
              <button
                type="button"
                onClick={() => applyFemalePreset('derin_erkek')}
                title="Derin Erkek Sesi: Göğüs rezonansını (120Hz) ve sıcak gövdeyi güçlendirir, tiz sertlikleri yumuşatır."
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1 border ${
                  effects.femalePresetActive === 'derin_erkek'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/30'
                    : 'bg-zinc-900 text-amber-300 border-amber-900/50 hover:bg-zinc-800'
                }`}
              >
                <span>🔊 Derin Erkek</span>
              </button>
              <button
                type="button"
                onClick={() => applyFemalePreset('podcast')}
                title="Temiz Vokal & Podcast: Boğukluğu giderir, arka plan uğultusunu keser ve konuşma netliğini artırır."
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1 border ${
                  effects.femalePresetActive === 'podcast'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/30'
                    : 'bg-zinc-900 text-emerald-300 border-emerald-900/50 hover:bg-zinc-800'
                }`}
              >
                <span>🎙️ Temiz Vokal</span>
              </button>
              <button
                type="button"
                onClick={() => applyFemalePreset('radyo')}
                title="Radyo & Telsiz: 350Hz altını ve 4kHz üstünü sert keserek nostaljik radyo/telsiz efekti verir."
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1 border ${
                  effects.femalePresetActive === 'radyo'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/30'
                    : 'bg-zinc-900 text-cyan-300 border-cyan-900/50 hover:bg-zinc-800'
                }`}
              >
                <span>📻 Radyo</span>
              </button>
              <button
                type="button"
                onClick={() => applyFemalePreset('flat')}
                title="Tüm 10 ekolayzer bandını sıfırla (0 dB)."
                className="px-2 py-1 text-xs rounded-lg font-medium transition bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800"
              >
                ⚖️ Sıfırla
              </button>
            </div>
          </div>

          {/* 10 Band Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            {EQ10_LABELS.map((label, idx) => {
              const gain = (effects.eq10Gains && effects.eq10Gains[idx] !== undefined) ? effects.eq10Gains[idx] : 0;
              const isBoost = gain > 0;
              const isCut = gain < 0;

              return (
                <div key={label} title={`${label} Frequency Gain adjustment (-15 dB to +15 dB)`} className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 flex flex-col items-center gap-1.5 hover:border-zinc-700 transition">
                  <span className="text-[11px] font-bold text-zinc-300">{label}</span>
                  <div className="text-[10px] font-mono font-semibold h-4 flex items-center">
                    <span className={isBoost ? 'text-emerald-400' : isCut ? 'text-rose-400' : 'text-zinc-500'}>
                      {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-15}
                    max={15}
                    step={0.5}
                    value={gain}
                    onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                    disabled={!effects.eq10BandEnabled}
                    className="w-full h-1.5 bg-zinc-950 rounded-lg cursor-pointer accent-emerald-500 disabled:opacity-30"
                  />
                  <div className="flex justify-between w-full text-[9px] text-zinc-600 font-mono">
                    <span>-15</span>
                    <span>0</span>
                    <span>+15</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Studio / Patron Effects View */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Dynamics Compressor */}
          <div title="Controls dynamic range to make quiet whispers loud and prevent yelling peaks from clipping" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">1. Dynamics Compressor</span>
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
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
              />

              <div className="flex justify-between text-zinc-400">
                <span>Compression Ratio</span>
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
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
              />
            </div>
          </div>

          {/* 2. Low & High Pass Filters */}
          <div title="Cuts harsh low rumble and excessively piercing high frequencies" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">2. Low / High-Pass Filters</span>
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
                <span>High-Pass Cutoff (Low Cut)</span>
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
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
              />

              <div className="flex justify-between text-zinc-400">
                <span>Low-Pass Cutoff (High Cut)</span>
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
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
              />
            </div>
          </div>

          {/* 3. Reverb & Space */}
          <div title="Adds realistic studio room acoustics and spatial depth" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
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
                <span>Wet Mix Level</span>
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
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
              />
            </div>
          </div>

          {/* 4. Stereo Chorus */}
          <div title="Enriches the voice with stereo width and subtle harmonic doubling" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
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
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
              />
            </div>
          </div>

          {/* 5. 4-Band Parametric EQ (Mid-1 & Mid-2) */}
          <div title="Parametric midrange frequency boost and attenuation" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
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
                  className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
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
                  className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 6. Low Quality Mic Simulator */}
          <div title="Simulates bandwidth-limited vintage telephone/radio to mask digital RVC artifacts" className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition">
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
                className="w-full h-1.5 bg-zinc-900 rounded-lg cursor-pointer disabled:opacity-40 accent-amber-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
