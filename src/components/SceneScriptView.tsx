import React, { useState } from 'react';
import {
  Volume2,
  Play,
  Square,
  Sparkles,
  Download,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  RotateCcw,
  Sliders,
  Wind,
  FileDown,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  BookOpen,
  Languages,
  Clock
} from 'lucide-react';
import { Episode, DialogueLine, Character, VoiceName, BookOutline } from '../types/theater';
import {
  playBase64Wav,
  stopCurrentAudio,
  playAtmosphericSfx,
  downloadBase64Wav,
  formatDuration
} from '../utils/audioUtils';

interface NextEpisodeInfo {
  exists: boolean;
  seasonId: string;
  episodeId?: string;
  title: string;
  synopsis?: string;
  estimatedMinutes?: number;
  isBookPlan?: boolean;
}

interface SceneScriptViewProps {
  episode: Episode;
  seasonTitle: string;
  characters: Character[];
  bookOutline?: BookOutline;
  nextEpisodeInfo?: NextEpisodeInfo | null;
  onGoToNextEpisode?: () => void;
  onGenerateNextEpisode?: () => Promise<void>;
  isGeneratingNextEpisode?: boolean;
  onUpdateEpisode: (episode: Episode) => void;
  onGenerateLineAudio: (dialogueId: string) => Promise<void>;
  onGenerateAllLines: () => Promise<void>;
  onCancelBatch: () => void;
  isBatchGenerating: boolean;
  batchProgress: { current: number; total: number };
  onDownloadMasterAudio: () => Promise<void>;
  isMasterDownloading: boolean;
  currentPlayingLineId: string | null;
  onPlayLine: (dialogueId: string) => void;
  onStopPlay: () => void;
}

