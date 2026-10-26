import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Upload,
  FileText,
  Sparkles,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  ArrowLeft,
  Languages,
  BookMarked
} from 'lucide-react';
import { BookOutline, BookChapterPlan } from '../types/theater';

interface BookUploadModalProps {
  onConfirmBookOutline: (outline: BookOutline, initialEpisodeScript?: any) => void;
  onClose: () => void;
}

const SAMPLE_BOOKS = [
  {
    name: 'داستان کارآگاهی شرلوک هولمز: دره وحشت (انگلیسی)',
    lang: 'English',
    text: `Chapter 1: The Warning
"I am inclined to think—" said I.
"I should do so," Sherlock Holmes remarked impatiently.
I believe that I am one of the most long-suffering of mortals, but I'll admit that I was annoyed by the sardonic interruption.
"Really, Holmes," said I severely, "you are a little trying at times."
He was too much absorbed with his own thoughts to give any immediate answer to my remonstrance. He leaned upon his hand, with his untasted breakfast before him, and he stared at the slip of paper which he had just drawn from its envelope. Then he took the envelope itself, held it up to the light, and very carefully studied both the exterior and the flap.
"It is Porlock's writing," said he thoughtfully. "I can hardly doubt that it is Porlock's writing, though I have only seen it twice before. The Greek 'e' with the peculiar top flourish is distinctive. But if it is from Porlock, then it must be something of the very first importance."
Chapter 2: The Tragedy of Birlstone
The telegram arrived at Baker Street just as the afternoon fog was turning the London skies into a dull yellow canopy.
"Inspector MacDonald is on his way," Holmes murmured, looking at the clock. "A murder at Birlstone Manor in Sussex. A gentleman named John Douglas has been shot in terrible circumstances."
"Shall we go?" I asked, feeling the familiar prickle of excitement.
"Pack your bag, Watson. If my instincts are correct, the shadow of Professor Moriarty stretches even across the moors of Sussex."`,
  },
  {
    name: 'شازده کوچولو: سفر به زمین (فرانسوی)',
    lang: 'French',
    text: `Chapitre 17: Le Serpent dans le Désert
Quand on veut faire de l'esprit, il arrive qu'on mente un peu. Je n'ai pas été tout à fait honnête en vous parlant des allumeurs de réverbères.
Sur la Terre, il y a des centaines de rois, des milliers de géographes, des millions d'hommes d'affaires...
Le petit prince, une fois sur terre, fut donc bien surpris de ne voir personne. Il avait déjà peur de s'être trompé de planète, quand un anneau de couleur de lune remua dans le sable.
— Bonne nuit, fit le petit prince à tout hasard.
— Bonne nuit, fit le serpent.
— Sur quelle planète suis-je tombé ? demanda le petit prince.
— Sur la Terre, en Afrique, répondit le serpent.
— Ah !... Il n'y a donc personne sur la Terre ?
— C'est le désert. Il n'y a personne dans les déserts. La Terre est grande, dit le serpent.
Chapitre 21: Le Renard et le Secret
C'est alors qu'apparut le renard.
— Bonjour, dit le renard.
— Bonjour, répondit poliment le petit prince, qui se retourna mais ne vit rien.
— Je suis là, dit la voix, sous le pommier...
— Viens jouer avec moi, lui proposa le petit prince. Je suis tellement triste...
— Je ne puis pas jouer avec toi, dit le renard. Je ne suis pas apprivoisé.`,
  },
  {
    name: 'بوف کور اثر صادق هدایت (فارسی)',
    lang: 'Persian',
    text: `فصل اول: راز دختر اثیری و پیرمرد خنزرپنزری
در زندگی زخم‌هایی هست که مثل خوره روح را آهسته در انزوا می‌تراشد و می‌خورد. این دردها را نمی‌شود به کسی اظهار کرد، چون عموماً عادت دارند که این دردهای باورنکردنی را جزو اتفاقات و پیشامدهای نادر و عجیب بشمارند.
یک روز عصر، وقتی از شکاف بالای رف نگاهم به حیاط پشت افتاد، او را دیدم؛ دختری لاغر با چشم‌های مورب درشت و پیراهن سیاه در کنار جوی آب ایستاده بود و به پیرمردی که زیر درخت سرو نشسته بود گل نیلوفر تعارف می‌کرد. خنده‌ای خشک و بریده تمام وجود مرا تکان داد...
فصل دوم: کابوس در شهر ری
اتاقم سرد و نمناک بود. حس می‌کردم چشمان پیرمرد از پشت پنجره مرا می‌پایند. تصمیم گرفتم قلمدان را کنار بگذارم و تمام رازهایی را که سال‌ها در گلو داشتم برای سایه‌ام روی دیوار بنویسم.`,
  },
];

