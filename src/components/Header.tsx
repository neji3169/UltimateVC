import React from 'react';
import { Activity, Disc3, Mic, MicOff, Power, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { EngineStats } from '../types';

interface HeaderProps {
  stats: EngineStats;
  isEngineActive: boolean;
  selfMonitoringEnabled: boolean;
  onToggleMonitoring: () => void;
  onToggleEngine: () => void;
  onToggleRecording: () => void;
  onResetDefaults: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  isEngineActive,
  selfMonitoringEnabled,
  onToggleMonitoring,
  onToggleEngine,
  onToggleRecording,
  onResetDefaults,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-zinc-950 font-black text-xl tracking-tighter">
            VC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-zinc-100">
                UltimateVC <span className="text-amber-400 font-light text-xs font-mono">v2.1 RVC</span>
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Live DSP
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Low-Latency Realtime AI Voice Converter & 10-Band Mastering EQ
            </p>
          </div>
        </div>

        {/* Realtime Engine Status Indicators */}
        <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-500">Latency (Total)</span>
            <span className="font-mono font-semibold text-amber-400">
              {stats.calculatedLatencyMs.toFixed(1)} ms
            </span>
          </div>
          <div className="w-px h-6 bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-500">Audio Stream</span>
            <span className="font-mono text-zinc-300">
              {isEngineActive ? (stats.isSoundFileActive ? 'Sound File (Override)' : 'Live Mic') : 'Standby'}
            </span>
          </div>
          <div className="w-px h-6 bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-500">Engine</span>
            <span className={`font-semibold flex items-center gap-1 ${isEngineActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isEngineActive ? 'bg-emerald-500 animate-ping' : 'bg-zinc-600'}`} />
              {isEngineActive ? 'Running' : 'Stopped'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Headphone Self-Monitoring Toggle Button */}
          <button
            id="btn-toggle-monitoring"
            onClick={onToggleMonitoring}
            title={
              selfMonitoringEnabled
                ? 'Headphones Monitoring is ON (You hear yourself). Click to MUTE.'
                : 'Headphones Monitoring is MUTED (No echo). Click to hear converted voice.'
            }
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              selfMonitoringEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700'
            }`}
          >
            {selfMonitoringEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            <span className="hidden sm:inline">{selfMonitoringEnabled ? 'Monitor: ON' : 'Monitor: Muted'}</span>
          </button>

          {/* Record Button */}
          <button
            id="btn-record-audio"
            onClick={onToggleRecording}
            disabled={!isEngineActive}
            title={stats.isRecording ? 'Stop & Download Recording' : 'Record Transformed Audio'}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              stats.isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-900/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Disc3 className={`w-4 h-4 ${stats.isRecording ? 'animate-spin' : ''}`} />
            <span>{stats.isRecording ? `REC (${formatTime(stats.recordingDuration)})` : 'Record Output'}</span>
          </button>

          {/* Reset Button */}
          <button
            id="btn-reset-defaults"
            onClick={onResetDefaults}
            title="Reset parameters to factory defaults"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Master Start / Stop Button */}
          <button
            id="btn-master-toggle"
            onClick={onToggleEngine}
            className={`px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all ${
              isEngineActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-amber-500/20'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isEngineActive ? 'Stop Converter' : 'Start Converter'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
