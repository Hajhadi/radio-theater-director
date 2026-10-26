import React, { useState } from 'react';
import {
  Users,
  X,
  Volume2,
  Play,
  Square,
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';
import { Character, VoiceName } from '../types/theater';
import { playBase64Wav, stopCurrentAudio } from '../utils/audioUtils';

interface CastDirectorProps {
  characters: Character[];
  onUpdateCharacter: (character: Character) => void;
  onAddCharacter: (character: Character) => void;
  onDeleteCharacter: (characterId: string) => void;
  onClose: () => void;
}

const VOICE_OPTIONS: { name: VoiceName; label: string; desc: string; sample: string }[] = [
  {
    name: 'Kore',
    label: 'کوره (Kore)',
    desc: 'صدای زنانه گرم، متین، آرام و داستانی (پیشنهاد عالی برای راوی و شخصیت‌های پخته)',
    sample: 'در سکوت شب، صدایی در دوردست شنیده می‌شد که نوید پایانی دیگر را می‌داد.',
  },
  {
    name: 'Puck',
    label: 'پوک (Puck)',
    desc: 'صدای جوان، باانگیزه، زلال و پویا (مناسب قهرمانان جوان، شازده کوچولو و نوجوانان)',
    sample: 'سلام! خواهش می‌کنم برای من یک راز بزرگ را بازگو کن!',
  },
  {
    name: 'Charon',
    label: 'شارون (Charon)',
    desc: 'صدای بم، عمیق، فیلسوفانه، مقتدر و رازآلود (مناسب روباه، دانای کل، شخصیت‌های اسرارآمیز)',
    sample: 'آنچه اصل است از دیده پنهان است؛ تنها با چشم دل می‌توان به درستی دید.',
  },
  {
    name: 'Fenrir',
    label: 'فنریر (Fenrir)',
    desc: 'صدای پرصلابت، حماسی، باوقار و مقتدر (مناسب پادشاهان، فرماندهان و راویان حماسی)',
    sample: 'به تمام ستارگان آسمان فرمان می‌دهم که در موعد مقرر به درخشش درآیند!',
  },
  {
    name: 'Zephyr',
    label: 'زفیر (Zephyr)',
    desc: 'صدای لطیف، ملایم، نازک و پر از احساس (مناسب گل سرخ، نجواها و فرشتگان)',
    sample: 'من تنها گلی هستم که در این دشت پهناور به انتظار تو شکوفا شده‌ام.',
  },
];

export const CastDirector: React.FC<CastDirectorProps> = ({
  characters,
  onUpdateCharacter,
  onAddCharacter,
  onDeleteCharacter,
  onClose,
}) => {
  const [testingVoice, setTestingVoice] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [newCharVoice, setNewCharVoice] = useState<VoiceName>('Kore');
  const [isAdding, setIsAdding] = useState(false);

  const handleTestVoice = async (voiceName: VoiceName, customSample?: string) => {
    stopCurrentAudio();
    setTestingVoice(voiceName);
    setTestError(null);

    const sample =
      customSample ||
      VOICE_OPTIONS.find((v) => v.name === voiceName)?.sample ||
      'سلام! این یک آزمون صوتی برای نمایش رادیویی است.';

    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sample,
          voiceName: voiceName,
          style: 'Expressive dramatic voice acting, clear Persian articulation',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || 'خطا در دریافت صدا از سرویس Gemini');
      }

      playBase64Wav(
        data.audioBase64,
        () => setTestingVoice(null),
        (err) => {
          setTestError('مرورگر نتوانست فایل صوتی را پخش کند. لطفاً روی صفحه کلیک کنید.');
          setTestingVoice(null);
        }
      );
    } catch (err: any) {
      console.error(err);
      setTestError(err.message || 'خطا در آزمون صدا');
      setTestingVoice(null);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;

    const colors = [
      'from-emerald-500 to-teal-700',
      'from-violet-500 to-purple-800',
      'from-rose-500 to-red-700',
      'from-amber-500 to-yellow-700',
      'from-cyan-500 to-blue-700',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    onAddCharacter({
      id: `char-${Date.now()}`,
      name: newCharName.trim(),
      role: 'supporting',
      voiceName: newCharVoice,
      description: newCharDesc.trim() || 'شخصیت نمایشی',
      avatarColor: randomColor,
      emotionStyle: 'طبیعی و نمایشی',
    });

    setNewCharName('');
    setNewCharDesc('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                اتاق صداپیشگان و مدیریت لحن بازیگران
              </h2>
              <p className="text-xs text-slate-400">
                تعیین و آزمون صدای هوش مصنوعی (Gemini TTS) برای هر شخصیت
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCurrentAudio();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner if voice test failed */}
        {testError && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{testError}</span>
          </div>
        )}

        {/* Characters List & Voice Selection */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {characters.map((char) => {
              const currentVoice = VOICE_OPTIONS.find((v) => v.name === char.voiceName);
              const isPlaying = testingVoice === char.voiceName;

              return (
                <div
                  key={char.id}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${char.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                      >
                        {char.name.slice(0, 1)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-100">{char.name}</h3>
                        <span className="text-[11px] text-slate-400 block">{char.description}</span>
                      </div>
                    </div>

                    {/* Delete button if extra */}
                    {characters.length > 2 && (
                      <button
                        onClick={() => onDeleteCharacter(char.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                        title="حذف شخصیت"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Voice Selector */}
                  <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-800/80">
                    <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                      <span>صدای تخصیص‌یافته:</span>
                      <span className="text-amber-400 font-mono text-[11px]">{char.voiceName}</span>
                    </label>

                    <select
                      value={char.voiceName}
                      onChange={(e) =>
                        onUpdateCharacter({
                          ...char,
                          voiceName: e.target.value as VoiceName,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      {VOICE_OPTIONS.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.label} - {v.desc.slice(0, 45)}...
                        </option>
                      ))}
                    </select>

                    <p className="text-[11px] text-slate-400 leading-relaxed min-h-[30px]">
                      {currentVoice?.desc}
                    </p>

                    {/* Test Audio Button */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleTestVoice(char.voiceName, `${char.name} هستم. دیالوگ‌های من با این صدا پخش خواهند شد.`)}
                        disabled={isPlaying}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          isPlaying
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500 animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isPlaying ? 'در حال پخش آزمایشی...' : 'آزمون این صدا (پیش‌نمایش فارسی)'}</span>
                      </button>

                      {isPlaying && (
                        <button
                          onClick={stopCurrentAudio}
                          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        >
                          <Square className="w-3 h-3 fill-rose-400" />
                          <span>توقف</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Character Form */}
          {isAdding ? (
            <form
              onSubmit={handleCreate}
              className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 space-y-3 mt-4"
            >
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>تعریف شخصیت جدید برای نمایش</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">نام کاراکتر:</label>
                  <input
                    type="text"
                    required
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    placeholder="مثلاً: کارآگاه، مادر، پیرمرد دانشمند..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">انتخاب صدا:</label>
                  <select
                    value={newCharVoice}
                    onChange={(e) => setNewCharVoice(e.target.value as VoiceName)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-300 block mb-1">
                    توضیح نقش و لحن بازی:
                  </label>
                  <input
                    type="text"
                    value={newCharDesc}
                    onChange={(e) => setNewCharDesc(e.target.value)}
                    placeholder="مثلاً: مردی ۳۵ ساله با لحنی جدی و پر از تردید"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg transition-colors"
                >
                  افزودن به نمایش
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 border border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl text-xs text-slate-400 hover:text-amber-300 flex items-center justify-center gap-2 transition-all mt-3"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن شخصیت جدید به گروه بازیگران</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>صداها مستقیماً توسط Gemini 3.8 Flash Audio پردازش می‌شوند.</span>
          <button
            onClick={() => {
              stopCurrentAudio();
              onClose();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
