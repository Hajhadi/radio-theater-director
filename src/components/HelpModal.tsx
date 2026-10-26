import React from 'react';
import {
  HelpCircle,
  X,
  CheckCircle,
  AlertTriangle,
  Volume2,
  Download,
  Layers,
  Sparkles
} from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                راهنمای جامع کار با استودیوی کارگردانی نمایش رادیویی
              </h2>
              <p className="text-xs text-slate-400">
                پاسخ به سوالات متداول و حل مشکلات تولید و دانلود صدا
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-slate-300">
          {/* Question 1 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>چطور متوجه شوم کار در چه مرحله‌ای است و مشکلی پیش آمده یا نه؟</span>
            </h3>
            <p className="text-slate-300">
              ۱. <strong>نوار پیشرفت زنده:</strong> در بالای صحنه، درصد دقیق پیشرفت ضبط به همراه شمارنده دیالوگ‌ها (مثلاً «۴ از ۶ دیالوگ») نمایش داده می‌شود.
              <br />
              ۲. <strong>وضعیت هر خط:</strong> هر دیالوگ دارای نشانگر مجزا است: «در انتظار ضبط»، «در حال تولید صدا»، «صدا آماده است» یا «خطا در ضبط».
              <br />
              ۳. <strong>کنسول مانیتورینگ زنده (لاگ استودیو):</strong> با کلیک روی دکمه «لاگ استودیو» در بالای صفحه، گزارش زنده تمام درخواست‌ها به همراه زمان و جزئیات دقیق خطاها را مشاهده کنید.
            </p>
          </div>

          {/* Question 2 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>چرا صدا پخش نمی‌شد یا در حالت «در حال اجرا» متوقف می‌شد؟</span>
            </h3>
            <p className="text-slate-300">
              در نسخه‌های قبلی، در صورت بروز تاخیر شبکه یا خطای سهمیه، رابط کاربری متوجه خطا نمی‌شد و بی‌صدا معلق می‌ماند. همچنین خط‌مشی امنیتی مرورگر (Autoplay Policy) تا قبل از تعامل کاربر مانع پخش صدا می‌شود.
              <br />
              <strong>در این نسخه جدید:</strong>
              <br />
              • هر دیالوگ دارای دکمه «پخش دیالوگ» مستقل با نشانگر بصری امواج صوتی است.
              <br />
              • در صورت بروز خطا، پیام واضح فارسی و دکمه «تلاش مجدد» ظاهر می‌شود.
              <br />
              • می‌توانید در بخش «صداپیشگان» هر صدا (Kore, Puck, Charon, Fenrir, Zephyr) را پیشاپیش تست کنید.
            </p>
          </div>

          {/* Question 3 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400 shrink-0" />
              <span>چرا فایل دانلودی قبلی انگلیسی و کوتاه بود؟ چطور صدای کامل را دریافت کنم؟</span>
            </h3>
            <p className="text-slate-300">
              در نسخه قبلی، دکمه دانلود به یک فایل ماک (نمونه ثابت انگلیسی ۴۰ ثانیه‌ای) متصل بود.
              <br />
              <strong>اکنون:</strong> دکمه «دانلود فایل صوتی کامل اپیزود (WAV)» تمامی قطعات تولید شده فارسی همان فصل و قسمت را به همراه وقفه‌های طبیعی دراماتیک بین دیالوگ‌ها ادغام کرده و یک فایل WAV باکیفیت و با مدت زمان واقعی نمایش به زبان فارسی دانلود می‌کند!
            </p>
          </div>

          {/* Question 4 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span>چطور بین فصل‌ها و قسمت‌های مختلف جابجا شوم؟</span>
            </h3>
            <p className="text-slate-300">
              ستون سمت راست شامل ساختار کامل درختی فصل‌ها و قسمت‌هاست:
              <br />
              • کلیک روی هر قسمت بلافاصله شما را به صحنه و دیالوگ‌های آن قسمت می‌برد.
              <br />
              • می‌توانید فصل جدید اضافه کنید یا هر قسمت را ویرایش نمایید.
              <br />
              • با دکمه «تبدیل داستان به سناریو» می‌توانید هر متن یا رمان دلخواه خود را در چند ثانیه به یک قسمت رادیویی کامل تبدیل کنید.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg transition-colors text-xs"
          >
            متوجه شدم، بازگشت به استودیو
          </button>
        </div>
      </div>
    </div>
  );
};