export const SceneScriptView: React.FC<SceneScriptViewProps> = ({
  episode,
  seasonTitle,
  characters,
  bookOutline,
  nextEpisodeInfo,
  onGoToNextEpisode,
  onGenerateNextEpisode,
  isGeneratingNextEpisode = false,
  onUpdateEpisode,
  onGenerateLineAudio,
  onGenerateAllLines,
  onCancelBatch,
  isBatchGenerating,
  batchProgress,
  onDownloadMasterAudio,
  isMasterDownloading,
  currentPlayingLineId,
  onPlayLine,
  onStopPlay,
}) => {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCharId, setEditCharId] = useState('');
  const [editEmotion, setEditEmotion] = useState('');
  const [editSfx, setEditSfx] = useState('');
  const [isAddingLine, setIsAddingLine] = useState(false);

  // New line state
  const [newLineCharId, setNewLineCharId] = useState(characters[0]?.id || '');
  const [newLineText, setNewLineText] = useState('');
  const [newLineEmotion, setNewLineEmotion] = useState('طبیعی و رسا');
  const [newLineSfx, setNewLineSfx] = useState('');

  const readyLinesCount = episode.dialogues.filter((d) => d.audioStatus === 'ready').length;
  const totalLinesCount = episode.dialogues.length;
  const progressPercent = totalLinesCount > 0 ? Math.round((readyLinesCount / totalLinesCount) * 100) : 0;

  const startEdit = (line: DialogueLine) => {
    setEditingLineId(line.id);
    setEditText(line.text);
    setEditCharId(line.characterId);
    setEditEmotion(line.emotion);
    setEditSfx(line.soundEffect || '');
  };

  const saveEdit = (lineId: string) => {
    const updatedDialogues = episode.dialogues.map((d) => {
      if (d.id === lineId) {
        const char = characters.find((c) => c.id === editCharId);
        return {
          ...d,
          text: editText.trim(),
          characterId: editCharId,
          characterName: char?.name || d.characterName,
          emotion: editEmotion.trim(),
          soundEffect: editSfx.trim(),
          // Invalidate audio on text change so it can be re-recorded
          audioStatus: d.text !== editText.trim() ? ('idle' as const) : d.audioStatus,
          audioBase64: d.text !== editText.trim() ? undefined : d.audioBase64,
        };
      }
      return d;
    });

    onUpdateEpisode({
      ...episode,
      dialogues: updatedDialogues,
    });
    setEditingLineId(null);
  };

  const handleDeleteLine = (lineId: string) => {
    if (confirm('آیا از حذف این بند دیالوگ اطمینان دارید؟')) {
      onUpdateEpisode({
        ...episode,
        dialogues: episode.dialogues.filter((d) => d.id !== lineId),
      });
    }
  };

  const handleAddNewLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineText.trim()) return;

    const char = characters.find((c) => c.id === newLineCharId);
    const newLine: DialogueLine = {
      id: `diag-${Date.now()}`,
      characterId: newLineCharId,
      characterName: char?.name || 'راوی',
      text: newLineText.trim(),
      emotion: newLineEmotion.trim(),
      soundEffect: newLineSfx.trim(),
      audioStatus: 'idle',
    };

    onUpdateEpisode({
      ...episode,
      dialogues: [...episode.dialogues, newLine],
    });

    setNewLineText('');
    setNewLineSfx('');
    setIsAddingLine(false);
  };

  // Download screenplay as text
  const handleDownloadScriptText = () => {
    let scriptContent = `نمایش رادیویی: ${seasonTitle}\n`;
    scriptContent += `عنوان قسمت: ${episode.title}\n`;
    scriptContent += `خلاصه: ${episode.synopsis}\n`;
    scriptContent += `تاریخ خروجی: ${new Date().toLocaleDateString('fa-IR')}\n`;
    scriptContent += `--------------------------------------------------\n\n`;

    episode.dialogues.forEach((d, idx) => {
      scriptContent += `[بند ${idx + 1}] ${d.characterName} (${d.emotion || 'طبیعی'}):\n`;
      if (d.soundEffect) {
        scriptContent += `  [افکت صوتی: ${d.soundEffect}]\n`;
      }
      if (d.stageDirection) {
        scriptContent += `  (دستور صحنه: ${d.stageDirection})\n`;
      }
      scriptContent += `  «${d.text}»\n\n`;
    });

    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `متن_سناریو_${episode.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-36">
      {/* Book outline banner if running a parsed book */}
      {bookOutline && (
        <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-100 text-sm">
                  کتاب: {bookOutline.bookTitle}
                </span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <Languages className="w-3 h-3" />
                  <span>زبان اصلی: {bookOutline.originalLanguage} ➔ خروجی: فارسی</span>
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>طول هر اپیزود: ۲۰ تا ۳۰ دقیقه</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                نویسنده: {bookOutline.author || 'نامشخص'} • فصول طولانی به چند اپیزود تفکیک شده‌اند.
              </p>
            </div>
          </div>

          {/* Quick Next Button in Banner */}
          {nextEpisodeInfo && (
            <button
              onClick={nextEpisodeInfo.exists ? onGoToNextEpisode : onGenerateNextEpisode}
              disabled={isGeneratingNextEpisode}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-md shadow-cyan-500/20 transition-all text-xs"
            >
              {isGeneratingNextEpisode ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>در حال نگارش اپیزود بعد...</span>
                </>
              ) : (
                <>
                  <span>{nextEpisodeInfo.exists ? 'رفتن به قسمت بعدی' : 'تولید سناریوی قسمت بعد'}</span>
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-950" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Episode Header & Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium mb-1">
              <span>{seasonTitle}</span>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>قسمت {episode.number}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              {episode.title}
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {episode.synopsis}
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block">تعداد دیالوگ‌ها</span>
              <span className="text-sm font-bold text-amber-400">{totalLinesCount} بند</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block">وضعیت صداگذاری</span>
              <span
                className={`text-sm font-bold ${
                  readyLinesCount === totalLinesCount && totalLinesCount > 0
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {readyLinesCount} از {totalLinesCount}
              </span>
            </div>
          </div>
        </div>

        {/* Studio Production Controls Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isBatchGenerating ? (
              <button
                onClick={onCancelBatch}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>توقف تولید خودکار صدا</span>
              </button>
            ) : (
              <button
                onClick={onGenerateAllLines}
                disabled={totalLinesCount === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>تولید و ضبط صدای کل قسمت (یکجا)</span>
              </button>
            )}

            {/* Master Audio Download Button */}
            <button
              onClick={onDownloadMasterAudio}
              disabled={isMasterDownloading || readyLinesCount === 0}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs px-4 py-2 rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
              title="دانلود فایل صوتی کامل و تلفیق‌شده اپیزود با فرمت WAV"
            >
              {isMasterDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>در حال تلفیق قطعات اپیزود...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>دانلود فایل صوتی کامل اپیزود (WAV)</span>
                </>
              )}
            </button>

            {/* Quick Next Episode Button (Addresses user requirement) */}
            {nextEpisodeInfo && (
              <button
                onClick={nextEpisodeInfo.exists ? onGoToNextEpisode : onGenerateNextEpisode}
                disabled={isGeneratingNextEpisode}
                className="flex items-center gap-2 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-xs px-3.5 py-2 rounded-xl font-bold transition-all"
                title="تولید یا رفتن به قسمت بعدی"
              >
                {isGeneratingNextEpisode ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال آماده‌سازی اپیزود بعد...</span>
                  </>
                ) : (
                  <>
                    <span>{nextEpisodeInfo.exists ? 'قسمت بعدی ➔' : 'تولید قسمت بعد ➔'}</span>
                  </>
                )}
              </button>
            )}

            {/* Download script text */}
            <button
              onClick={handleDownloadScriptText}
              className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-800 transition-colors"
              title="دانلود متن نمایشنامه با فرمت متنی"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-400" />
              <span>دانلود سناریو (TXT)</span>
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="w-full sm:w-64 bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-400">پیشرفت ضبط صوتی این قسمت:</span>
              <span className="font-bold text-amber-400">{progressPercent}٪</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Batch Generation Alert Bar */}
        {isBatchGenerating && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>
                در حال پردازش صوتی دیالوگ {batchProgress.current} از {batchProgress.total} با مدل هوش مصنوعی Gemini...
              </span>
            </div>
            <span className="text-[11px] text-amber-400/80 font-mono">
              صداپیشگان در حال ایفای نقش
            </span>
          </div>
        )}
      </div>

      {/* Script Lines List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <span>متن سناریو و فرامین کارگردانی</span>
            <span className="text-xs font-normal text-slate-500">
              (روی هر دیالوگ می‌توانید به صورت جداگانه صدا ضبط یا پخش کنید)
            </span>
          </h3>

          <button
            onClick={() => setIsAddingLine(true)}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن دیالوگ جدید</span>
          </button>
        </div>

        {episode.dialogues.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-400">هیچ دیالوگی در این قسمت وجود ندارد.</p>
            <button
              onClick={() => setIsAddingLine(true)}
              className="mt-3 inline-flex items-center gap-2 text-xs bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>نوشتن اولین دیالوگ</span>
            </button>
          </div>
        ) : (
          episode.dialogues.map((line, index) => {
            const char = characters.find((c) => c.id === line.characterId);
            const isPlaying = currentPlayingLineId === line.id;
            const isGenerating = line.audioStatus === 'generating';
            const isReady = line.audioStatus === 'ready';
            const isError = line.audioStatus === 'error';
            const isEditing = editingLineId === line.id;

            return (
              <div
                key={line.id}
                id={`dialogue-${line.id}`}
                className={`bg-slate-900/80 border rounded-2xl p-4 md:p-5 transition-all shadow-sm ${
                  isPlaying
                    ? 'border-amber-500 bg-slate-900 glow-active'
                    : isError
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          گوینده دیالوگ:
                        </label>
                        <select
                          value={editCharId}
                          onChange={(e) => setEditCharId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                        >
                          {characters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.voiceName})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          لحن و احساس بازی:
                        </label>
                        <input
                          type="text"
                          value={editEmotion}
                          onChange={(e) => setEditEmotion(e.target.value)}
                          placeholder="مثلاً: با صدای لرزان از ترس..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">
                          افکت صوتی زمینه (اختیاری):
                        </label>
                        <input
                          type="text"
                          value={editSfx}
                          onChange={(e) => setEditSfx(e.target.value)}
                          placeholder="مثلاً: صدای زوزه باد، گام‌ها..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">متن دیالوگ:</label>
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed font-sans"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingLineId(null)}
                        className="text-xs text-slate-400 px-3 py-1.5 rounded-lg border border-slate-800"
                      >
                        انصراف
                      </button>
                      <button
                        onClick={() => saveEdit(line.id)}
                        className="text-xs bg-amber-500 text-slate-950 font-bold px-4 py-1.5 rounded-lg"
                      >
                        ذخیره تغییرات
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    {/* Character Tag and Meta */}
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono flex items-center justify-center">
                          {index + 1}
                        </span>

                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${
                            char?.avatarColor || 'from-amber-600 to-amber-800'
                          } flex items-center justify-center text-white text-xs font-bold shadow`}
                        >
                          {char?.name.slice(0, 1) || 'ر'}
                        </div>

                        <div>
                          <span className="font-bold text-xs text-slate-100">
                            {line.characterName}
                          </span>
                          <span className="text-[10px] text-slate-500 mr-2">
                            (صدای {char?.voiceName || 'Kore'})
                          </span>
                        </div>

                        {line.emotion && (
                          <span className="text-[10px] bg-slate-800/80 text-amber-300 border border-slate-700/80 px-2 py-0.5 rounded-full">
                            {line.emotion}
                          </span>
                        )}
                      </div>

                      {/* Line Status & Edit / Delete */}
                      <div className="flex items-center gap-1.5">
                        {/* Audio Status Pill */}
                        {isGenerating ? (
                          <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>در حال تولید صدا...</span>
                          </span>
                        ) : isError ? (
                          <span className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>خطا در ضبط</span>
                          </span>
                        ) : isReady ? (
                          <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>صدا آماده است</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-lg">
                            در انتظار ضبط
                          </span>
                        )}

                        <button
                          onClick={() => startEdit(line)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                          title="ویرایش متن یا کاراکتر"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteLine(line.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="حذف دیالوگ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dialogue Text */}
                    <div className="my-2.5 pr-8 pl-2">
                      <p className="text-sm md:text-base text-slate-100 font-normal leading-relaxed select-text">
                        «{line.text}»
                      </p>

                      {/* Sound Effect or Stage Direction */}
                      {(line.soundEffect || line.stageDirection) && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                          {line.soundEffect && (
                            <button
                              onClick={() => playAtmosphericSfx(line.soundEffect || '')}
                              className="inline-flex items-center gap-1 text-[11px] text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/40 px-2.5 py-1 rounded-lg transition-colors"
                              title="کلیک برای شنیدن آزمایشی افکت صوتی"
                            >
                              <Wind className="w-3 h-3 text-cyan-400" />
                              <span>افکت صوتی: {line.soundEffect}</span>
                              <Volume2 className="w-2.5 h-2.5 text-cyan-400 mr-1" />
                            </button>
                          )}

                          {line.stageDirection && (
                            <span className="text-[11px] text-slate-400 italic">
                              دستور صحنه: ({line.stageDirection})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Error display if line failed */}
                    {isError && line.errorMessage && (
                      <div className="my-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{line.errorMessage}</span>
                        </div>
                        <button
                          onClick={() => onGenerateLineAudio(line.id)}
                          className="flex items-center gap-1 text-rose-200 hover:text-white bg-rose-600/50 hover:bg-rose-600 px-2.5 py-1 rounded text-[11px] transition-colors shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>تلاش مجدد</span>
                        </button>
                      </div>
                    )}

                    {/* Audio Controls for this specific line */}
                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {isReady ? (
                          <>
                            {isPlaying ? (
                              <button
                                onClick={onStopPlay}
                                className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-all"
                              >
                                <Square className="w-3 h-3 fill-slate-950" />
                                <span>توقف پخش</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onPlayLine(line.id)}
                                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                              >
                                <Play className="w-3 h-3 fill-current text-amber-400" />
                                <span>پخش دیالوگ</span>
                              </button>
                            )}

                            {/* Playing Waveform Animation */}
                            {isPlaying && (
                              <div className="flex items-center gap-1 px-2">
                                <span className="w-1 h-3 bg-amber-400 animate-pulse rounded-full" />
                                <span className="w-1 h-5 bg-amber-400 animate-bounce rounded-full" />
                                <span className="w-1 h-4 bg-amber-400 animate-pulse rounded-full" />
                                <span className="w-1 h-2 bg-amber-400 animate-bounce rounded-full" />
                                <span className="text-[11px] text-amber-300 mr-1.5 font-medium">
                                  در حال پخش...
                                </span>
                              </div>
                            )}

                            <button
                              onClick={() => onGenerateLineAudio(line.id)}
                              disabled={isGenerating}
                              className="text-xs text-slate-400 hover:text-amber-300 p-1.5 rounded hover:bg-slate-800 transition-colors"
                              title="ضبط مجدد این دیالوگ"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onGenerateLineAudio(line.id)}
                            disabled={isGenerating}
                            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                <span>در حال تولید صدا...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                                <span>تولید صدای این دیالوگ</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Download single line audio */}
                      {isReady && line.audioBase64 && (
                        <button
                          onClick={() =>
                            downloadBase64Wav(
                              line.audioBase64!,
                              `دیالوگ_${index + 1}_${line.characterName}.wav`
                            )
                          }
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          title="دانلود فایل WAV این دیالوگ به صورت جداگانه"
                        >
                          <Download className="w-3 h-3 text-slate-400" />
                          <span>دانلود فایل این لاین</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Add Line Form */}
        {isAddingLine && (
          <form
            onSubmit={handleAddNewLine}
            className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 md:p-5 space-y-3 shadow-lg"
          >
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن بند دیالوگ جدید به این صحنه</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">شخصیت گوینده:</label>
                <select
                  value={newLineCharId}
                  onChange={(e) => setNewLineCharId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.voiceName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">لحن و احساس بازی:</label>
                <input
                  type="text"
                  value={newLineEmotion}
                  onChange={(e) => setNewLineEmotion(e.target.value)}
                  placeholder="مثلاً: هیجان‌زده و شاد..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
                  افکت صوتی زمینه (اختیاری):
                </label>
                <input
                  type="text"
                  value={newLineSfx}
                  onChange={(e) => setNewLineSfx(e.target.value)}
                  placeholder="مثلاً: صدای پای اسب، زنگ ساعت..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">متن فارسی دیالوگ:</label>
              <textarea
                required
                rows={3}
                value={newLineText}
                onChange={(e) => setNewLineText(e.target.value)}
                placeholder="متن دیالوگ را اینجا بنویسید..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingLine(false)}
                className="text-xs text-slate-400 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg transition-colors"
              >
                ثبت دیالوگ
              </button>
            </div>
          </form>
        )}

        {/* Dedicated Next Episode Producer Card (Direct User Request) */}
        {nextEpisodeInfo ? (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-5 shadow-xl mt-6 relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-orange-500" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  گام بعدی نمایش رادیویی (Next Episode)
                </span>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{nextEpisodeInfo.title}</span>
                  {nextEpisodeInfo.estimatedMinutes && (
                    <span className="text-xs text-slate-400 font-normal">
                      (~{nextEpisodeInfo.estimatedMinutes} دقیقه)
                    </span>
                  )}
                </h4>
                {nextEpisodeInfo.synopsis && (
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    {nextEpisodeInfo.synopsis}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                {nextEpisodeInfo.exists ? (
                  <button
                    onClick={onGoToNextEpisode}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all text-xs"
                  >
                    <span>ورود به قسمت بعدی</span>
                    <ArrowLeft className="w-4 h-4 text-slate-950" />
                  </button>
                ) : (
                  <button
                    onClick={onGenerateNextEpisode}
                    disabled={isGeneratingNextEpisode}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs disabled:opacity-50"
                  >
                    {isGeneratingNextEpisode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>در حال نگارش و تولید سناریوی فارسی قسمت بعد...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>تولید سناریوی فارسی قسمت بعدی (۲۰-۳۰ دقیقه)</span>
                        <ArrowLeft className="w-4 h-4 text-slate-950" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400 mt-4">
            شما در آخرین قسمت ثبت شده این بخش قرار دارید. برای افزودن قسمت‌های بیشتر می‌توانید از دکمه «افزودن دیالوگ» یا پنل فصل‌ها استفاده کنید.
          </div>
        )}
      </div>
    </div>
  );
};
