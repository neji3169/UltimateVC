import React, { useEffect, useState } from 'react';
import { Mic, Headphones, ShieldAlert, Sparkles, SlidersHorizontal, Radio } from 'lucide-react';
import { AudioSettingsState } from '../types';

interface AudioSettingsProps {
  settings: AudioSettingsState;
  onUpdateSettings: (newSettings: Partial<AudioSettingsState>) => void;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({ settings, onUpdateSettings }) => {
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === 'audioinput');
        const outputs = devices.filter((d) => d.kind === 'audiooutput');
        setAudioInputDevices(inputs);
        setAudioOutputDevices(outputs);
      } catch (e) {
        console.warn('Could not enumerate audio devices:', e);
      }
    };

    getDevices();
    navigator.mediaDevices?.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', getDevices);
    };
  }, []);

  return (
    <div id="audio-settings-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Audio I/O & Noise Suppression</h2>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
          WASAPI 48000 Hz
        </span>
      </div>

      {/* Input / Output Device Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Input device */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-amber-500" />
            <span>Input Microphone</span>
          </label>
          <select
            value={settings.inputDeviceId}
            onChange={(e) => onUpdateSettings({ inputDeviceId: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="default">Default System Microphone</option>
            {audioInputDevices.map((dev, idx) => (
              <option key={dev.deviceId || idx} value={dev.deviceId}>
                {dev.label || `Microphone ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Output device */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-amber-500" />
            <span>Output Device (VAC Line / Headphones)</span>
          </label>
          <select
            value={settings.outputDeviceId}
            onChange={(e) => onUpdateSettings({ outputDeviceId: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="default">Default System Audio Output</option>
            {audioOutputDevices.map((dev, idx) => (
              <option key={dev.deviceId || idx} value={dev.deviceId}>
                {dev.label || `Speaker/Headphones ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Noise Filters: RNNoise & Silero VAD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
        {/* RNNoise */}
        <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-200">RNNoise Filter</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.rnnoiseEnabled}
                onChange={(e) => onUpdateSettings({ rnnoiseEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
          <p className="text-[10px] text-zinc-500 leading-normal">
            Neural network suppression filtering input background fan/hiss noise with minimal latency.
          </p>
        </div>

        {/* Silero VAD */}
        <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-200">Silero VAD Gating</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sileroVadEnabled}
                onChange={(e) => onUpdateSettings({ sileroVadEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
          <p className="text-[10px] text-zinc-500 leading-normal">
            Voice Activity Detection with 400ms release window. Mutes breathing noises when speech is inactive.
          </p>
        </div>
      </div>

      {/* AP-BWE 48K Audio Upscaler */}
      <div className="bg-gradient-to-r from-amber-950/30 to-zinc-950 border border-amber-900/40 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200">AP-BWE 48kHz Upscaling</span>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Audio BWE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Realtime speech bandwidth extension algorithm: regenerates higher harmonics above 24kHz for studio clarity.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={settings.apBweUpscaling}
            onChange={(e) => onUpdateSettings({ apBweUpscaling: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
      </div>
    </div>
  );
};
