import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  Music,
  Gauge,
  Radio,
  Sparkles
} from 'lucide-react';
import { Episode, DialogueLine, Character } from '../types/theater';
import { formatDuration } from '../utils/audioUtils';

interface MasterPlayerProps {
  episode: Episode;
  characters: Character[];
  currentPlayingLineId: string | null;
  onPlayEpisodeSequentially: () => void;
  onPauseEpisode: () => void;
  onNextLine: () => void;
  onPrevLine: () => void;
  isPlaying: boolean;
  onDownloadMasterAudio: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export const MasterPlayer: React.FC<MasterPlayerProps> = ({
  episode,
  characters,
  currentPlayingLineId,
  onPlayEpisodeSequentially,
  onPauseEpisode,
  onNextLine,
  onPrevLine,
  isPlaying,
  onDownloadMasterAudio,
  playbackSpeed,
  onChangeSpeed,
}) => {
  const readyCount = episode.dialogues.filter((d) => d.audioStatus === 'ready').length;
  const currentLineIndex = episode.dialogues.findIndex((d) => d.id === currentPlayingLineId);
  const currentLine = currentLineIndex !== -1 ? episode.dialogues[currentLineIndex] : null;
  const currentChar = currentLine
    ? characters.find((c) => c.id === currentLine.characterId)
    : null;

  // Approximate total duration of ready lines (assuming ~4-6 seconds per line on average)
  const estimatedTotalDuration = readyCount * 5;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Currently Playing Track Info */}
        <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${
              currentChar?.avatarColor || 'from-amber-600 to-orange-700'
            } flex items-center justify-center text-white shrink-0 shadow-lg ${
              isPlaying ? 'animate-pulse' : ''
            }`}
          >
            <Radio className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate">
                {currentLine ? currentLine.characterName : episode.title}
              </span>
              {currentLine && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono">
                  دیالوگ {currentLineIndex + 1}/{episode.dialogues.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {currentLine
                ? `«${currentLine.text}»`
                : `${readyCount} از ${episode.dialogues.length} دیالوگ آماده پخش است`}
            </p>
          </div>
        </div>

        {/* Playback Transport Controls */}
        <div className="flex flex-col items-center gap-1.5 w-full sm:w-1/3">
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevLine}
              disabled={currentLineIndex <= 0}
              className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
              title="دیالوگ قبلی"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {isPlaying ? (
              <button
                onClick={onPauseEpisode}
                className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all scale-105"
                title="توقف پخش"
              >
                <Square className="w-4 h-4 fill-slate-950" />
              </button>
            ) : (
              <button
                onClick={onPlayEpisodeSequentially}
                disabled={readyCount === 0}
                className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all hover:scale-105 disabled:opacity-40"
                title="پخش پیوسته کل قسمت"
              >
                <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
              </button>
            )}

            <button
              onClick={onNextLine}
              disabled={currentLineIndex >= episode.dialogues.length - 1}
              className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
              title="دیالوگ بعدی"
            >
              <SkipBack className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress Dots */}
          <div className="flex items-center gap-1 max-w-xs overflow-hidden py-0.5">
            {episode.dialogues.map((d, i) => (
              <span
                key={d.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentLineIndex
                    ? 'w-4 bg-amber-400'
                    : d.audioStatus === 'ready'
                    ? 'w-1.5 bg-emerald-500/70'
                    : 'w-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Speed, Download & Extra Controls */}
        <div className="flex items-center justify-end gap-2.5 w-full sm:w-1/3">
          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={playbackSpeed}
              onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
            >
              <option value="0.8">0.8x</option>
              <option value="1">1.0x</option>
              <option value="1.2">1.2x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>

          {/* Download master button */}
          <button
            onClick={onDownloadMasterAudio}
            disabled={readyCount === 0}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            title="دانلود فایل صوتی کامل اپیزود"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">دانلود مستر</span>
          </button>
        </div>
      </div>
    </div>
  );
};
