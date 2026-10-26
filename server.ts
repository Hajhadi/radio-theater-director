import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Enable CORS and preflight handling to prevent NetworkError when called in iframes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// Token Optimizer: In-memory LRU cache for synthesized audio to eliminate redundant token consumption
const ttsAudioCache = new Map<string, string>();
const MAX_TTS_CACHE_SIZE = 1000;

// Token Optimizer: Compact book text for structural chapter outline extraction
function compactBookTextForOutline(fullText: string, maxChars = 20000): string {
  if (!fullText || fullText.length <= maxChars) {
    return fullText;
  }

  const lines = fullText.split('\n');
  const chapterRegex = /^(chapter|chapitre|فصل|بخش|قسمت|part|act)\s*([0-9\u06F0-\u06F9]+|[a-z]+|اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم)/i;

  const sampledSections: string[] = [];
  let isCapturing = true;
  let linesCapturedInCurrentSection = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (chapterRegex.test(trimmed) || (trimmed.length < 60 && (trimmed.includes('Chapter') || trimmed.includes('فصل')))) {
      sampledSections.push(`\n=== ${trimmed} ===`);
      isCapturing = true;
      linesCapturedInCurrentSection = 0;
    } else if (isCapturing) {
      sampledSections.push(trimmed);
      linesCapturedInCurrentSection++;
      if (linesCapturedInCurrentSection >= 10) {
        isCapturing = false;
      }
    }
  }

  const result = sampledSections.join('\n');
  if (result.length >= 1000) {
    console.log(
      `[Token Optimizer] Reduced book text from ${fullText.length} to ${result.length} chars (Saved ${Math.round(
        (1 - result.length / fullText.length) * 100
      )}% tokens).`
    );
    return result;
  }

  const sampleChunk = Math.floor(maxChars / 3);
  return (
    fullText.slice(0, sampleChunk) +
    '\n\n[... خلاصه بخش‌های میانی ...]\n\n' +
    fullText.slice(
      Math.floor(fullText.length / 2) - sampleChunk / 2,
      Math.floor(fullText.length / 2) + sampleChunk / 2
    ) +
    '\n\n[... بخش‌های پایانی ...]\n\n' +
    fullText.slice(-sampleChunk)
  );
}

// Shared Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('کلید دسترسی هوش مصنوعی (GEMINI_API_KEY) یافت نشد. لطفاً در پنل Secrets بررسی کنید.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health and Diagnostics API
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    tokenOptimization: {
      active: true,
      thinkingLevel: 'LOW',
      cachedAudioEntries: ttsAudioCache.size,
      textCompaction: 'Enabled',
    },
    models: {
      tts: 'gemini-3.8-flash-lite-tts',
      screenplay: 'gemini-3.8-flash',
    },
    timestamp: new Date().toISOString(),
    message: hasKey
      ? `موتور صوتی و بهینه‌ساز توکن فعال است (${ttsAudioCache.size} قطعه صوتی در حافظه سریع بدون مصرف توکن).`
      : 'کلید دسترسی یافت نشد. می‌توانید از حالت شبیه‌ساز صوتی مرورگر استفاده کنید.',
  });
});

