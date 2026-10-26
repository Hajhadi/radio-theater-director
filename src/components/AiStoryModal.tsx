import React, { useState } from 'react';
import {
  Sparkles,
  X,
  BookOpen,
  ArrowRight,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { Episode, Season, Character } from '../types/theater';

interface AiStoryModalProps {
  seasons: Season[];
  activeSeasonId: string;
  onImportEpisode: (seasonId: string, episode: Episode, newCharacters: Character[]) => void;
  onClose: () => void;
}

export const AiStoryModal: React.FC<AiStoryModalProps> = ({
  seasons,
  activeSeasonId,
  onImportEpisode,
  onClose,
}) => {
  const [storyText, setStoryText] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [targetSeasonId, setTargetSeasonId] = useState(activeSeasonId);
  const [genre, setGenre] = useState('درام رازآلود و فلسفی');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/adapt-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyText: storyText.trim(),
          genre,
          episodeTitle: episodeTitle.trim() || 'قسمت جدید رادیویی',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.script) {
        throw new Error(data.error || 'خطا در تبدیل داستان توسط هوش مصنوعی');
      }

      const script = data.script;
      const targetSeason = seasons.find((s) => s.id === targetSeasonId) || seasons[0];
      const newEpNumber = (targetSeason?.episodes.length || 0) + 1;

      // Map characters
      const newCharacters: Character[] = (script.characters || []).map((c: any, idx: number) => ({
        id: `char-${Date.now()}-${idx}`,
        name: c.name || 'شخصیت',
        role: idx === 0 ? 'narrator' : 'supporting',
        voiceName: c.voiceName || (idx % 2 === 0 ? 'Kore' : 'Charon'),
        description: c.description || 'بازیگر نمایش',
        avatarColor: 'from-amber-600 to-orange-700',
        emotionStyle: 'بیان احساسی و شفاف',
      }));

      // Map dialogues
      const newDialogues = (script.dialogues || []).map((d: any, idx: number) => {
        const matchedChar = newCharacters.find((c) => c.name === d.character);
        return {
          id: `diag-${Date.now()}-${idx}`,
          characterId: matchedChar ? matchedChar.id : 'char-narrator',
          characterName: d.character || 'راوی',
          text: d.text,
          stageDirection: d.style || '',
          soundEffect: d.soundEffect || '',
          emotion: d.style || 'طبیعی',
          audioStatus: 'idle',
        };
      });

      const newEpisode: Episode = {
        id: `ep-${Date.now()}`,
        seasonId: targetSeasonId,
        number: newEpNumber,
        title: script.title || episodeTitle || `قسمت ${newEpNumber}: داستان جدید`,
        synopsis: script.synopsis || 'تولید شده توسط هوش مصنوعی Gemini',
        dialogues: newDialogues,
      };

      onImportEpisode(targetSeasonId, newEpisode, newCharacters);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'خطا در نگارش سناریو');
    } finally {
      setIsLoading(false);
    }
  };

  const sampleStory = `کارآگاه در میان باران سیل‌آسا به عمارت قدیمی رسید. در چوبی با ناله‌ای آرام باز شد و پیرمردی با شمعی در دست به او خیره شد: "منتظرتان بودم جناب سرگرد، اما خیلی دیر آمدید..." کارآگاه کلاه خیسش را تکاند و زمزمه کرد: "حقیقت هیچ‌وقت دیر نمی‌شود."`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                تبدیل خودکار داستان یا رمان به سناریوی رادیویی
              </h2>
              <p className="text-xs text-slate-400">
                هوش مصنوعی متن شما را تفکیک، دیالوگ‌بندی و به همراه افکت صوتی آماده می‌کند
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                عنوان قسمت یا صحنه:
              </label>
              <input
                type="text"
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                placeholder="مثلاً: شب بارانی در عمارت..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                افزودن به کدام فصل؟
              </label>
              <select
                value={targetSeasonId}
                onChange={(e) => setTargetSeasonId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              ژانر و حس دراماتیک:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                'درام رازآلود و معمایی',
                'فانتزی و فلسفی',
                'حماسی و تاریخی',
                'عاشقانه و احساسی',
              ].map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`text-[11px] py-1.5 px-2 rounded-lg border text-center transition-all ${
                    genre === g
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                متن داستان، رمان یا خلاصه ماجرا:
              </label>
              <button
                type="button"
                onClick={() => setStoryText(sampleStory)}
                className="text-[11px] text-amber-400 hover:underline"
              >
                درج نمونه داستانی
              </button>
            </div>
            <textarea
              required
              rows={6}
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="متن فارسی داستان، نمایشنامه، کتاب یا خلاصه صحنه خود را اینجا بنویسید یا الصاق کنید..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 leading-relaxed">
            💡 هوش مصنوعی دیالوگ‌ها را بین گویندگان مختلف و راوی تفکیک کرده و افکت‌های صوتی فضاساز (مانند باد، قدم‌ها و در چوبی) را به سناریو اضافه خواهد کرد.
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg border border-slate-800"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isLoading || !storyText.trim()}
              className="flex items-center gap-2 text-xs bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold px-5 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>در حال نگارش و سناریونویسی صوتی...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>تولید سناریوی رادیویی و افزودن به قسمت‌ها</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
