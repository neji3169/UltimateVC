import React from 'react';
import { Activity, Disc3, Mic, MicOff, Power, RotateCcw } from 'lucide-react';
import { EngineStats } from '../types';

interface HeaderProps {
  stats: EngineStats;
  isEngineActive: boolean;
  onToggleEngine: () => void;
  onToggleRecording: () => void;
  onResetDefaults: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  isEngineActive,
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
    <header id="ultimatevc-header" className="bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/10 text-zinc-950 font-black text-xl">
            V
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">UltimateVC</h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400 border border-zinc-700">
                Vonovox RVC v2
              </span>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CUDA Accel
              </span>
            </div>
            <p className="text-xs text-zinc-400">Realtime AI Voice Converter & Post-Processing Rack</p>
          </div>
        </div>

        {/* Live Audio Metrics */}
        <div className="flex items-center gap-2 sm:gap-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-3.5 py-1.5 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-zinc-500">Pipeline Latency</span>
            <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              {isEngineActive ? `${stats.calculatedLatencyMs.toFixed(1)} ms` : '-- ms'}
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
