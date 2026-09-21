import React, { useEffect, useState } from 'react';
import { Mic, Headphones, SlidersHorizontal, Radio, ShieldAlert, Sparkles, Volume2, VolumeX } from 'lucide-react';
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
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Audio I/O & Monitoring Routing</h2>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
          WASAPI 48000 Hz
        </span>
      </div>

      {/* Input / Output Device Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Input device */}
        <div className="space-y-1.5" title="Select your physical microphone hardware device for live voice capture">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-amber-500" />
            <span>Input Microphone</span>
          </label>
          <select
            value={settings.inputDeviceId}
            onChange={(e) => onUpdateSettings({ inputDeviceId: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
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
        <div className="space-y-1.5" title="Select Virtual Audio Cable (VB-Audio / VAC) to route converted voice to Discord/OBS/Games, or select Headphones to monitor">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-amber-500" />
            <span>Output Device (VAC Line / Headphones)</span>
          </label>
          <select
            value={settings.outputDeviceId}
            onChange={(e) => onUpdateSettings({ outputDeviceId: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
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

      {/* Direct Self-Monitoring Feedback Toggle */}
      <div
        title={
          settings.selfMonitoringEnabled
            ? 'Self-monitoring is ON: You hear your converted voice live through your headphones.'
            : 'Self-monitoring is MUTED: Prevents feedback/echo. Converted audio is routed to Virtual Cable / Recording without playing in your headphones.'
        }
        className={`border rounded-xl p-3 flex items-center justify-between gap-3 transition ${
          settings.selfMonitoringEnabled
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
            : 'bg-zinc-950/70 border-zinc-800/90 text-zinc-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg border ${
              settings.selfMonitoringEnabled
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            {settings.selfMonitoringEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">
                {settings.selfMonitoringEnabled ? 'Headphone Monitoring: Active' : 'Headphone Monitoring: Muted (No Echo)'}
              </span>
              <span
                className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded border ${
                  settings.selfMonitoringEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}
              >
                {settings.selfMonitoringEnabled ? 'Auditioning' : 'Silent Mic Output'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {settings.selfMonitoringEnabled
                ? 'Listening to converted voice directly. Turn off to silence loopback while gaming or streaming.'
                : 'Default mode: You will NOT hear your own voice echo. Audio routes cleanly to Virtual Cable / Discord.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onUpdateSettings({ selfMonitoringEnabled: !settings.selfMonitoringEnabled })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
            settings.selfMonitoringEnabled
              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 shadow-md'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
          }`}
        >
          {settings.selfMonitoringEnabled ? 'Mute Headphones' : 'Hear Converted Voice'}
        </button>
      </div>

      {/* Noise Filters: RNNoise & Silero VAD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800/80">
        {/* RNNoise */}
        <div
          title="Realtime recurrent neural network noise reduction (cleans PC fans, air conditioner, room reverb)"
          className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition"
        >
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
        <div
          title="Silero Voice Activity Detection: dynamically gates audio when you are not actively talking"
          className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-700 transition"
        >
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
      <div
        title="Artificial Bandwidth Extension: neural spectral upscaler recreating up to 48kHz frequency range"
        className="bg-gradient-to-r from-amber-950/30 to-zinc-950 border border-amber-900/40 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-amber-700/60 transition"
      >
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
