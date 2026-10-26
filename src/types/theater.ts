export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface Character {
  id: string;
  name: string;
  role: 'narrator' | 'protagonist' | 'supporting' | 'extra';
  voiceName: VoiceName;
  description: string;
  avatarColor: string;
  emotionStyle: string;
}

export interface DialogueLine {
  id: string;
  characterId: string;
  characterName: string;
  text: string;
  stageDirection?: string; // دستور صحنه مانند: (با بغض در گلو)، (فریاد می‌زند)
  soundEffect?: string; // افکت صوتی مانند: صدای زوزه باد، صدای برخورد شمشیر
  emotion: string; // لحن بازیگری
  audioBase64?: string; // صدای تولید شده برای این خط
  audioStatus: 'idle' | 'generating' | 'ready' | 'error';
  errorMessage?: string;
  durationSeconds?: number;
}

export interface Episode {
  id: string;
  seasonId: string;
  number: number;
  title: string;
  synopsis: string;
  dialogues: DialogueLine[];
  masterAudioBase64?: string;
  masterAudioDuration?: number;
  isMasterGenerating?: boolean;
  coverImage?: string;
  sourceChapterTitle?: string;
  partNumber?: number;
  totalPartsInChapter?: number;
  estimatedMinutes?: number;
}

export interface Season {
  id: string;
  number: number;
  title: string;
  description: string;
  episodes: Episode[];
  originalChapterTitle?: string;
}

export interface BookEpisodePlan {
  id: string;
  seasonIndex: number;
  episodeIndex: number;
  title: string;
  synopsis: string;
  estimatedMinutes: number; // e.g. 20-30 min
  textExcerpt: string;
  isGenerated: boolean;
  generatedEpisodeId?: string;
}

export interface BookChapterPlan {
  chapterIndex: number;
  originalChapterTitle: string;
  persianChapterTitle: string;
  isDividedIntoMultipleEpisodes: boolean;
  totalEpisodes: number;
  episodesPlan: BookEpisodePlan[];
}

export interface BookOutline {
  bookTitle: string;
  author: string;
  originalLanguage: string;
  targetLanguage: string;
  targetDurationDesc: string; // e.g. "۲۰ تا ۳۰ دقیقه در هر قسمت"
  chapters: BookChapterPlan[];
  createdAt: string;
}

export interface TheaterProject {
  id: string;
  title: string;
  directorName: string;
  genre: string;
  characters: Character[];
  seasons: Season[];
  bookOutline?: BookOutline;
}

export interface StudioLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

