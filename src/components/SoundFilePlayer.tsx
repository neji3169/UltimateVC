import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Square, Upload, Music, Repeat, VolumeX, Sparkles } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { SoundFileState } from '../types';

interface SoundFilePlayerProps {
  isEngineActive: boolean;
  onEnsureEngineStarted: () => Promise<void>;
  onSoundPlayingStateChange: (isPlaying: boolean) => void;
}

export const SoundFilePlayer: React.FC<SoundFilePlayerProps> = ({
  isEngineActive,
  onEnsureEngineStarted,
  onSoundPlayingStateChange,
}) => {
  const [soundState, setSoundState] = useState<SoundFileState>({
    loadedFileName: null,
    fileBuffer: null,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    loop: false,
    isCustomLoaded: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await onEnsureEngineStarted();
    const ctx = audioEngine.getContext();
    if (!ctx) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      audioEngine.setSoundFileBuffer(audioBuffer);
      setSoundState({
        loadedFileName: file.name,
        fileBuffer: audioBuffer,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: audioBuffer.duration,
        loop: false,
        isCustomLoaded: true,
      });
    } catch (err) {
      console.error('Failed to decode audio file:', err);
    }
  };

  const handleLoadSamplePhrase = async () => {
    await onEnsureEngineStarted();
    const buffer = audioEngine.generateSampleVoiceBuffer();
    if (!buffer) return;

    audioEngine.setSoundFileBuffer(buffer);
    setSoundState({
      loadedFileName: 'Sample_Voice_Phrase_48k.wav',
      fileBuffer: buffer,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: buffer.duration,
      loop: true,
      isCustomLoaded: false,
    });
  };

  const startProgressTimer = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    const startStamp = Date.now();
    const initialTime = soundState.currentTime;

    progressTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startStamp) / 1000;
      let newTime = initialTime + elapsed;

      if (soundState.duration > 0 && newTime >= soundState.duration) {
        if (soundState.loop) {
          newTime = 0;
          handlePlay();
        } else {
          handleStop();
          return;
        }
      }

      setSoundState((prev) => ({ ...prev, currentTime: newTime }));
    }, 100);
  };

  const handlePlay = async () => {
    if (!soundState.fileBuffer) {
      // Auto-load sample if user clicks play without loading
      await handleLoadSamplePhrase();
    }

    await onEnsureEngineStarted();
    audioEngine.playSoundFile(() => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setSoundState((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      }));
      onSoundPlayingStateChange(false);
    });

    setSoundState((prev) => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));
    onSoundPlayingStateChange(true);
    startProgressTimer();
  };

  const handlePause = () => {
    audioEngine.pauseSoundFile();
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setSoundState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));
    onSoundPlayingStateChange(false);
  };

  const handleStop = () => {
    audioEngine.stopSoundFile();
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setSoundState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
    }));
    onSoundPlayingStateChange(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    audioEngine.seekSoundFile(time);
    setSoundState((prev) => ({ ...prev, currentTime: time }));
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div id="sound-file-player-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Realtime Sound File Inferencing</h2>
        </div>

        {soundState.isPlaying && (
          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
            <VolumeX className="w-3 h-3 text-amber-400" />
            Mic Zeroed / Overridden
          </span>
        )}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        Load audio files (WAV, MP3, FLAC) to convert them through the RVC voice model in realtime. While playing,
        sound file replaces your microphone as input.
      </p>

      {/* File Loader Strip */}
      <div className="flex flex-wrap items-center gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/wav,audio/mp3,audio/mpeg,audio/flac,audio/ogg"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 transition"
        >
          <Upload className="w-3.5 h-3.5 text-amber-400" />
          <span>Upload Audio File</span>
        </button>

        <button
          onClick={handleLoadSamplePhrase}
          className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Load Sample Phrase</span>
        </button>

        <div className="flex-1 min-w-36 text-right">
          <span className="text-xs font-mono text-zinc-300 truncate max-w-xs block">
            {soundState.loadedFileName || 'No audio file loaded'}
          </span>
        </div>
      </div>

      {/* Transport Controls & Scrubber */}
      <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          {/* Play / Pause / Stop buttons */}
          <div className="flex items-center gap-1">
            {soundState.isPlaying ? (
              <button
                onClick={handlePause}
                title="Pause"
                className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handlePlay}
                title="Play into RVC Pipeline"
                className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}

            <button
              onClick={handleStop}
              title="Stop playback"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Time Scrubber Slider */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 min-w-10 text-right">
              {formatSeconds(soundState.currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={soundState.duration || 100}
              step={0.1}
              value={soundState.currentTime}
              onChange={handleSeek}
              disabled={!soundState.fileBuffer}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
            <span className="text-xs font-mono text-zinc-400 min-w-10">
              {formatSeconds(soundState.duration)}
            </span>
          </div>

          {/* Loop button */}
          <button
            onClick={() => setSoundState((prev) => ({ ...prev, loop: !prev.loop }))}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition ${
              soundState.loop
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
            }`}
            title="Toggle playback loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
