import React, { useState } from 'react';
import {
  Activity,
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { StudioLog } from '../types/theater';

interface StudioLogsModalProps {
  logs: StudioLog[];
  onClearLogs: () => void;
  onRefreshHealth: () => void;
  onClose: () => void;
  hasApiKey: boolean;
  statusMessage: string;
}

export const StudioLogsModal: React.FC<StudioLogsModalProps> = ({
  logs,
  onClearLogs,
  onRefreshHealth,
  onClose,
  hasApiKey,
  statusMessage,
}) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'success'>('all');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'error') return log.type === 'error' || log.type === 'warning';
    if (filter === 'success') return log.type === 'success';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                کنسول مانیتورینگ زنده و عیب‌یابی استودیو
              </h2>
              <p className="text-xs text-slate-400">
                بررسی وضعیت سرور، پیشرفت تبدیل صدا و مشاهده خطاهای احتمالی
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

        {/* Server & Engine Health Card */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-3 h-3 rounded-full ${
                  hasApiKey ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {hasApiKey ? 'موتور صوتی رسمی هوش مصنوعی (Gemini TTS) فعال است' : 'شبیه‌ساز صوتی مرورگر فعال است'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{statusMessage}</div>
              </div>
            </div>

            <button
              onClick={onRefreshHealth}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بررسی مجدد اتصال</span>
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              همه رویدادها ({logs.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'error'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              خطاها ({logs.filter((l) => l.type === 'error').length})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              موفقیت‌آمیز ({logs.filter((l) => l.type === 'success').length})
            </button>
          </div>

          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>پاک‌سازی لاگ‌ها</span>
            </button>
          )}
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-sans text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              رویدادی در این دسته‌بندی ثبت نشده است.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const iconMap = {
                info: <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />,
                success: <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />,
                warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />,
                error: <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />,
              };

              const borderMap = {
                info: 'border-cyan-500/20 bg-cyan-950/20',
                success: 'border-emerald-500/20 bg-emerald-950/20',
                warning: 'border-amber-500/20 bg-amber-950/20',
                error: 'border-rose-500/30 bg-rose-950/30',
              };

              return (
                <div
                  key={log.id}
                  className={`border rounded-lg p-2.5 transition-all ${borderMap[log.type]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {iconMap[log.type]}
                      <div>
                        <span className="text-slate-200 font-medium leading-relaxed block">
                          {log.message}
                        </span>
                        {log.details && (
                          <pre className="mt-1 p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-32">
                            {log.details}
                          </pre>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      {log.timestamp}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>نکته: در صورت بروز خطای سهمیه یا شبکه، دکمه «تلاش مجدد» روی هر دیالوگ فعال است.</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