export const BookUploadModal: React.FC<BookUploadModalProps> = ({
  onConfirmBookOutline,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'sample'>('upload');
  const [bookTitleHint, setBookTitleHint] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('text/plain');
  const [targetDuration, setTargetDuration] = useState<number>(25); // 20-30 min target

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Outline preview once generated
  const [parsedOutline, setParsedOutline] = useState<BookOutline | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!bookTitleHint) {
      setBookTitleHint(file.name.replace(/\.[^/.]+$/, ''));
    }

    if (file.type === 'application/pdf') {
      setFileMimeType('application/pdf');
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const b64 = result.split(',')[1];
        setFileBase64(b64);
      };
      reader.readAsDataURL(file);
    } else {
      // Text file
      setFileMimeType('text/plain');
      const text = await file.text();
      setRawText(text);
      setFileBase64(null);
    }
  };

  const handleProcessBook = async () => {
    if (!rawText.trim() && !fileBase64) {
      setError('لطفاً فایلی را آپلود کنید یا متن کتاب را در کادر متنی وارد نمایید.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStep('در حال تحلیل متن و هویت‌شناسی اثر با هوش مصنوعی...');

    try {
      setProcessingStep('تشخیص زبان کتاب و تفکیک فصل‌ها به اپیزودهای ۲۰ تا ۳۰ دقیقه‌ای...');

      const res = await fetch('/api/gemini/parse-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookText: rawText,
          fileBase64,
          mimeType: fileMimeType,
          bookTitleHint,
          targetDurationMinutes: targetDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.outline) {
        throw new Error(data.error || 'خطا در استخراج ساختار و فصل‌های کتاب');
      }

      setProcessingStep('ساختار کتاب با موفقیت به زبان فارسی آماده شد.');
      setParsedOutline(data.outline);
    } catch (err: any) {
      console.error(err);
      const msg = String(err?.message || '');
      if (msg.includes('NetworkError') || msg.includes('Failed to fetch') || msg.includes('network')) {
        setError('ارتباط با سرور ابری موقتاً قطع یا ری‌استارت شد. لطفاً چند ثانیه بعد دکمه «تحلیل و تفکیک فصل‌های کتاب» را مجدداً بزنید.');
      } else {
        setError(err?.message || 'خطا در ارتباط با سرور هوش مصنوعی');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_BOOKS[0]) => {
    setBookTitleHint(sample.name.split(':')[0]);
    setRawText(sample.text);
    setSelectedFile(null);
    setFileBase64(null);
    setActiveTab('upload');
  };

  const handleConfirmAndStart = async () => {
    if (!parsedOutline) return;

    setIsProcessing(true);
    setProcessingStep('در حال نگارش سناریوی قسمت اول به زبان فارسی فاخر و تخصیص صداها...');

    try {
      const firstChapter = parsedOutline.chapters[0];
      const firstEpPlan = firstChapter?.episodesPlan[0];

      let initialScript = null;
      if (firstEpPlan) {
        const epRes = await fetch('/api/gemini/generate-book-episode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookTitle: parsedOutline.bookTitle,
            chapterTitle: firstChapter.persianChapterTitle,
            episodeTitle: firstEpPlan.title,
            synopsis: firstEpPlan.synopsis,
            textExcerpt: firstEpPlan.textExcerpt,
            episodeNumber: 1,
            totalEpisodesInChapter: firstChapter.totalEpisodes,
          }),
        });

        const epData = await epRes.json();
        if (epRes.ok && epData.episodeScript) {
          initialScript = epData.episodeScript;
        }
      }

      onConfirmBookOutline(parsedOutline, initialScript);
      onClose();
    } catch (err: any) {
      console.error(err);
      // Fallback: confirm outline anyway
      onConfirmBookOutline(parsedOutline);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="font-bold text-base md:text-lg text-slate-100">
                استودیوی تبدیل کتاب به نمایش رادیویی هوشمند
              </h2>
              <p className="text-xs text-slate-400">
                آپلود کتاب به هر زبانی و تبدیل فصل به فصل به اپیزودهای ۲۰ تا ۳۰ دقیقه‌ای فارسی
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
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!parsedOutline ? (
            /* Upload & Configuration Form */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>آپلود فایل یا ورود متن کتاب</span>
                </button>

                <button
                  onClick={() => setActiveTab('sample')}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'sample'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>نمونه کتاب‌های ادبی آماده (چند زبانه)</span>
                </button>
              </div>

              {activeTab === 'sample' ? (
                /* Sample books picker */
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-400">
                    برای تست سریع، می‌توانید یکی از کتاب‌های زیر را با زبان‌های مختلف انتخاب کنید تا هوش مصنوعی آن را تفکیک و به نمایش رادیویی فارسی تبدیل کند:
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {SAMPLE_BOOKS.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSample(s)}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <BookMarked className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">{s.name}</h4>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Languages className="w-3 h-3 text-cyan-400" />
                              <span>زبان اصلی: {s.lang} ➔ خروجی: فارسی روان</span>
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                          <span>انتخاب</span>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* File Upload or Text Area */
                <div className="space-y-4">
                  {/* Title and Target Length */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        عنوان کتاب (اختیاری):
                      </label>
                      <input
                        type="text"
                        value={bookTitleHint}
                        onChange={(e) => setBookTitleHint(e.target.value)}
                        placeholder="مثلاً: دره وحشت، 1984، گتسبی بزرگ..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        طول هر اپیزود در طولانی‌ترین حالت:
                      </label>
                      <select
                        value={targetDuration}
                        onChange={(e) => setTargetDuration(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value={25}>۲۰ تا ۳۰ دقیقه (پیشنهاد استاندارد تئاتر رادیویی)</option>
                        <option value={15}>۱۵ تا ۲۰ دقیقه (متوسط و خوش‌ریتم)</option>
                        <option value={10}>۱۰ تا ۱۵ دقیقه (کوتاه و فشرده)</option>
                      </select>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 bg-slate-950/60 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.md,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 mx-auto text-amber-400 group-hover:scale-110 transition-transform mb-2" />
                    <p className="text-xs font-bold text-slate-200">
                      فایل کتاب را اینجا بکشید یا برای انتخاب فایل کلیک کنید
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      پشتیبانی از فایل‌های متنی و PDF به تمام زبان‌ها (انگلیسی، فرانسوی، عربی، فارسی و...)
                    </p>

                    {selectedFile && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-medium">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span>{selectedFile.name}</span>
                        <span className="text-[10px] text-amber-400/80">
                          ({Math.round(selectedFile.size / 1024)} KB)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Or Paste Raw Text */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      یا متن فصل‌ها و کتاب را مستقیماً اینجا الصاق کنید:
                    </label>
                    <textarea
                      rows={5}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="متن فصل اول، دوم یا کل کتاب به هر زبانی (انگلیسی، فرانسه، فارسی و...)..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Feature Highlights */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2 text-slate-300 font-semibold">
                      <Languages className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ترجمه و دراماتیزه کردن به زبان فارسی:</span>
                    </div>
                    <p>
                      حتی اگر کتاب شما انگلیسی یا به زبان دیگری باشد، تمام نمایش‌ها، نریشن راوی و دیالوگ کاراکترها به فارسی فاخر و شنیداری درمی‌آیند. اگر فصلی طولانی باشد، هوش مصنوعی خودکار آن را به چند قسمت حداکثر ۲۰ تا ۳۰ دقیقه‌ای می‌شکند.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Book Outline Preview */
            <div className="space-y-4">
              <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                      طرح ساختاربندی شده کتاب
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {parsedOutline.bookTitle}
                    </h3>
                    <p className="text-xs text-slate-400">
                      نویسنده: {parsedOutline.author || 'نامشخص'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 block">زبان منبع</span>
                      <span className="font-bold text-cyan-400 font-mono">
                        {parsedOutline.originalLanguage} ➔ فارسی
                      </span>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 block">طول هر قسمت</span>
                      <span className="font-bold text-amber-400">۲۰-۳۰ دقیقه</span>
                    </div>
                  </div>
                </div>

                {/* Chapters and Sub-divided Episodes List */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {parsedOutline.chapters.map((chapter) => (
                    <div
                      key={chapter.chapterIndex}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold text-slate-200">
                            {chapter.persianChapterTitle}
                          </h4>
                        </div>
                        {chapter.isDividedIntoMultipleEpisodes && (
                          <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                            فصل طولانی: تبدیل شده به {chapter.totalEpisodes} قسمت
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {chapter.episodesPlan.map((ep) => (
                          <div
                            key={ep.id}
                            className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-lg text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-amber-300">{ep.title}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>~{ep.estimatedMinutes} دقیقه</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {ep.synopsis}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {isProcessing && (
              <span className="flex items-center gap-2 text-amber-400 animate-pulse font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>{processingStep}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl border border-slate-800"
            >
              انصراف
            </button>

            {!parsedOutline ? (
              <button
                onClick={handleProcessBook}
                disabled={isProcessing || (!rawText.trim() && !fileBase64)}
                className="flex items-center gap-2 text-xs bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>در حال تحلیل و تفکیک فصل‌ها...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>تحلیل کتاب و تفکیک به اپیزودهای ۲۰-۳۰ دقیقه‌ای</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleConfirmAndStart}
                disabled={isProcessing}
                className="flex items-center gap-2 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>در حال تولید اولین قسمت به زبان فارسی...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    <span>تأیید و ساخت نمایش (شروع با قسمت اول)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
