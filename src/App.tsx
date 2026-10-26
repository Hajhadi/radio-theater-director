import React, { useState, useEffect, useRef } from 'react';
import { initialProject } from './data/defaultProject';
import {
  TheaterProject,
  Season,
  Episode,
  Character,
  StudioLog,
  DialogueLine,
  BookOutline
} from './types/theater';
import { Header } from './components/Header';
import { NavigationSidebar } from './components/NavigationSidebar';
import { SceneScriptView } from './components/SceneScriptView';
import { MasterPlayer } from './components/MasterPlayer';
import { CastDirector } from './components/CastDirector';
import { AiStoryModal } from './components/AiStoryModal';
import { StudioLogsModal } from './components/StudioLogsModal';
import { HelpModal } from './components/HelpModal';
import { BookUploadModal } from './components/BookUploadModal';
import {
  playBase64Wav,
  stopCurrentAudio,
  downloadBase64Wav
} from './utils/audioUtils';

const STORAGE_KEY = 'radio_theater_project_v1';

export default function App() {
  // Load saved project or fall back to rich default project
  const [project, setProject] = useState<TheaterProject>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.seasons && parsed.seasons.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return initialProject;
  });

  // Current active navigation
  const [activeSeasonId, setActiveSeasonId] = useState<string>(
    project.seasons[0]?.id || 'season-1'
  );
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>(
    project.seasons[0]?.episodes[0]?.id || 'ep-1-1'
  );

  // Health and engine state
  const [hasApiKey, setHasApiKey] = useState(true);
  const [healthStatusMessage, setHealthStatusMessage] = useState('در حال بررسی اتصال به موتور صوتی...');
  const [logs, setLogs] = useState<StudioLog[]>([]);

  // Modals state
  const [isBookUploadOpen, setIsBookUploadOpen] = useState(false);
  const [isCastOpen, setIsCastOpen] = useState(false);
  const [isAiStoryOpen, setIsAiStoryOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGeneratingNextEpisode, setIsGeneratingNextEpisode] = useState(false);

  // Audio Playback & Generation State
  const [currentPlayingLineId, setCurrentPlayingLineId] = useState<string | null>(null);
  const [isPlayingEpisode, setIsPlayingEpisode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isMasterDownloading, setIsMasterDownloading] = useState(false);

  const cancelBatchRef = useRef(false);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlayingEpisode;

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // ignore
    }
  }, [project]);

  // Log helper
  const addLog = (type: StudioLog['type'], message: string, details?: string) => {
    const newLog: StudioLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      type,
      message,
      details,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // Check backend server health
  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
        setHealthStatusMessage(data.message || 'سرویس هوش مصنوعی متصل است.');
        addLog(
          'success',
          'وضعیت اتصال سرور بررسی شد: ' + (data.hasApiKey ? 'کلید Gemini معتبر' : 'بدون کلید'),
          JSON.stringify(data, null, 2)
        );
      } else {
        setHasApiKey(false);
        setHealthStatusMessage('پاسخ ناموفق از سرور محلی.');
        addLog('warning', 'سرور محلی پاسخ 200 ارسال نکرد.');
      }
    } catch (err: any) {
      console.error(err);
      setHasApiKey(false);
      setHealthStatusMessage('خطا در برقراری ارتباط با سرور.');
      addLog('error', 'عدم دسترسی به /api/health', err?.message);
    }
  };

  useEffect(() => {
    checkHealth();
    addLog('info', 'استودیوی کارگردانی نمایش رادیویی آغاز به کار کرد.');
  }, []);

  // Find active season and episode
  const activeSeason =
    project.seasons.find((s) => s.id === activeSeasonId) || project.seasons[0];
  const activeEpisode =
    activeSeason?.episodes.find((e) => e.id === activeEpisodeId) ||
    activeSeason?.episodes[0] ||
    project.seasons[0]?.episodes[0];

  // Helper to update current episode
  const updateCurrentEpisode = (updatedEpisode: Episode) => {
    setProject((prev) => {
      const seasons = prev.seasons.map((s) => {
        if (s.id === updatedEpisode.seasonId) {
          return {
            ...s,
            episodes: s.episodes.map((ep) => (ep.id === updatedEpisode.id ? updatedEpisode : ep)),
          };
        }
        return s;
      });
      return { ...prev, seasons };
    });
  };

  // Generate audio for a single dialogue line
  const handleGenerateLineAudio = async (dialogueId: string) => {
    if (!activeEpisode) return;

    const line = activeEpisode.dialogues.find((d) => d.id === dialogueId);
    if (!line) return;

    const char = project.characters.find((c) => c.id === line.characterId);
    const voiceName = char?.voiceName || 'Kore';

    // Set generating status
    const updateLineStatus = (status: DialogueLine['audioStatus'], audioBase64?: string, errorMsg?: string) => {
      setProject((prev) => {
        const seasons = prev.seasons.map((s) => {
          if (s.id === activeSeasonId) {
            return {
              ...s,
              episodes: s.episodes.map((ep) => {
                if (ep.id === activeEpisodeId) {
                  return {
                    ...ep,
                    dialogues: ep.dialogues.map((d) =>
                      d.id === dialogueId
                        ? {
                            ...d,
                            audioStatus: status,
                            audioBase64: audioBase64 !== undefined ? audioBase64 : d.audioBase64,
                            errorMessage: errorMsg,
                          }
                        : d
                    ),
                  };
                }
                return ep;
              }),
            };
          }
          return s;
        });
        return { ...prev, seasons };
      });
    };

    updateLineStatus('generating');
    addLog('info', `شروع تولید صدای دیالوگ: «${line.characterName}» با صدای ${voiceName}`);

    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.text,
          voiceName: voiceName,
          style: line.emotion ? `Persian radio drama acting, emotion: ${line.emotion}` : undefined,
          characterName: line.characterName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || 'پاسخ نامعتبر از سرور تولید صدا');
      }

      updateLineStatus('ready', data.audioBase64);
      if (data.cached) {
        addLog(
          'info',
          `⚡ [صرفه‌جویی توکن] صدای دیالوگ «${line.characterName}» از حافظه سریع بازخوانی شد (۰ توکن مصرف شد).`
        );
      } else {
        addLog(
          'success',
          `صدای دیالوگ «${line.characterName}» با موفقیت تولید شد (${line.text.slice(0, 30)}...)`
        );
      }
    } catch (err: any) {
      console.error(err);
      const rawMsg = err?.message || '';
      let errMsg = rawMsg;
      if (
        rawMsg.includes('NetworkError') ||
        rawMsg.includes('Failed to fetch') ||
        rawMsg.includes('network') ||
        rawMsg.includes('Load failed')
      ) {
        errMsg = 'ارتباط با سرور ابری موقتاً قطع شد یا در حال بازنشانی است. لطفاً چند لحظه بعد مجدداً دکمه تلاش را بزنید.';
      } else if (
        rawMsg.includes('429') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.includes('quota') ||
        rawMsg.includes('limit: 5')
      ) {
        errMsg = 'سقف ۵ درخواست در دقیقه پلن رایگان تکمیل شد. لطفاً ۳۰ ثانیه بعد دکمه تلاش مجدد را بزنید.';
      } else if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
        errMsg = 'ترافیک سرور هوش مصنوعی در این لحظه بالاست (خطای ۵۰۳). چند ثانیه بعد مجدداً دکمه تلاش را بزنید.';
      } else if (!errMsg) {
        errMsg = 'خطا در تبدیل دیالوگ به گفتار';
      }
      updateLineStatus('error', undefined, errMsg);
      addLog('error', `شکست در تولید صدای دیالوگ «${line.characterName}»`, errMsg);
      throw err;
    }
  };

  // Generate audio for all lines in the active episode sequentially with smart quota pacing
  const handleGenerateAllLines = async () => {
    if (!activeEpisode) return;

    cancelBatchRef.current = false;
    setIsBatchGenerating(true);
    const dialogues = activeEpisode.dialogues;
    setBatchProgress({ current: 0, total: dialogues.length });
    addLog('info', `آغاز ضبط یکپارچه برای کل قسمت: «${activeEpisode.title}» (${dialogues.length} دیالوگ)`);

    for (let i = 0; i < dialogues.length; i++) {
      if (cancelBatchRef.current) {
        addLog('warning', 'عملیات ضبط یکپارچه توسط کاربر متوقف شد.');
        break;
      }

      const d = dialogues[i];
      // Skip lines that already have audio
      if (d.audioStatus === 'ready' && d.audioBase64) {
        setBatchProgress({ current: i + 1, total: dialogues.length });
        continue;
      }

      setBatchProgress({ current: i + 1, total: dialogues.length });

      try {
        await handleGenerateLineAudio(d.id);
      } catch (err: any) {
        const rawMsg = String(err?.message || '');
        if (
          rawMsg.includes('429') ||
          rawMsg.includes('RESOURCE_EXHAUSTED') ||
          rawMsg.includes('quota') ||
          rawMsg.includes('limit')
        ) {
          addLog(
            'warning',
            `سقف ۵ درخواست در دقیقه پلن رایگان فعال شد. در حال توقف ۲۸ ثانیه‌ای برای تنظیم مجدد سهمیه...`
          );
          // Wait 28 seconds for the 1-minute quota bucket to slide and retry this exact line
          await new Promise((resolve) => setTimeout(resolve, 28000));
          if (!cancelBatchRef.current) {
            try {
              await handleGenerateLineAudio(d.id);
            } catch {
              // continue to next if still failing
            }
          }
        }
      }

      // 4-second polite delay between lines to avoid hitting 5 requests per minute too quickly
      if (i < dialogues.length - 1 && !cancelBatchRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    }

    setIsBatchGenerating(false);
    addLog('success', `پایان فرآیند تولید صدای قسمت: «${activeEpisode.title}»`);
  };

  const handleCancelBatch = () => {
    cancelBatchRef.current = true;
    setIsBatchGenerating(false);
  };

  // Play single line
  const handlePlayLine = (dialogueId: string) => {
    if (!activeEpisode) return;
    const line = activeEpisode.dialogues.find((d) => d.id === dialogueId);
    if (!line || !line.audioBase64) return;

    setCurrentPlayingLineId(dialogueId);
    addLog('info', `پخش دیالوگ: «${line.characterName}»`);

    const audio = playBase64Wav(
      line.audioBase64,
      () => {
        setCurrentPlayingLineId(null);
      },
      (err) => {
        addLog('error', 'خطا در پخش فایل صوتی در مرورگر', String(err));
        setCurrentPlayingLineId(null);
      }
    );

    if (audio) {
      audio.playbackRate = playbackSpeed;
    }
  };

  const handleStopPlay = () => {
    stopCurrentAudio();
    setCurrentPlayingLineId(null);
    setIsPlayingEpisode(false);
  };

  // Play full episode sequentially
  const handlePlayEpisodeSequentially = async () => {
    if (!activeEpisode) return;
    stopCurrentAudio();
    setIsPlayingEpisode(true);

    const dialoguesWithAudio = activeEpisode.dialogues.filter(
      (d) => d.audioStatus === 'ready' && d.audioBase64
    );

    if (dialoguesWithAudio.length === 0) {
      alert('ابتدا باید حداقل صدای یک دیالوگ را تولید کنید.');
      setIsPlayingEpisode(false);
      return;
    }

    addLog('info', `آغاز پخش پیوسته نمایش: «${activeEpisode.title}»`);

    for (let i = 0; i < dialoguesWithAudio.length; i++) {
      if (!isPlayingRef.current) break;

      const line = dialoguesWithAudio[i];
      setCurrentPlayingLineId(line.id);

      // Scroll to element smoothly
      const el = document.getElementById(`dialogue-${line.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      await new Promise<void>((resolve) => {
        const audio = playBase64Wav(
          line.audioBase64!,
          () => resolve(),
          () => resolve()
        );
        if (audio) {
          audio.playbackRate = playbackSpeed;
        }
      });

      // Pause between characters
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setCurrentPlayingLineId(null);
    setIsPlayingEpisode(false);
    addLog('info', `پایان پخش پیوسته نمایش: «${activeEpisode.title}»`);
  };

  // Next and Previous line transport controls
  const handleNextLine = () => {
    if (!activeEpisode) return;
    const currentIndex = activeEpisode.dialogues.findIndex((d) => d.id === currentPlayingLineId);
    if (currentIndex < activeEpisode.dialogues.length - 1) {
      const nextLine = activeEpisode.dialogues[currentIndex + 1];
      if (nextLine.audioBase64) {
        handlePlayLine(nextLine.id);
      }
    }
  };

  const handlePrevLine = () => {
    if (!activeEpisode) return;
    const currentIndex = activeEpisode.dialogues.findIndex((d) => d.id === currentPlayingLineId);
    if (currentIndex > 0) {
      const prevLine = activeEpisode.dialogues[currentIndex - 1];
      if (prevLine.audioBase64) {
        handlePlayLine(prevLine.id);
      }
    }
  };

  // Download Genuine Master Audio (Addresses the 40s English mock file issue)
  const handleDownloadMasterAudio = async () => {
    if (!activeEpisode) return;

    const readyLines = activeEpisode.dialogues.filter(
      (d) => d.audioStatus === 'ready' && d.audioBase64
    );

    if (readyLines.length === 0) {
      alert('هنوز هیچ صدایی برای این قسمت ضبط نشده است. لطفاً ابتدا دکمه «تولید و ضبط صدای کل قسمت» را بزنید.');
      return;
    }

    if (readyLines.length < activeEpisode.dialogues.length) {
      const proceed = confirm(
        `تنها ${readyLines.length} دیالوگ از مجموع ${activeEpisode.dialogues.length} دیالوگ آماده است. آیا مایلید همین قطعات آماده در قالب فایل صوتی کامل ادغام و دانلود شوند؟`
      );
      if (!proceed) return;
    }

    setIsMasterDownloading(true);
    addLog('info', `در حال تلفیق ${readyLines.length} قطعه صوتی برای فایل نهایی اپیزود...`);

    try {
      const audioList = readyLines.map((l) => l.audioBase64);
      const res = await fetch('/api/audio/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioList,
          pauseDurationMs: 450, // 450ms breath pause between actors
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.masterAudioBase64) {
        throw new Error(data.error || 'خطا در ادغام فایل‌های صوتی');
      }

      // Download file with proper Persian sanitized title
      const cleanTitle = `${activeSeason?.title || 'فصل'}_${activeEpisode.title}`
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_');

      downloadBase64Wav(data.masterAudioBase64, `${cleanTitle}.wav`);
      addLog(
        'success',
        `فایل صوتی کامل و تلفیق‌شده اپیزود (${data.durationSeconds} ثانیه، ${Math.round(data.sizeBytes / 1024)} کیلوبایت) دانلود شد.`
      );
    } catch (err: any) {
      console.error(err);
      addLog('error', 'شکست در ادغام و دانلود اپیزود مستر', err?.message);
      alert(`خطا در ایجاد فایل صوتی کامل: ${err?.message}`);
    } finally {
      setIsMasterDownloading(false);
    }
  };

  // Season and Episode Management
  const handleAddSeason = () => {
    const newNumber = project.seasons.length + 1;
    const newSeasonId = `season-${Date.now()}`;
    const newEpisodeId = `ep-${Date.now()}`;

    const newSeason: Season = {
      id: newSeasonId,
      number: newNumber,
      title: `فصل ${newNumber}: فصل جدید نمایش`,
      description: 'داستان و ماجراجویی‌های جدید در این فصل',
      episodes: [
        {
          id: newEpisodeId,
          seasonId: newSeasonId,
          number: 1,
          title: 'قسمت ۱: شروع ماجرا',
          synopsis: 'آغاز رویدادهای فصل جدید',
          dialogues: [
            {
              id: `diag-${Date.now()}-1`,
              characterId: 'char-narrator',
              characterName: 'راوی (خلبان)',
              text: 'پرده‌ها کنار می‌روند و ماجرایی نو در فضایی پر از رمز و راز آغاز می‌شود.',
              emotion: 'پر از امید و طمأنینه',
              audioStatus: 'idle',
            },
          ],
        },
      ],
    };

    setProject((prev) => ({
      ...prev,
      seasons: [...prev.seasons, newSeason],
    }));

    setActiveSeasonId(newSeasonId);
    setActiveEpisodeId(newEpisodeId);
    addLog('success', `فصل جدید («${newSeason.title}») ایجاد شد.`);
  };

  const handleAddEpisode = (seasonId: string) => {
    const targetSeason = project.seasons.find((s) => s.id === seasonId);
    if (!targetSeason) return;

    const newNumber = targetSeason.episodes.length + 1;
    const newEpisodeId = `ep-${Date.now()}`;

    const newEpisode: Episode = {
      id: newEpisodeId,
      seasonId: seasonId,
      number: newNumber,
      title: `قسمت ${newNumber}: صحنه تازه`,
      synopsis: 'توصیف وقایع این قسمت',
      dialogues: [
        {
          id: `diag-${Date.now()}-1`,
          characterId: 'char-narrator',
          characterName: 'راوی (خلبان)',
          text: 'روشنایی روز آرام‌آرام پدیدار می‌شود و شخصیت‌ها وارد صحنه می‌شوند.',
          emotion: 'روایتگر و آرام',
          audioStatus: 'idle',
        },
      ],
    };

    setProject((prev) => ({
      ...prev,
      seasons: prev.seasons.map((s) =>
        s.id === seasonId
          ? { ...s, episodes: [...s.episodes, newEpisode] }
          : s
      ),
    }));

    setActiveSeasonId(seasonId);
    setActiveEpisodeId(newEpisodeId);
    addLog('success', `قسمت جدید («${newEpisode.title}») به فصل افزوده شد.`);
  };

  const handleDeleteEpisode = (seasonId: string, episodeId: string) => {
    setProject((prev) => {
      const seasons = prev.seasons.map((s) => {
        if (s.id === seasonId) {
          return {
            ...s,
            episodes: s.episodes.filter((ep) => ep.id !== episodeId),
          };
        }
        return s;
      });
      return { ...prev, seasons };
    });

    // If active episode was deleted, switch to another
    if (activeEpisodeId === episodeId) {
      const s = project.seasons.find((s) => s.id === seasonId);
      const remaining = s?.episodes.filter((ep) => ep.id !== episodeId);
      if (remaining && remaining.length > 0) {
        setActiveEpisodeId(remaining[0].id);
      }
    }
  };

  // AI Story script import
  const handleImportAiEpisode = (
    seasonId: string,
    newEpisode: Episode,
    newCharacters: Character[]
  ) => {
    setProject((prev) => {
      // Merge unique characters
      const existingIds = new Set(prev.characters.map((c) => c.name));
      const charsToAdd = newCharacters.filter((c) => !existingIds.has(c.name));

      const seasons = prev.seasons.map((s) => {
        if (s.id === seasonId) {
          return {
            ...s,
            episodes: [...s.episodes, newEpisode],
          };
        }
        return s;
      });

      return {
        ...prev,
        characters: [...prev.characters, ...charsToAdd],
        seasons,
      };
    });

    setActiveSeasonId(seasonId);
    setActiveEpisodeId(newEpisode.id);
    addLog('success', `سناریوی هوش مصنوعی برای «${newEpisode.title}» بارگذاری شد.`);
  };

  // Compute Next Episode Info (Key user request)
  const getNextEpisodeInfo = () => {
    if (!activeSeason || !activeEpisode) return null;

    // 1. Check if there's a structured book outline
    if (project.bookOutline) {
      const chapters = project.bookOutline.chapters;
      const allPlans: {
        chapter: typeof chapters[0];
        plan: typeof chapters[0]['episodesPlan'][0];
      }[] = [];

      chapters.forEach((ch) => {
        ch.episodesPlan.forEach((p) => {
          allPlans.push({ chapter: ch, plan: p });
        });
      });

      // Find the index of the current active episode
      const currentPlanIndex = allPlans.findIndex(
        (item) => item.plan.title === activeEpisode.title || item.plan.id === activeEpisode.id
      );

      if (currentPlanIndex !== -1 && currentPlanIndex < allPlans.length - 1) {
        const nextItem = allPlans[currentPlanIndex + 1];
        let existingSeasonId = '';
        let existingEpisodeId = '';

        for (const s of project.seasons) {
          const found = s.episodes.find(
            (ep) => ep.title === nextItem.plan.title || ep.id === nextItem.plan.id
          );
          if (found) {
            existingSeasonId = s.id;
            existingEpisodeId = found.id;
            break;
          }
        }

        return {
          exists: Boolean(existingEpisodeId),
          seasonId: existingSeasonId || `season-${nextItem.chapter.chapterIndex}`,
          episodeId: existingEpisodeId,
          title: nextItem.plan.title,
          synopsis: nextItem.plan.synopsis,
          estimatedMinutes: nextItem.plan.estimatedMinutes || 25,
          planId: nextItem.plan.id,
          isBookPlan: true,
          chapterTitle: nextItem.chapter.persianChapterTitle,
          textExcerpt: nextItem.plan.textExcerpt,
        };
      }
    }

    // 2. Default fallback: check next episode in current season
    const currentEpIndex = activeSeason.episodes.findIndex((e) => e.id === activeEpisode.id);
    if (currentEpIndex !== -1 && currentEpIndex < activeSeason.episodes.length - 1) {
      const nextEp = activeSeason.episodes[currentEpIndex + 1];
      return {
        exists: true,
        seasonId: activeSeason.id,
        episodeId: nextEp.id,
        title: nextEp.title,
        synopsis: nextEp.synopsis,
        estimatedMinutes: 20,
      };
    }

    // Check first episode of next season
    const currentSeasonIndex = project.seasons.findIndex((s) => s.id === activeSeason.id);
    if (currentSeasonIndex !== -1 && currentSeasonIndex < project.seasons.length - 1) {
      const nextSeason = project.seasons[currentSeasonIndex + 1];
      if (nextSeason.episodes.length > 0) {
        const nextEp = nextSeason.episodes[0];
        return {
          exists: true,
          seasonId: nextSeason.id,
          episodeId: nextEp.id,
          title: `${nextSeason.title} - ${nextEp.title}`,
          synopsis: nextEp.synopsis,
          estimatedMinutes: 20,
        };
      }
    }

    return null;
  };

  const nextEpisodeInfo = getNextEpisodeInfo();

  // Go to next existing episode
  const handleGoToNextEpisode = () => {
    if (!nextEpisodeInfo || !nextEpisodeInfo.exists || !nextEpisodeInfo.episodeId) return;
    setActiveSeasonId(nextEpisodeInfo.seasonId);
    setActiveEpisodeId(nextEpisodeInfo.episodeId);
    stopCurrentAudio();
    setCurrentPlayingLineId(null);
    setIsPlayingEpisode(false);
  };

  // Generate next episode screenplay from book plan (Persian, 20-30 min)
  const handleGenerateNextBookEpisode = async () => {
    if (!nextEpisodeInfo) return;

    setIsGeneratingNextEpisode(true);
    addLog('info', `آغاز نگارش سناریوی فارسی برای قسمت بعد: «${nextEpisodeInfo.title}»`);

    try {
      const res = await fetch('/api/gemini/generate-book-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: project.bookOutline?.bookTitle || project.title,
          chapterTitle: (nextEpisodeInfo as any).chapterTitle || activeSeason?.title,
          episodeTitle: nextEpisodeInfo.title,
          synopsis: nextEpisodeInfo.synopsis,
          textExcerpt: (nextEpisodeInfo as any).textExcerpt || '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.episodeScript) {
        throw new Error(data.error || 'خطا در تولید سناریوی قسمت بعد');
      }

      const script = data.episodeScript;

      // Map characters
      const newCharacters: Character[] = (script.characters || []).map((c: any, idx: number) => ({
        id: `char-${Date.now()}-${idx}`,
        name: c.name || 'شخصیت',
        role: idx === 0 ? 'narrator' : 'supporting',
        voiceName: c.voiceName || (idx % 2 === 0 ? 'Kore' : 'Charon'),
        description: c.description || 'شخصیت نمایش رادیویی',
        avatarColor: 'from-amber-600 to-orange-700',
        emotionStyle: 'بیان احساسی و شفاف',
      }));

      // Map dialogues
      const newDialogues: DialogueLine[] = (script.dialogues || []).map((d: any, idx: number) => {
        const matchedChar =
          newCharacters.find((c) => c.name === d.character) ||
          project.characters.find((c) => c.name === d.character);
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

      const newEpId = `ep-${Date.now()}`;
      const newEpisode: Episode = {
        id: newEpId,
        seasonId: nextEpisodeInfo.seasonId,
        number: (activeSeason?.episodes.length || 0) + 1,
        title: script.title || nextEpisodeInfo.title,
        synopsis: script.synopsis || nextEpisodeInfo.synopsis || '',
        dialogues: newDialogues,
        estimatedMinutes: nextEpisodeInfo.estimatedMinutes || 25,
      };

      // Add to project
      setProject((prev) => {
        const existingNames = new Set(prev.characters.map((c) => c.name));
        const charsToAdd = newCharacters.filter((c) => !existingNames.has(c.name));

        let seasonFound = false;
        const seasons = prev.seasons.map((s) => {
          if (
            s.id === nextEpisodeInfo.seasonId ||
            s.title === (nextEpisodeInfo as any).chapterTitle
          ) {
            seasonFound = true;
            return {
              ...s,
              episodes: [...s.episodes, newEpisode],
            };
          }
          return s;
        });

        if (!seasonFound) {
          seasons.push({
            id: nextEpisodeInfo.seasonId,
            number: seasons.length + 1,
            title: (nextEpisodeInfo as any).chapterTitle || `فصل ${seasons.length + 1}`,
            description: nextEpisodeInfo.synopsis || 'فصل جدید کتاب',
            episodes: [newEpisode],
          });
        }

        return {
          ...prev,
          characters: [...prev.characters, ...charsToAdd],
          seasons,
        };
      });

      // Switch active episode to the newly generated one
      setActiveSeasonId(nextEpisodeInfo.seasonId);
      setActiveEpisodeId(newEpId);
      stopCurrentAudio();
      setCurrentPlayingLineId(null);
      setIsPlayingEpisode(false);

      addLog(
        'success',
        `سناریوی فارسی قسمت جدید («${newEpisode.title}») تولید شد و استودیو به این قسمت منتقل گردید.`
      );
    } catch (err: any) {
      console.error(err);
      addLog('error', 'شکست در نگارش سناریوی قسمت بعد', err?.message);
      alert(`خطا در تولید قسمت بعد: ${err?.message}`);
    } finally {
      setIsGeneratingNextEpisode(false);
    }
  };

  // Confirm Book Outline & initialize book episodes
  const handleConfirmBookOutline = (outline: BookOutline, initialEpisodeScript?: any) => {
    const newSeasons: Season[] = outline.chapters.map((ch, chIdx) => {
      const seasonId = `season-${ch.chapterIndex || chIdx + 1}`;
      const episodes: Episode[] = [];

      // If initial script exists and this is the first chapter
      if (chIdx === 0 && initialEpisodeScript) {
        const firstPlan = ch.episodesPlan[0];
        const newEpId = `ep-${Date.now()}`;
        const dialogues: DialogueLine[] = (initialEpisodeScript.dialogues || []).map(
          (d: any, idx: number) => ({
            id: `diag-${Date.now()}-${idx}`,
            characterId: 'char-narrator',
            characterName: d.character || 'راوی',
            text: d.text,
            stageDirection: d.style || '',
            soundEffect: d.soundEffect || '',
            emotion: d.style || 'طبیعی',
            audioStatus: 'idle',
          })
        );

        episodes.push({
          id: newEpId,
          seasonId,
          number: 1,
          title: firstPlan?.title || initialEpisodeScript.title || 'قسمت ۱',
          synopsis: firstPlan?.synopsis || initialEpisodeScript.synopsis || '',
          dialogues,
          estimatedMinutes: firstPlan?.estimatedMinutes || 25,
        });
      }

      return {
        id: seasonId,
        number: ch.chapterIndex || chIdx + 1,
        title: ch.persianChapterTitle,
        description: `فصل ${ch.chapterIndex}: شامل ${ch.totalEpisodes} قسمت ۲۰ تا ۳۰ دقیقه‌ای`,
        episodes,
      };
    });

    // Ensure first season has at least 1 episode if initialScript was null
    if (newSeasons[0] && newSeasons[0].episodes.length === 0) {
      const firstPlan = outline.chapters[0]?.episodesPlan[0];
      newSeasons[0].episodes.push({
        id: `ep-${Date.now()}`,
        seasonId: newSeasons[0].id,
        number: 1,
        title: firstPlan?.title || 'قسمت ۱: آغاز نمایش',
        synopsis: firstPlan?.synopsis || 'آغاز رویدادهای کتاب',
        dialogues: [
          {
            id: `diag-${Date.now()}-1`,
            characterId: 'char-narrator',
            characterName: 'راوی',
            text: 'صحنه در سکوتی رازآلود فرو رفته است. داستان این اثر بزرگ ادبی اکنون به زبان فارسی آغاز می‌شود...',
            emotion: 'باوقار و آرام',
            audioStatus: 'idle',
          },
        ],
        estimatedMinutes: firstPlan?.estimatedMinutes || 25,
      });
    }

    setProject({
      id: `proj-${Date.now()}`,
      title: `نمایش رادیویی ${outline.bookTitle}`,
      directorName: 'استودیوی درام صوتی رادیو تئاتر',
      genre: 'تئاتر رادیویی و اقتباس کتاب',
      characters: initialProject.characters,
      seasons: newSeasons,
      bookOutline: outline,
    });

    setActiveSeasonId(newSeasons[0].id);
    setActiveEpisodeId(newSeasons[0].episodes[0].id);
    addLog(
      'success',
      `پروژه کتاب «${outline.bookTitle}» با موفقیت ساخته شد و آماده تولید اپیزود به اپیزود است.`
    );
  };

  const hasErrors = activeEpisode?.dialogues.some((d) => d.audioStatus === 'error') || false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Application Header */}
      <Header
        projectTitle={project.title}
        hasApiKey={hasApiKey}
        onOpenBookUpload={() => setIsBookUploadOpen(true)}
        onOpenCast={() => setIsCastOpen(true)}
        onOpenAiStory={() => setIsAiStoryOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        logCount={logs.length}
        hasErrors={hasErrors}
      />

      {/* Main Studio Layout: Sidebar + Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Seasons & Episodes Tree) */}
        <NavigationSidebar
          seasons={project.seasons}
          activeSeasonId={activeSeasonId}
          activeEpisodeId={activeEpisodeId}
          onSelectEpisode={(seasonId, episodeId) => {
            setActiveSeasonId(seasonId);
            setActiveEpisodeId(episodeId);
            stopCurrentAudio();
            setCurrentPlayingLineId(null);
            setIsPlayingEpisode(false);
          }}
          onAddSeason={handleAddSeason}
          onAddEpisode={handleAddEpisode}
          onDeleteEpisode={handleDeleteEpisode}
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Central Workspace: Script & Audio Director Console */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Mobile drawer toggle */}
          <div className="lg:hidden p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-amber-400 font-medium"
            >
              فهرست فصل‌ها و قسمت‌ها
            </button>
            <span className="text-xs text-slate-400 font-semibold truncate max-w-[200px]">
              {activeEpisode?.title}
            </span>
          </div>

          {activeEpisode ? (
            <SceneScriptView
              episode={activeEpisode}
              seasonTitle={activeSeason?.title || 'فصل جاری'}
              characters={project.characters}
              bookOutline={project.bookOutline}
              nextEpisodeInfo={nextEpisodeInfo}
              onGoToNextEpisode={handleGoToNextEpisode}
              onGenerateNextEpisode={handleGenerateNextBookEpisode}
              isGeneratingNextEpisode={isGeneratingNextEpisode}
              onUpdateEpisode={updateCurrentEpisode}
              onGenerateLineAudio={handleGenerateLineAudio}
              onGenerateAllLines={handleGenerateAllLines}
              onCancelBatch={handleCancelBatch}
              isBatchGenerating={isBatchGenerating}
              batchProgress={batchProgress}
              onDownloadMasterAudio={handleDownloadMasterAudio}
              isMasterDownloading={isMasterDownloading}
              currentPlayingLineId={currentPlayingLineId}
              onPlayLine={handlePlayLine}
              onStopPlay={handleStopPlay}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500">
              قسمتی برای نمایش انتخاب نشده است.
            </div>
          )}
        </main>
      </div>

      {/* Bottom Docked Master Timeline Player */}
      {activeEpisode && (
        <MasterPlayer
          episode={activeEpisode}
          characters={project.characters}
          currentPlayingLineId={currentPlayingLineId}
          onPlayEpisodeSequentially={handlePlayEpisodeSequentially}
          onPauseEpisode={handleStopPlay}
          onNextLine={handleNextLine}
          onPrevLine={handlePrevLine}
          isPlaying={isPlayingEpisode}
          onDownloadMasterAudio={handleDownloadMasterAudio}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={setPlaybackSpeed}
        />
      )}

      {/* Cast Voices Manager Modal */}
      {isCastOpen && (
        <CastDirector
          characters={project.characters}
          onUpdateCharacter={(char) =>
            setProject((prev) => ({
              ...prev,
              characters: prev.characters.map((c) => (c.id === char.id ? char : c)),
            }))
          }
          onAddCharacter={(char) =>
            setProject((prev) => ({
              ...prev,
              characters: [...prev.characters, char],
            }))
          }
          onDeleteCharacter={(charId) =>
            setProject((prev) => ({
              ...prev,
              characters: prev.characters.filter((c) => c.id !== charId),
            }))
          }
          onClose={() => setIsCastOpen(false)}
        />
      )}

      {/* AI Story to Radio Script Modal */}
      {isAiStoryOpen && (
        <AiStoryModal
          seasons={project.seasons}
          activeSeasonId={activeSeasonId}
          onImportEpisode={handleImportAiEpisode}
          onClose={() => setIsAiStoryOpen(false)}
        />
      )}

      {/* Book Upload & Parsing Modal (Key Feature) */}
      {isBookUploadOpen && (
        <BookUploadModal
          onConfirmBookOutline={handleConfirmBookOutline}
          onClose={() => setIsBookUploadOpen(false)}
        />
      )}

      {/* Live Studio Logs and Diagnostics Modal */}
      {isLogsOpen && (
        <StudioLogsModal
          logs={logs}
          onClearLogs={() => setLogs([])}
          onRefreshHealth={checkHealth}
          onClose={() => setIsLogsOpen(false)}
          hasApiKey={hasApiKey}
          statusMessage={healthStatusMessage}
        />
      )}

      {/* Help and FAQ Modal */}
      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </div>
  );
}
