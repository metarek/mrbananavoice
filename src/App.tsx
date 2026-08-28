import { useState, useEffect } from "react";
import {
  Sparkles,
  Volume2,
  Trophy,
  Award,
  Heart,
  Share2,
  Radio,
  Edit3,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Zap,
  Key,
} from "lucide-react";
import confetti from "canvas-confetti";
import { SocialChannelsBanner } from "./components/SocialChannelsBanner";
import { ScriptStudio } from "./components/ScriptStudio";
import { AudioPlayer } from "./components/AudioPlayer";
import { CelebrationCard } from "./components/CelebrationCard";
import { AudioHistoryList } from "./components/AudioHistoryList";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { SAMPLE_MULTI_EMOJI_BENGALI, EMOJI_ACTING_RULES } from "./data/presets";
import { AudioItem, SupportedLanguage } from "./types";
import { base64ToUint8Array, pcmToWavBlob, calculatePcmDuration, applyChildVoicePitch } from "./utils/audioUtils";
import { generateSpeechDirectly } from "./utils/geminiClient";
import { DEFAULT_KEY_POOL } from "./constants/apiKeys";

export default function App() {
  const [channelName, setChannelName] = useState("mdtarakboss2");
  const [currentSubs, setCurrentSubs] = useState(100);
  const [daysTaken, setDaysTaken] = useState(7);

  const [activeTab, setActiveTab] = useState<"studio" | "badge" | "emojis" | "story">("studio");
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Mr.banana.pro");
  const [language, setLanguage] = useState<SupportedLanguage>("bengali");

  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<AudioItem | null>(null);
  const [history, setHistory] = useState<AudioItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotaCountdown, setQuotaCountdown] = useState<number | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      // Check URL parameters first (e.g. ?key=AIzaSy... or ?apiKey=AIzaSy...)
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlKey = urlParams.get("key") || urlParams.get("apiKey");
        if (urlKey && urlKey.trim().length > 10) {
          const cleanUrlKey = urlKey.trim().replace(/^["']|["']$/g, "");
          try {
            localStorage.setItem("banana_gemini_api_key", cleanUrlKey);
          } catch (_) {}
          return cleanUrlKey;
        }
      }

      const saved = localStorage.getItem("banana_gemini_api_key");
      if (saved && saved.trim().length > 10) {
        if (saved.includes("leaked_dummy_marker")) {
          localStorage.removeItem("banana_gemini_api_key");
          return DEFAULT_KEY_POOL[0] || "";
        }
        return saved.trim().replace(/^["']|["']$/g, "");
      }
    } catch (_) {}
    return DEFAULT_KEY_POOL[0] || "";
  });

  // Automatic countdown timer for Quota rate limit
  useEffect(() => {
    if (quotaCountdown === null || quotaCountdown <= 0) return;
    const interval = setInterval(() => {
      setQuotaCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setErrorMessage(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quotaCountdown]);

  const handleSaveApiKey = (newKey: string, autoGenerate: boolean = false) => {
    setCustomApiKey(newKey);
    if (newKey) {
      localStorage.setItem("banana_gemini_api_key", newKey);
      setQuotaCountdown(null);
      setErrorMessage(null);
      setSuccessToast("🔑 API Key সংরক্ষিত হয়েছে! ভয়েস তৈরি হচ্ছে...");
      if (autoGenerate || text.trim()) {
        setTimeout(() => {
          handleGenerateAudio(newKey);
        }, 100);
      }
    } else {
      localStorage.removeItem("banana_gemini_api_key");
    }
  };

  // Trigger welcome celebration fireworks
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#facc15", "#f59e0b", "#10b981", "#ef4444"],
      });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleGenerateAudio = async (overrideKey?: string | unknown) => {
    if (!text.trim()) return;

    const keyString =
      typeof overrideKey === "string" ? overrideKey : typeof customApiKey === "string" ? customApiKey : "";
    const activeKey = keyString.trim().replace(/^["']|["']$/g, "");

    setIsLoadingAudio(true);
    setErrorMessage(null);
    setSuccessToast(null);

    let audioBase64: string | null = null;
    let chunksCount = 1;

    try {
      // Step 1: Request Speech from Server TTS Engine
      let serverResponseWorked = false;
      let serverErrorMessage = "";

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            text: text.trim(),
            voiceName: selectedVoice,
            language: language,
            apiKey: activeKey || undefined,
          }),
        });

        clearTimeout(timeoutId);
        const contentType = response.headers.get("content-type") || "";

        if (response.ok && contentType.includes("application/json")) {
          const data = await response.json();
          if (data?.success && data?.audio) {
            audioBase64 = data.audio;
            chunksCount = data.totalChunks || 1;
            serverResponseWorked = true;
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          serverErrorMessage = errData?.error || "ভয়েস তৈরি করার সময় সমস্যা হয়েছে।";
          if (errData?.retryAfter) {
            setQuotaCountdown(errData.retryAfter);
          }
        }
      } catch (serverErr: any) {
        console.warn("Server TTS connection / timeout error:", serverErr);
        serverErrorMessage = serverErr?.message || "সার্ভার সংযোগে সমস্যা হয়েছে।";
      }

      if (!audioBase64) {
        throw new Error(
          serverErrorMessage || "ভয়েস তৈরি করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
        );
      }

      // Convert PCM 24kHz to Studio High-Fidelity WAV Blob
      const pcmBytes = base64ToUint8Array(audioBase64);
      const isAnyaChild =
        selectedVoice === "Aoede" ||
        selectedVoice?.toLowerCase()?.includes("aoede") ||
        selectedVoice?.toLowerCase()?.includes("anya") ||
        selectedVoice?.toLowerCase()?.includes("আন্যা") ||
        selectedVoice?.toLowerCase()?.includes("baby") ||
        selectedVoice?.toLowerCase()?.includes("বাচ্চা");

      // Transform vocal tract & acoustic formant frequency only if child voice selected
      let processedPcm = pcmBytes;
      if (isAnyaChild) {
        processedPcm = applyChildVoicePitch(pcmBytes, 1.25);
      }

      const wavBlob = pcmToWavBlob(processedPcm, 24000, 1);
      const blobUrl = URL.createObjectURL(wavBlob);
      const duration = calculatePcmDuration(processedPcm.length, 24000, 16, 1);

      const newAudioItem: AudioItem = {
        id: `take_${Date.now()}`,
        text: text.trim(),
        audioBase64: audioBase64 || "",
        audioBlobUrl: blobUrl,
        voice: selectedVoice,
        language: language,
        createdAt: Date.now(),
        duration: duration,
        totalChunks: chunksCount,
      };

      const langTitle = language === "bengali" ? "বাংলা" : language === "hindi" ? "हिन्दी" : "English";
      setSuccessToast(`🍌 MʀツBΛNΛNΛ স্টুডিও ভয়েস সফলভাবে তৈরি হয়েছে (${langTitle})!`);

      setCurrentAudio(newAudioItem);
      setHistory((prev) => [newAudioItem, ...prev]);

      // Clear any pending error banners and countdowns
      setErrorMessage(null);
      setQuotaCountdown(null);
      setTimeout(() => setSuccessToast(null), 6000);

      // Celebration confetti
      confetti({
        particleCount: 60,
        spread: 90,
        origin: { y: 0.7 },
        colors: ["#facc15", "#f59e0b", "#10b981"],
      });
    } catch (err: any) {
      console.error("TTS generation error:", err);
      const msg = err.message || "";
      if (
        err?.isQuotaExceeded ||
        msg.includes("429") ||
        msg.includes("Quota") ||
        msg.includes("quota") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("rate-limits")
      ) {
        const retrySec = err?.retryAfter || 25;
        setQuotaCountdown(retrySec);
        setErrorMessage(
          `গুগল এপিআই-এর প্রতি মিনিটের ফ্রি কোটা সাময়িকভাবে শেষ হয়েছে (429 Quota Exceeded)। অনুগ্রহ করে ${retrySec} সেকেন্ড অপেক্ষা করুন বা নতুন Key ব্যবহার করুন।`
        );
      } else if (
        msg.includes("কোনো সক্রিয় Gemini API Key পাওয়া যায়নি") ||
        msg.includes("API key not valid") ||
        msg.includes("API_KEY_INVALID") ||
        msg.includes("400")
      ) {
        setErrorMessage(
          "কোনো সক্রিয় API Key পাওয়া যায়নি। নিচের '🔑 ফ্রি Key দিন' বাটনে ক্লিক করে aistudio.google.com/app/apikey থেকে ফ্রি কী পেস্ট করুন।"
        );
        setIsApiKeyModalOpen(true);
      } else {
        setErrorMessage(msg || "ভয়েস তৈরি করার সময় সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।");
      }
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-yellow-400 selection:text-zinc-950 pb-16">
      {/* Top Navigation Bar with Banana Brand */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-yellow-500/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 text-zinc-950 font-black text-xl">
              🍌
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span className="text-yellow-400">MʀツBΛNΛNΛ</span>
                <span>VOICE</span>
                <span className="text-[10px] uppercase font-extrabold bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 px-2 py-0.5 rounded-full">
                  20,000+ Words AI TTS
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400">
                Emoji-Driven Voice Acting • বাংলা • English • हिन्दी • Gemini 3.1 Flash TTS
              </p>
            </div>
          </div>

          {/* Quick channel editor */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <span className="text-zinc-400">Channel:</span>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="bg-transparent text-yellow-300 font-semibold focus:outline-none w-28 text-xs"
                placeholder="Channel Name"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsApiKeyModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                customApiKey
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                  : "bg-yellow-400/10 border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/20"
              }`}
              title="Vercel & Gemini API Key Settings"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vercel / API Key</span>
            </button>

            <button
              onClick={() => {
                confetti({
                  particleCount: 40,
                  spread: 60,
                  origin: { y: 0.2 },
                  colors: ["#facc15", "#f59e0b", "#10b981"],
                });
              }}
              className="p-2 rounded-xl bg-zinc-900 border border-yellow-500/30 hover:border-yellow-400 text-yellow-400 hover:text-yellow-300 transition cursor-pointer"
              title="Banana Celebration Sparkles"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Official Social Channels Banner */}
        <SocialChannelsBanner />

        {/* Notifications / Toast */}
        {errorMessage && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/80 via-zinc-900 to-amber-950/40 border border-red-500/50 text-red-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-2xl animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">
                    {quotaCountdown !== null && quotaCountdown > 0
                      ? "⚠️ কোটা ও রেট লিমিট নোটিশ (429 Quota Exceeded)"
                      : "⚠️ ভয়েস তৈরি সংক্রান্ত নোটিশ"}
                  </span>
                  {quotaCountdown !== null && quotaCountdown > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-yellow-400 text-zinc-950 font-black text-[11px] flex items-center gap-1 shadow-sm animate-pulse">
                      ⏳ প্রস্তুত হতে বাকি: {quotaCountdown}s
                    </span>
                  )}
                </div>
                <p className="text-zinc-300 leading-relaxed text-xs">{errorMessage}</p>
                <div className="text-[11px] text-yellow-300 font-medium flex items-center gap-1.5 pt-0.5">
                  <span>💡 সমাধান: aistudio.google.com থেকে ১ ক্লিকে একদম ফ্রি নতুন API Key নিয়ে বসিয়ে দিন।</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 flex-wrap">
              {quotaCountdown !== null && quotaCountdown <= 0 && (
                <button
                  type="button"
                  onClick={handleGenerateAudio}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-bold text-xs cursor-pointer shadow-lg transition flex items-center gap-1.5"
                >
                  <span>🔄 পুনরায় চেষ্টা করুন</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(true)}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 rounded-xl font-black text-xs cursor-pointer shadow-lg shadow-yellow-400/20 transition flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>🔑 নতুন ফ্রি Key দিন</span>
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                title="বন্ধ করুন"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {successToast && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Studio Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2">
          <button
            id="tab-voice-studio"
            onClick={() => setActiveTab("studio")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "studio"
                ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Voice & TTS Studio (ভয়েস রেকর্ডার)</span>
          </button>

          <button
            id="tab-emoji-guide"
            onClick={() => setActiveTab("emojis")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "emojis"
                ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Emoji Acting Guide (ইমোজি গাইড)</span>
          </button>

          <button
            id="tab-milestone-badge"
            onClick={() => setActiveTab("badge")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "badge"
                ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>100 Subs Plaque / Card (সেলিব্রেশন কার্ড)</span>
          </button>

          <button
            id="tab-creator-story"
            onClick={() => setActiveTab("story")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "story"
                ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Creator Journey (৭ দিনের গল্প)</span>
          </button>
        </div>

        {/* Tab 1: Voice & TTS Studio */}
        {activeTab === "studio" && (
          <div className="space-y-6">
            {/* Audio Player (when audio exists) */}
            <AudioPlayer
              audioBlobUrl={currentAudio?.audioBlobUrl || null}
              text={currentAudio?.text || text}
              voice={currentAudio?.voice || selectedVoice}
              language={currentAudio?.language || language}
              duration={currentAudio?.duration || 0}
              totalChunks={currentAudio?.totalChunks || 1}
            />

            {/* Script & Voice Configurator */}
            <ScriptStudio
              text={text}
              setText={setText}
              selectedVoice={selectedVoice}
              setSelectedVoice={setSelectedVoice}
              language={language}
              setLanguage={setLanguage}
              onGenerateAudio={handleGenerateAudio}
              isLoadingAudio={isLoadingAudio}
              quotaCountdown={quotaCountdown}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />

            {/* Previous Takes / History */}
            <AudioHistoryList
              history={history}
              currentAudioId={currentAudio?.id || null}
              onSelectAudio={(item) => setCurrentAudio(item)}
              onDeleteAudio={(id) => {
                setHistory((prev) => prev.filter((h) => h.id !== id));
                if (currentAudio?.id === id) {
                  setCurrentAudio(null);
                }
              }}
              onClearAll={() => {
                setHistory([]);
                setCurrentAudio(null);
              }}
            />
          </div>
        )}

        {/* Tab 2: Emoji Acting Guide */}
        {activeTab === "emojis" && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center text-2xl">
                🎭
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white">
                  MʀツBΛNΛNΛ Emoji Expression Acting Rules
                </h3>
                <p className="text-xs md:text-sm text-zinc-400">
                  যে লাইনের শুরুতে যে ইমোজি দিবেন, AI ভয়েস একদম হুবহু সেই ইমোশনে অ্যাক্ট করে পড়বে!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EMOJI_ACTING_RULES.map((rule) => (
                <div
                  key={rule.emoji}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 hover:border-yellow-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{rule.emoji}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{rule.name}</h4>
                        <span className="text-xs text-yellow-400">{rule.bengaliName}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setText((prev) => `${rule.exampleLine}\n${prev}`);
                        setActiveTab("studio");
                      }}
                      className="text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-yellow-400 hover:text-zinc-950 text-zinc-300 font-semibold transition cursor-pointer"
                    >
                      Try Line
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400">{rule.styleDescription}</p>
                  <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300 font-sans">
                    <span className="text-zinc-500 mr-1.5">Example:</span>
                    <span>{rule.exampleLine}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Milestone Card & Banner */}
        {activeTab === "badge" && (
          <div className="space-y-6">
            <CelebrationCard
              channelName={channelName}
              subCount={currentSubs}
              daysTaken={daysTaken}
            />

            {/* Channel Milestone Stats Editor */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 md:p-6 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-yellow-400" />
                <span>Customize Milestone Card Details (কার্ড কাস্টমাইজ করুন)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    YouTube Channel Name:
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Subscribers Achieved:
                  </label>
                  <input
                    type="number"
                    value={currentSubs}
                    onChange={(e) => setCurrentSubs(parseInt(e.target.value) || 100)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Days Taken (Sprint):
                  </label>
                  <input
                    type="number"
                    value={daysTaken}
                    onChange={(e) => setDaysTaken(parseInt(e.target.value) || 7)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Creator Journey */}
        {activeTab === "story" && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center text-yellow-400 text-2xl">
                🍌
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white">
                  {channelName} - ১০০ সাবস্ক্রাইবারের অসাধারণ যাত্রা!
                </h3>
                <p className="text-xs md:text-sm text-zinc-400">
                  মাত্র ৭ দিনে ১০০ সাবস্ক্রাইবার অর্জন • পরবর্তী স্বপ্ন ১,০০০ পরিবারের
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm leading-relaxed space-y-3 font-sans">
              <p className="font-semibold text-yellow-300">
                &quot;🥳 হ্যালো guys! আজকে আমি অনেক খুশি! 😭 তোমরা আমাকে এতোটা সাপোর্ট করবা আমি জীবনেও ভাবতে পারিনাই! 😂 মাত্র ৭ দিনে আমাদের চ্যানেলে ১০০ টা subscriber complete হয়ে গেছে, হাহাহা! 😱 বিশ্বাসই হচ্ছে না রে ভাই! 😍 তো যারা এখনো subscribe করনাই, তাড়াতাড়ি subscribe করো! 🍌 তোমরা পাশে থাকলে মিস্টার ব্যানানা অতি দ্রুত ১ হাজারের একটা family বানিয়ে ফেলবে, ইনশাআল্লাহ!&quot;
              </p>
              <p className="text-xs text-zinc-400">
                ইউটিউবে প্রথম ১০০ সাবস্ক্রাইবার পাওয়া যেকোনো কনটেন্ট ক্রিয়েটরের জন্য সবচেয়ে কঠিন ও আনন্দদায়ক একটি মুহূর্ত। আপনার দর্শকদের এই ভালোবাসাই আপনাকে ১,০০০ সাবস্ক্রাইবারের মাইলস্টোন ও মনিটাইজেশনের পথে দ্রুত নিয়ে যাবে!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Sprint Time</span>
                <div className="text-xl font-bold text-emerald-400">7 Days Only ⚡</div>
                <p className="text-[11px] text-zinc-400">Super fast channel momentum</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Milestone Achieved</span>
                <div className="text-xl font-bold text-yellow-400">100 Subscribers 🎉</div>
                <p className="text-[11px] text-zinc-400">First major community milestone</p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Next Big Goal</span>
                <div className="text-xl font-bold text-emerald-400">1,000 Family 🚀</div>
                <p className="text-[11px] text-zinc-400">Target for YouTube Partner program</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Vercel & Gemini API Key Setup Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  );
}