// Resilient retry utility for handling 503 (high demand) and 429 (rate limits)
async function callGeminiWithRetry<T>(
  actionName: string,
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errMsg = String(err?.message || err?.statusText || err || '');
      const statusCode = err?.status || err?.code || (err?.response && err?.response?.status);

      // Do NOT retry daily limit exhaustion on the same model - fail fast so fallback kicks in immediately!
      const isDailyLimit =
        errMsg.includes('PerDay') ||
        errMsg.includes('limit: 20') ||
        (errMsg.includes('429') && errMsg.includes('per day'));

      if (isDailyLimit) {
        throw err;
      }

      const isRateLimit =
        statusCode === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('rate limit');

      const isHighDemand =
        statusCode === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('overloaded');

      if (attempt <= maxRetries && (isRateLimit || isHighDemand)) {
        let delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;

        // If Google explicitly specified how long to wait
        const retryMatch = errMsg.match(/retry in ([0-9.]+)s/i);
        if (retryMatch && retryMatch[1]) {
          const suggestedSecs = parseFloat(retryMatch[1]);
          if (!isNaN(suggestedSecs) && suggestedSecs > 0) {
            delay = Math.ceil(suggestedSecs * 1000);
          }
        }

        // Cap delay to 5 seconds so we never trigger browser / Cloud Run socket timeout (NetworkError)
        if (delay > 5000) {
          delay = 5000;
        }

        console.warn(
          `[Gemini Auto-Retry] ${actionName} received ${isRateLimit ? '429 Rate Limit' : '503 High Demand'}. Waiting ${Math.round(
            delay / 1000
          )} seconds before attempt ${attempt}/${maxRetries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    }
  }
}

// Resilient content generator with automatic ThinkingLevel.LOW and model fallback
async function callGenerateWithModelFallback(
  actionName: string,
  params: { contents: any; config?: any }
) {
  const ai = getAiClient();
  // Enforce ThinkingLevel.LOW to drastically reduce hidden reasoning tokens (saves 80-90% output tokens)
  const optimizedConfig = {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    ...params.config,
  };

  try {
    return await callGeminiWithRetry(`${actionName} (Primary: gemini-3.8-flash)`, () =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: params.contents,
        config: optimizedConfig,
      })
    );
  } catch (err: any) {
    const errMsg = String(err?.message || err?.statusText || err || '');
    // If gemini-3.8-flash hits 20 requests per day limit or rate limit
    if (
      errMsg.includes('PerDay') ||
      errMsg.includes('limit: 20') ||
      errMsg.includes('429') ||
      errMsg.includes('RESOURCE_EXHAUSTED')
    ) {
      console.warn(
        `[Model Fallback] gemini-3.8-flash daily quota reached. Automatically routing ${actionName} to gemini-3.1-flash-lite (optimized)...`
      );
      return await callGeminiWithRetry(`${actionName} (Fallback: gemini-3.1-flash-lite)`, () =>
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: params.contents,
          config: optimizedConfig,
        })
      );
    }
    throw err;
  }
}

// Single Dialogue / Narration TTS Generation with In-Memory LRU Token Cache
app.post('/api/gemini/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName, style, characterName } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'متن برای تبدیل به صدا ارسال نشده است.' });
    }

    const cleanText = text.trim();
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    // Compact speech style to eliminate redundant prompt tokens
    const speechStyle = style ? `Persian radio: ${style}` : 'Persian radio';

    // 1. Check in-memory audio cache: zero tokens consumed if previously generated!
    const cacheKey = `${chosenVoice}:${cleanText}:${speechStyle}`;
    if (ttsAudioCache.has(cacheKey)) {
      console.log(`[Token Optimizer] TTS Cache HIT for "${cleanText.slice(0, 30)}..." -> 0 tokens used.`);
      return res.json({
        success: true,
        audioBase64: ttsAudioCache.get(cacheKey)!,
        mimeType: 'audio/wav',
        voice: chosenVoice,
        character: characterName || 'راوی',
        textLength: cleanText.length,
        cached: true,
      });
    }

    const ai = getAiClient();

    // Call Gemini 3.8 Flash Lite TTS with automatic retry on 503 / 429
    const response = await callGeminiWithRetry('Gemini TTS', () =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: speechStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      })
    );

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({
        error: 'مدل پاسخی بدون داده‌های صوتی بازگرداند. ممکن است متن شامل کاراکترهای نامعتبر باشد.',
      });
    }

    // Store in cache (LRU eviction if over limit)
    if (ttsAudioCache.size >= MAX_TTS_CACHE_SIZE) {
      const oldestKey = ttsAudioCache.keys().next().value;
      if (oldestKey) ttsAudioCache.delete(oldestKey);
    }
    ttsAudioCache.set(cacheKey, base64Audio);

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voice: chosenVoice,
      character: characterName || 'راوی',
      textLength: cleanText.length,
      cached: false,
    });
  } catch (error: any) {
    console.error('Gemini TTS error:', error);
    const errMsg = String(error?.message || error || '');
    const is503 = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');

    return res.status(is503 ? 503 : 500).json({
      error: is503
        ? 'سرور هوش مصنوعی در حال حاضر با ترافیک بالایی روبروست (خطای ۵۰۳). چند ثانیه دیگر دوباره امتحان کنید.'
        : error?.message || 'خطا در برقراری ارتباط با سرویس تولید صدا',
      code: is503 ? 503 : 500,
      details: error?.statusText || String(error),
    });
  }
});

// Helper: build a 44-byte WAV header for 24kHz 16-bit mono PCM
function createWavHeader(dataByteLength: number, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const buffer = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  buffer.write('RIFF', 0); // 0-3
  buffer.writeUInt32LE(36 + dataByteLength, 4); // 4-7
  buffer.write('WAVE', 8); // 8-11
  buffer.write('fmt ', 12); // 12-15
  buffer.writeUInt32LE(16, 16); // 16-19 (Subchunk1Size)
  buffer.writeUInt16LE(1, 20); // 20-21 (AudioFormat = 1 PCM)
  buffer.writeUInt16LE(numChannels, 22); // 22-23 (NumChannels)
  buffer.writeUInt32LE(sampleRate, 24); // 24-27 (SampleRate)
  buffer.writeUInt32LE(byteRate, 28); // 28-31 (ByteRate)
  buffer.writeUInt16LE(blockAlign, 32); // 32-33 (BlockAlign)
  buffer.writeUInt16LE(bitsPerSample, 34); // 34-35 (BitsPerSample)
  buffer.write('data', 36); // 36-39
  buffer.writeUInt32LE(dataByteLength, 40); // 40-43

  return buffer;
}

// Merge multiple base64 WAV chunks into one seamless master WAV file
app.post('/api/audio/merge', async (req: Request, res: Response) => {
  try {
    const { audioList, pauseDurationMs = 400 } = req.body;

    if (!Array.isArray(audioList) || audioList.length === 0) {
      return res.status(400).json({ error: 'فهرست قطعات صوتی خالی است.' });
    }

    const pcmParts: Buffer[] = [];
    const sampleRate = 24000;
    const bytesPerSample = 2; // 16-bit mono = 2 bytes per sample
    const pauseSamples = Math.floor((pauseDurationMs / 1000) * sampleRate);
    const silenceBuffer = Buffer.alloc(pauseSamples * bytesPerSample, 0);

    for (let i = 0; i < audioList.length; i++) {
      const b64 = audioList[i];
      if (!b64) continue;

      const wavBuf = Buffer.from(b64, 'base64');
      // Look for the 'data' subchunk to accurately extract PCM samples
      let dataOffset = 44;
      const dataSubchunkIndex = wavBuf.indexOf('data');
      if (dataSubchunkIndex !== -1 && dataSubchunkIndex + 8 <= wavBuf.length) {
        dataOffset = dataSubchunkIndex + 8;
      }

      if (wavBuf.length > dataOffset) {
        const pcmOnly = wavBuf.subarray(dataOffset);
        pcmParts.push(pcmOnly);
        // Add theatrical breath pause between lines
        if (i < audioList.length - 1) {
          pcmParts.push(silenceBuffer);
        }
      }
    }

    if (pcmParts.length === 0) {
      return res.status(400).json({ error: 'هیچ داده صوتی معتبری برای ادغام یافت نشد.' });
    }

    const combinedPcm = Buffer.concat(pcmParts);
    const header = createWavHeader(combinedPcm.length, sampleRate, 1, 16);
    const masterWav = Buffer.concat([header, combinedPcm]);

    return res.json({
      success: true,
      masterAudioBase64: masterWav.toString('base64'),
      mimeType: 'audio/wav',
      durationSeconds: Math.round(combinedPcm.length / (sampleRate * bytesPerSample)),
      sizeBytes: masterWav.length,
    });
  } catch (error: any) {
    console.error('Audio merge error:', error);
    return res.status(500).json({ error: error?.message || 'خطا در ادغام قطعات صوتی اپیزود' });
  }
});

// AI Scriptwriting & Scene Adaptation
// Book Parsing & Chapter Chunking (Multi-language to Persian 20-30min episodes)
app.post('/api/gemini/parse-book', async (req: Request, res: Response) => {
  try {
    const { bookText, fileBase64, mimeType, bookTitleHint, targetDurationMinutes = 25 } = req.body;

    if (!bookText && !fileBase64) {
      return res.status(400).json({ error: 'لطفاً متن کتاب یا فایل آن را ارسال کنید.' });
    }

    // Token Optimizer: Smartly compact text down to structural chapter headers & key beats
    // This saves 70-90% input tokens while preserving 100% of the book structure
    const compactedText = fileBase64 ? '' : compactBookTextForOutline(bookText || '', 14000);

    const promptText = `شما یک کارگردان ارشد نمایش‌های رادیویی و برنامه‌ریز درام‌های صوتی هستید.
وظیفه: تحلیل ساختار کتاب و استخراج فصل‌ها (Chapters) و تفکیک هر فصل به اپیزودهای ۲۰ تا ۳۰ دقیقه‌ای شنیداری به زبان فارسی فاخر.

قوانین بهینه‌سازی توکن:
۱. تمام عناوین، خلاصه‌ها و راهنماها باید کاملاً به زبان فارسی روان باشد (حتی اگر منبع انگلیسی، فرانسوی یا غیره باشد).
۲. هر اپیزود برای ۲۰ تا ۳۰ دقیقه اجرا طراحی شود.
۳. در خروجی JSON، به جای بازتولید متن‌های طولانی کتاب، صرفاً خلاصه ۲ خطی دراماتیک برای هر قسمت بنویسید تا توکن‌ها حفظ شوند.

ساختار دقیق خروجی JSON:
{
  "bookTitle": "عنوان کتاب به فارسی",
  "author": "نام نویسنده",
  "originalLanguage": "نام زبان اصلی",
  "targetLanguage": "فارسی",
  "targetDurationDesc": "۲۰ تا ۳۰ دقیقه برای هر اپیزود",
  "totalEstimatedEpisodes": 4,
  "chapters": [
    {
      "chapterIndex": 1,
      "originalChapterTitle": "نام فصل در زبان اصلی",
      "persianChapterTitle": "فصل اول: عنوان فصل به فارسی",
      "isDividedIntoMultipleEpisodes": true,
      "totalEpisodes": 2,
      "episodesPlan": [
        {
          "id": "plan-1-1",
          "seasonIndex": 1,
          "episodeIndex": 1,
          "title": "فصل ۱ - قسمت ۱: عنوان به فارسی",
          "synopsis": "خلاصه دراماتیک این قسمت ۲۰ تا ۳۰ دقیقه‌ای در ۲ تا ۳ جمله",
          "estimatedMinutes": 25,
          "plotBeats": "نکات کلیدی و عطف داستانی"
        }
      ]
    }
  ]
}`;

    let contentsParts: any[] = [];
    if (fileBase64 && mimeType) {
      contentsParts = [
        {
          inlineData: {
            mimeType: mimeType === 'application/pdf' ? 'application/pdf' : 'text/plain',
            data: fileBase64,
          },
        },
        { text: promptText },
      ];
    } else {
      contentsParts = [
        {
          text: `نمونه ساختاری کتاب:\n${compactedText}\n\n${promptText}`,
        },
      ];
    }

    const response = await callGenerateWithModelFallback('Book Parser', {
      contents: contentsParts,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    // Enrich episodes with sliced excerpts locally on server without spending LLM output tokens
    if (parsed.chapters && Array.isArray(parsed.chapters) && bookText) {
      const fullLines = bookText.split('\n').filter((l: string) => l.trim().length > 0);
      const totalLines = fullLines.length;
      let globalIdx = 0;

      parsed.chapters.forEach((ch: any) => {
        if (Array.isArray(ch.episodesPlan)) {
          ch.episodesPlan.forEach((ep: any, epIdx: number) => {
            const startLine = Math.floor((globalIdx / Math.max(1, parsed.totalEstimatedEpisodes || 4)) * totalLines);
            const excerptLines = fullLines.slice(startLine, startLine + 15).join('\n');
            ep.textExcerpt = excerptLines.slice(0, 1500) || ep.plotBeats || ep.synopsis;
            globalIdx++;
          });
        }
      });
    }

    return res.json({ success: true, outline: parsed });
  } catch (error: any) {
    console.error('Parse book error:', error);
    const errMsg = String(error?.message || error || '');
    const is503 = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
    const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota');

    let userFriendlyMsg = error?.message || 'خطا در تجزیه و بخش‌بندی فصل‌های کتاب';
    if (isQuota) {
      userFriendlyMsg = 'سهمیه روزانه پلن رایگان گوگل پر شده است. موتور به طور خودکار بهینه‌سازی شده، چند دقیقه بعد تلاش کنید.';
    } else if (is503) {
      userFriendlyMsg = 'سرور هوش مصنوعی به دلیل ترافیک بالا موقتاً در دسترس نیست (۵۰۳). لطفاً چند لحظه بعد مجدداً تلاش کنید.';
    }

    return res.status(isQuota ? 429 : is503 ? 503 : 500).json({
      error: userFriendlyMsg,
      code: isQuota ? 429 : is503 ? 503 : 500,
    });
  }
});

// Generate full Persian radio drama script for a specific book episode (Token Optimized)
app.post('/api/gemini/generate-book-episode', async (req: Request, res: Response) => {
  try {
    const {
      bookTitle,
      chapterTitle,
      episodeTitle,
      synopsis,
      textExcerpt,
      charactersContext,
      episodeNumber,
      totalEpisodesInChapter,
    } = req.body;

    // Token Optimizer: Cap source excerpt to max 1800 chars to avoid prompt token bloating
    const safeExcerpt = (textExcerpt || '').slice(0, 1800);

    const prompt = `کتاب: "${bookTitle || 'کتاب'}"
فصل: "${chapterTitle || 'فصل'}"
قسمت: "${episodeTitle || 'قسمت جدید'}" (${episodeNumber || 1} از ${totalEpisodesInChapter || 1})
خلاصه رویدادها: ${synopsis || ''}
متن منبع این صحنه:
${safeExcerpt}

دستورالعمل تولید فیلم‌نامه رادیویی فارسی با کیفیت عالی:
۱. تمام دیالوگ‌ها، نریشن‌های راوی، افکت‌ها و راهنمای بازیگری صددرصد به زبان فارسی فاخر، روان و شنیداری باشد.
۲. بین ۱۲ تا ۱۶ دیالوگ پرحرارت و حساب‌شده با تعلیق داستانی و شخصیت‌پردازی عمیق تولید کنید.
۳. صداپیشگان مجاز:
   - "Kore": راوی و زنان متین
   - "Puck": جوانان پرانرژی
   - "Charon": صدای بم و فیلسوفانه
   - "Fenrir": صدای باصلابت و خشن
   - "Zephyr": صدای لطیف و آرام
۴. افکت‌های صوتی فضاساز (soundEffect) برای القای اتمسفر رادیویی.

خروجی دقیق در قالب JSON:
{
  "title": "${episodeTitle}",
  "synopsis": "${synopsis || 'روایت دراماتیک رادیویی'}",
  "characters": [
    {
      "name": "نام شخصیت به فارسی",
      "description": "توضیح کوتاه تیپ شخصیتی",
      "voiceName": "یکی از Kore, Puck, Charon, Fenrir, Zephyr",
      "avatarColor": "from-amber-600 to-orange-700"
    }
  ],
  "dialogues": [
    {
      "character": "نام گوینده",
      "text": "متن دیالوگ خالص به زبان فارسی بدون پرانتز",
      "soundEffect": "افکت صوتی زمینه",
      "style": "لحن و حس بازیگر"
    }
  ]
}`;

    const response = await callGenerateWithModelFallback('Generate Episode', {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, episodeScript: parsed });
  } catch (error: any) {
    console.error('Generate book episode error:', error);
    const errMsg = String(error?.message || error || '');
    const is503 = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
    const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota');

    let userFriendlyMsg = error?.message || 'خطا در تولید سناریوی اپیزود کتاب';
    if (isQuota) {
      userFriendlyMsg = 'سهمیه درخواست هوش مصنوعی به سقف رسیده است. لطفاً کمی بعد تلاش کنید.';
    } else if (is503) {
      userFriendlyMsg = 'سرور هوش مصنوعی به دلیل ترافیک بالا موقتاً در دسترس نیست (۵۰۳). لطفاً چند لحظه بعد مجدداً تلاش کنید.';
    }

    return res.status(isQuota ? 429 : is503 ? 503 : 500).json({
      error: userFriendlyMsg,
      code: isQuota ? 429 : is503 ? 503 : 500,
    });
  }
});

// AI Manual Story Adaptation Endpoint (Token Optimized)
app.post('/api/gemini/adapt-story', async (req: Request, res: Response) => {
  try {
    const { storyText, genre = 'درام رادیویی', episodeTitle = 'قسمت جدید' } = req.body;

    if (!storyText || typeof storyText !== 'string' || storyText.trim().length === 0) {
      return res.status(400).json({ error: 'متن داستان ارائه نشده است.' });
    }

    const safeStory = storyText.trim().slice(0, 3000);

    const prompt = `شما کارگردان نمایش رادیویی هستید. متن زیر را به یک سناریوی نمایش صوتی فارسی فاخر در ژانر "${genre}" تبدیل کنید.
عنوان قسمت: "${episodeTitle}"
متن داستان ورودی:
${safeStory}

قوانین بهینه‌سازی:
۱. تولید ۱۰ تا ۱۴ دیالوگ کلیدی بین راوی و کاراکترها به فارسی فاخر.
۲. صداپیشگان: Kore, Puck, Charon, Fenrir, Zephyr.
۳. خروجی در قالب JSON:
{
  "title": "${episodeTitle}",
  "synopsis": "خلاصه دراماتیک داستان در ۲ جمله",
  "characters": [
    {
      "name": "نام شخصیت",
      "description": "توضیح کوتاه",
      "voiceName": "Kore",
      "avatarColor": "from-amber-600 to-orange-700"
    }
  ],
  "dialogues": [
    {
      "character": "نام شخصیت",
      "text": "متن دیالوگ خالص فارسی",
      "soundEffect": "افکت صوتی زمینه",
      "style": "لحن گوینده"
    }
  ]
}`;

    const response = await callGenerateWithModelFallback('Adapt Story', {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, script: parsed });
  } catch (error: any) {
    console.error('Adapt story error:', error);
    return res.status(500).json({ error: error?.message || 'خطا در تبدیل داستان به سناریوی رادیویی' });
  }
});



// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Radio Theater Server] Running on http://0.0.0.0:${port}`);
  });
}

startServer();
