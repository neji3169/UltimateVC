import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/audioEngine';
import { EngineStats } from '../types';

interface VisualizerProps {
  stats: EngineStats;
  isEngineActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ stats, isEngineActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'spectrum' | 'waveform'>('both');
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(128);
    const timeData = new Uint8Array(256);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark studio background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (isEngineActive) {
        audioEngine.getFrequencyData(freqData);
        audioEngine.getTimeDomainData(timeData);

        // 1. Draw Spectrum (FFT Bars)
        if (viewMode === 'both' || viewMode === 'spectrum') {
          const barCount = 48;
          const barWidth = (width / barCount) - 2;
          const barMaxHeight = viewMode === 'both' ? height * 0.75 : height * 0.9;

          for (let i = 0; i < barCount; i++) {
            // Logarithmic index sampling to match human hearing
            const dataIndex = Math.floor(Math.pow(i / barCount, 1.4) * (freqData.length - 1));
            const value = freqData[dataIndex] || 0;
            const percent = value / 255;
            const barHeight = Math.max(2, percent * barMaxHeight);

            // Frequency Color: amber in lows/mids, emerald in highs
            const hue = 38 + (i / barCount) * 110;
            ctx.fillStyle = `hsl(${hue}, 85%, ${40 + percent * 30}%)`;

            const x = i * (barWidth + 2) + 1;
            const y = height - barHeight;

            // Draw rounded top bar
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();

            // Glow on peaks
            if (percent > 0.6) {
              ctx.fillStyle = '#fef3c7';
              ctx.fillRect(x, y - 2, barWidth, 2);
            }
          }
        }

        // 2. Draw Waveform (Oscilloscope)
        if (viewMode === 'both' || viewMode === 'waveform') {
          ctx.beginPath();
          ctx.lineWidth = viewMode === 'waveform' ? 2.5 : 1.5;
          ctx.strokeStyle = viewMode === 'both' ? '#38bdf8' : '#34d399';
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 4;

          const sliceWidth = width / timeData.length;
          let x = 0;

          for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          ctx.stroke();
          ctx.shadowBlur = 0; // reset shadow
        }
      } else {
        // Idle display - static baseline
        ctx.beginPath();
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.fillStyle = '#71717a';
        ctx.font = '12px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Engine Inactive — Click "Start Converter" or Play a Sound File', width / 2, height / 2 - 12);
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isEngineActive, viewMode]);

  const inPeakPct = Math.min(100, Math.round(stats.inputPeakLevel * 180));
  const outPeakPct = Math.min(100, Math.round(stats.outputPeakLevel * 180));

  return (
    <div id="audio-visualizer-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
      {/* Top Bar with Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Realtime Spectral & Waveform Monitor</span>
          <span className="text-[10px] text-zinc-500 font-mono">1024-Point FFT</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Silero VAD Speech indicator */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
              stats.speechDetected && isEngineActive
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            {stats.speechDetected && isEngineActive ? 'Speech Detected' : 'VAD / Gate Muted'}
          </span>

          {/* View Mode buttons */}
          <div className="bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 flex text-[11px]">
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-0.5 rounded font-medium transition ${
                viewMode === 'both' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dual
            </button>
            <button
              onClick={() => setViewMode('spectrum')}
              className={`px-2.5 py-0.5 rounded font-medium transition ${
                viewMode === 'spectrum' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Spectrum
            </button>
            <button
              onClick={() => setViewMode('waveform')}
              className={`px-2.5 py-0.5 rounded font-medium transition ${
                viewMode === 'waveform' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Waveform
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-36 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/80">
        <canvas
          ref={canvasRef}
          width={800}
          height={144}
          className="w-full h-full block"
        />
        {/* Frequency legend */}
        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono text-zinc-600 pointer-events-none">
          <span>50 Hz</span>
          <span>250 Hz</span>
          <span>1 kHz</span>
          <span>4 kHz</span>
          <span>12 kHz</span>
          <span>20 kHz</span>
        </div>
      </div>

      {/* Dual VU Peak Meters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Input Meter */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] font-semibold text-zinc-400">Mic / File Input Level</span>
            <span className="font-mono text-[10px] text-zinc-500">
              {inPeakPct > 90 ? 'CLIP' : `${Math.round(inPeakPct)}%`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden flex p-0.5 border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                inPeakPct > 85 ? 'bg-rose-500' : inPeakPct > 60 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${inPeakPct}%` }}
            />
          </div>
        </div>

        {/* Output Meter */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] font-semibold text-zinc-400">Processed Output Level</span>
            <span className="font-mono text-[10px] text-zinc-500">
              {outPeakPct > 90 ? 'CLIP' : `${Math.round(outPeakPct)}%`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden flex p-0.5 border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                outPeakPct > 85 ? 'bg-rose-500' : outPeakPct > 60 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${outPeakPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
