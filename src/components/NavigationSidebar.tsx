import React, { useState } from 'react';
import {
  Folder,
  Layers,
  ChevronDown,
  ChevronLeft,
  Plus,
  PlayCircle,
  CheckCircle,
  Clock,
  Search,
  Sparkles,
  Music,
  Trash2,
  BookOpen
} from 'lucide-react';
import { Season, Episode } from '../types/theater';

interface NavigationSidebarProps {
  seasons: Season[];
  activeSeasonId: string;
  activeEpisodeId: string;
  onSelectEpisode: (seasonId: string, episodeId: string) => void;
  onAddSeason: () => void;
  onAddEpisode: (seasonId: string) => void;
  onDeleteEpisode: (seasonId: string, episodeId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  seasons,
  activeSeasonId,
  activeEpisodeId,
  onSelectEpisode,
  onAddSeason,
  onAddEpisode,
  onDeleteEpisode,
  isOpen,
  onToggleOpen,
}) => {
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({
    'season-1': true,
    'season-2': true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => ({
      ...prev,
      [seasonId]: !prev[seasonId],
    }));
  };

  const filteredSeasons = seasons.map((season) => {
    if (!searchQuery.trim()) return season;
    const q = searchQuery.toLowerCase();
    const matchingEpisodes = season.episodes.filter(
      (ep) =>
        ep.title.toLowerCase().includes(q) ||
        ep.synopsis.toLowerCase().includes(q) ||
        ep.dialogues.some((d) => d.text.toLowerCase().includes(q))
    );
    return {
      ...season,
      episodes: matchingEpisodes,
    };
  }).filter((season) => season.episodes.length > 0 || !searchQuery.trim());

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-[61px] bottom-0 right-0 z-30 w-72 sm:w-80 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } lg:static lg:h-[calc(100vh-61px)]`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-sm text-slate-100">فهرست فصل‌ها و قسمت‌ها</h2>
          </div>
          <button
            onClick={onAddSeason}
            className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-2 py-1 rounded transition-colors"
            title="افزودن فصل جدید به پروژه"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فصل جدید</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجوی قسمت یا دیالوگ..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Season & Episode Tree */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredSeasons.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              هیچ قسمتی مطابق جست‌وجو یافت نشد.
            </div>
          ) : (
            filteredSeasons.map((season) => {
              const isExpanded = expandedSeasons[season.id] ?? true;
              const totalDialogues = season.episodes.reduce((acc, ep) => acc + ep.dialogues.length, 0);
              const readyDialogues = season.episodes.reduce(
                (acc, ep) => acc + ep.dialogues.filter((d) => d.audioStatus === 'ready').length,
                0
              );

              return (
                <div
                  key={season.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl overflow-hidden transition-all shadow-sm"
                >
                  {/* Season Header */}
                  <div
                    onClick={() => toggleSeason(season.id)}
                    className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-slate-200 block truncate">
                          {season.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{season.episodes.length} قسمت</span>
                          <span>•</span>
                          <span
                            className={
                              readyDialogues === totalDialogues && totalDialogues > 0
                                ? 'text-emerald-400 font-medium'
                                : 'text-slate-400'
                            }
                          >
                            {readyDialogues}/{totalDialogues} صوت آماده
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Episodes List */}
                  {isExpanded && (
                    <div className="border-t border-slate-850 p-1.5 space-y-1 bg-slate-950/30">
                      {season.episodes.map((episode) => {
                        const isActive =
                          season.id === activeSeasonId && episode.id === activeEpisodeId;
                        const readyCount = episode.dialogues.filter(
                          (d) => d.audioStatus === 'ready'
                        ).length;
                        const totalCount = episode.dialogues.length;
                        const isGenerating = episode.dialogues.some(
                          (d) => d.audioStatus === 'generating'
                        );
                        const hasErrors = episode.dialogues.some(
                          (d) => d.audioStatus === 'error'
                        );

                        return (
                          <div
                            key={episode.id}
                            onClick={() => onSelectEpisode(season.id, episode.id)}
                            className={`group p-2 rounded-lg cursor-pointer transition-all flex items-start justify-between gap-2 border ${
                              isActive
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm'
                                : 'hover:bg-slate-800/60 border-transparent text-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <BookOpen
                                className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                                  isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-medium leading-snug truncate">
                                  {episode.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                  <span>{totalCount} بند دیالوگ</span>
                                  <span>•</span>
                                  {isGenerating ? (
                                    <span className="text-amber-400 flex items-center gap-1 font-medium animate-pulse">
                                      <Clock className="w-2.5 h-2.5" />
                                      در حال ضبط...
                                    </span>
                                  ) : hasErrors ? (
                                    <span className="text-rose-400 font-medium">خطا در ضبط</span>
                                  ) : readyCount === totalCount && totalCount > 0 ? (
                                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                                      <CheckCircle className="w-2.5 h-2.5" />
                                      کامل
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">
                                      {readyCount} از {totalCount} آماده
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Delete Episode (hidden unless hovered & not sole episode) */}
                            {season.episodes.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`آیا از حذف "${episode.title}" اطمینان دارید؟`)) {
                                    onDeleteEpisode(season.id, episode.id);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-all"
                                title="حذف قسمت"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Episode Button */}
                      <button
                        onClick={() => onAddEpisode(season.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-400 hover:text-amber-300 hover:bg-slate-800/40 rounded border border-dashed border-slate-800 transition-colors mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>افزودن قسمت جدید به این فصل</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Stats */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span>مجموع فصل‌ها: {seasons.length}</span>
          </div>
          <span className="text-slate-500">Gemini 3.8 Audio</span>
        </div>
      </aside>
    </>
  );
};
