import React from 'react';
import {
  Radio,
  Sparkles,
  Users,
  Activity,
  FileText,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Zap
} from 'lucide-react';

interface HeaderProps {
  projectTitle: string;
  hasApiKey: boolean;
  onOpenBookUpload: () => void;
  onOpenCast: () => void;
  onOpenAiStory: () => void;
  onOpenLogs: () => void;
  onOpenHelp: () => void;
  logCount: number;
  hasErrors: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  projectTitle,
  hasApiKey,
  onOpenBookUpload,
  onOpenCast,
  onOpenAiStory,
  onOpenLogs,
  onOpenHelp,
  logCount,
  hasErrors,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
            <Radio className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base md:text-lg text-white">
                کارگردان نمایش رادیویی هوشمند
              </h1>
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                نسخه استودیویی
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>بهینه‌ساز توکن فعال</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs md:max-w-md">
              {projectTitle}
            </p>
          </div>
        </div>

        {/* Action Controls & Health */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Book Upload Button (Key user request) */}
          <button
            onClick={onOpenBookUpload}
            className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm shadow-cyan-500/20 transition-all"
            title="آپلود کتاب چند زبانه و تفکیک فصل به فصل به اپیزودهای ۲۰ تا ۳۰ دقیقه‌ای فارسی"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>آپلود کتاب (چندزبانه به فارسی)</span>
          </button>

          {/* Status Indicator */}
          <button
            onClick={onOpenLogs}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              hasErrors
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : hasApiKey
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="مشاهده وضعیت سلامت استودیو و گزارش خطاها"
          >
            {hasErrors ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : hasApiKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {hasErrors ? 'خطا در تولید' : hasApiKey ? 'موتور صوتی Gemini متصل است' : 'شبیه‌ساز محلی فعال'}
            </span>
          </button>

          {/* Cast voices */}
          <button
            onClick={onOpenCast}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>صداپیشگان</span>
          </button>

          {/* AI Script Writer */}
          <button
            onClick={onOpenAiStory}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-3 py-1.5 rounded-lg transition-all"
          >
            <span>تبدیل داستان دستی</span>
          </button>

          {/* Live Monitor / Activity Log */}
          <button
            onClick={onOpenLogs}
            className="relative flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            title="کنسول مانیتورینگ و دیباگ"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>لاگ استودیو</span>
            {logCount > 0 && (
              <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {logCount}
              </span>
            )}
          </button>

          {/* Help & Troubleshooting */}
          <button
            onClick={onOpenHelp}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="راهنمای عیب‌یابی صدا و دانلود"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
