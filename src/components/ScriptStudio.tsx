import { useState, useRef, ChangeEvent } from "react";
import {
  Mic,
  Sparkles,
  Wand2,
  Volume2,
  Check,
  RefreshCw,
  Copy,
  ClipboardPaste,
  Languages,
  FileText,
  Radio,
  Sliders,
  Layers,
  Zap,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { VOICES, SCRIPT_PRESETS, EMOJI_ACTING_RULES } from "../data/presets";
import { EmojiBar } from "./EmojiBar";
import { SupportedLanguage, ScriptPreset } from "../types";

interface ScriptStudioProps {
  text: string;
  setText: (val: string) => void;
  selectedVoice: string;
  setSelectedVoice: (val: string) => void;
  language: SupportedLanguage;
  setLanguage: (val: SupportedLanguage) => void;
  onGenerateAudio: () => void;
  isLoadingAudio: boolean;
  quotaCountdown?: number | null;
  onOpenApiKeyModal?: () => void;
}

export function ScriptStudio({
  text,
  setText,
  selectedVoice,
  setSelectedVoice,
  language,
  setLanguage,
  onGenerateAudio,
  isLoadingAudio,
  quotaCountdown = null,
  onOpenApiKeyModal,
}: ScriptStudioProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancingAction, setEnhancingAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"all" | "female" | "male">("all");
  const [pastedScriptSuccess, setPastedScriptSuccess] = useState(false);
  const [pasteScriptNotice, setPasteScriptNotice] = useState<string | null>(null);

  // Filter voices based on gender selection
  const filteredVoices = VOICES.filter((voice) => {
    if (genderFilter === "female") return voice.gender === "Female";
    if (genderFilter === "male") return voice.gender === "Male";
    return true;
  });

  const handleGenderSelect = (gender: "all" | "female" | "male") => {
    setGenderFilter(gender);
    if (gender === "female") {
      const current = VOICES.find((v) => v.id === selectedVoice);
      if (!current || current.gender !== "Female") {
        setSelectedVoice("Kore");
      }
    } else if (gender === "male") {
      const current = VOICES.find((v) => v.id === selectedVoice);
      if (!current || current.gender !== "Male") {
        setSelectedVoice("Mr.banana");
      }
    }
  };

  // Analyze text stats
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const lineCount = text.trim() ? text.split(/\r?\n/).filter((l) => l.trim().length > 0).length : 0;
  const maxCapacity = 20000; // Capacity limit support
  const capacityPercent = Math.min(100, Math.round((wordCount / maxCapacity) * 100));

  // Extract detected emojis from script
  const detectedEmojis = Array.from(new Set((text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [])));

  const handleInsertEmoji = (emoji: string) => {
    if (!textareaRef.current) {
      setText(`${emoji} ${text}`);
      return;
    }

    const textarea = textareaRef.current;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;

    // Find the start of the current line
    const textBefore = text.substring(0, startPos);
    const lastNewline = textBefore.lastIndexOf("\n");
    const insertPos = lastNewline === -1 ? 0 : lastNewline + 1;

    const newText =
      text.substring(0, insertPos) + `${emoji} ` + text.substring(insertPos);

    setText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(insertPos + emoji.length + 1, insertPos + emoji.length + 1);
    }, 50);
  };

  const handlePasteScript = async () => {
    setPasteScriptNotice(null);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && clipboardText.trim().length > 0) {
          setText(clipboardText.trim());
          setPastedScriptSuccess(true);
          setPasteScriptNotice("স্ক্রিপ্ট সফলভাবে পেস্ট হয়েছে! ✨");
          setTimeout(() => {
            setPastedScriptSuccess(false);
            setPasteScriptNotice(null);
          }, 3000);
          return;
        }
      }
    } catch (err) {
      console.warn("Clipboard read error in script editor:", err);
    }

    // Fallback: Focus the textarea and select
    if (textareaRef.current) {
      textareaRef.current.focus();
      try {
        document.execCommand("paste");
      } catch (_) {}
    }
    setPasteScriptNotice("টেক্সট বক্সে ক্লিক করে Paste বা Ctrl+V চাপুন।");
    setTimeout(() => setPasteScriptNotice(null), 4000);
  };

  const handleApplyPreset = (preset: ScriptPreset) => {
    setText(preset.text);
    setSelectedVoice(preset.recommendedVoice);
    setLanguage(preset.language);
    const voiceObj = VOICES.find((v) => v.id === preset.recommendedVoice);
    if (voiceObj) {
      if (voiceObj.gender === "Female" && genderFilter === "male") {
        setGenderFilter("female");
      } else if (voiceObj.gender === "Male" && genderFilter === "female") {
        setGenderFilter("male");
      }
    }
  };

  const handleAiAction = async (action: string) => {
    if (!text.trim()) return;
    setIsEnhancing(true);
    setEnhancingAction(action);

    try {
      const apiKey = localStorage.getItem("banana_gemini_api_key") || undefined;
      const response = await fetch("/api/enhance-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: text,
          action: action,
          language: language,
          apiKey: apiKey,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.success && data.result) {
          setText(data.result.trim());
          return;
        }
      }
    } catch (e) {
      console.warn("AI script server enhancement not available, applying smart local script director:", e);
    } finally {
      // Local fallback script enhancer
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const emojiPool = ["🍌", "🥳", "😂", "🔥", "😎", "😱", "😍", "🤫", "✨", "🚀"];
      
      if (action === "add_emojis" || action === "youtuber_energy") {
        const enriched = lines
          .map((line, idx) => {
            const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(line);
            if (hasEmoji) return line;
            const chosenEmoji = emojiPool[idx % emojiPool.length];
            return `${chosenEmoji} ${line}`;
          })
          .join("\n");
        setText(enriched);
      }

      setIsEnhancing(false);
      setEnhancingAction(null);
    }
  };

  // Preview lines breakdown for emoji acting
  const linesBreakdown = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 8); // show preview of top 8 lines

  return (
    <div className="space-y-6">
      {/* Language Selector Bar */}
      <div
        id="language-selector-tabs"
        className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-400 font-bold">
            🌐
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Select Speech Language (ভাষা নির্বাচন)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                100% Clear Voice
              </span>
            </h4>
            <p className="text-xs text-zinc-400">
              প্রত্যেকটি ভাষার জন্য নির্ভুল ও স্পষ্ট উচ্চারণ
            </p>
          </div>
        </div>

        {/* 3 Language Buttons */}
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
          <button
            id="lang-btn-bengali"
            onClick={() => setLanguage("bengali")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              language === "bengali"
                ? "bg-yellow-400 text-zinc-950 border-yellow-300 shadow-md shadow-yellow-500/30 ring-2 ring-yellow-400/50"
                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="text-sm">🇧🇩</span>
            <span>বাংলা (Bengali)</span>
          </button>

          <button
            id="lang-btn-english"
            onClick={() => setLanguage("english")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              language === "english"
                ? "bg-yellow-400 text-zinc-950 border-yellow-300 shadow-md shadow-yellow-500/30 ring-2 ring-yellow-400/50"
                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="text-sm">🇺🇸</span>
            <span>English</span>
          </button>

          <button
            id="lang-btn-hindi"
            onClick={() => setLanguage("hindi")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              language === "hindi"
                ? "bg-yellow-400 text-zinc-950 border-yellow-300 shadow-md shadow-yellow-500/30 ring-2 ring-yellow-400/50"
                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="text-sm">🇮🇳</span>
            <span>हिन्दी (Hindi)</span>
          </button>
        </div>
      </div>

      {/* Main Script Editor with 20,000+ words capacity */}
      <div
        id="script-editor-container"
        className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 md:p-6 shadow-xl space-y-4"
      >
        {/* Preset Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-yellow-400" />
              <span>Multi-Line Voice Script & Ultra Capacity</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-mono font-bold">
                20,000+ Words Ready 🚀
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              লাইনের শুরুতে ইমোজি দিলে (যেমন 😭 কান্নার মতো, 😂 হাসতে হাসতে, 😡 রেগে গিয়ে) স্বয়ংক্রিয়ভাবে অ্যাক্টিং হবে।
            </p>
          </div>

          {/* Quick Presets and Paste Button */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              id="paste-script-btn"
              onClick={handlePasteScript}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 hover:bg-yellow-400/30 cursor-pointer shadow-sm"
              title="ক্লিপবোর্ড থেকে আপনার পুরো স্ক্রিপ্ট এক ক্লিকে পেস্ট করুন"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>{pastedScriptSuccess ? "পেস্ট হয়েছে! ✨" : "📋 পেস্ট করুন"}</span>
            </button>

            {text.trim() && (
              <button
                id="clear-script-btn"
                onClick={() => setText("")}
                className="px-2 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-300 hover:bg-zinc-800 transition cursor-pointer"
                title="টেক্সট মুছে ফেলুন"
              >
                মুছুন
              </button>
            )}

            {SCRIPT_PRESETS.map((preset) => {
              const isSelected = text.trim() === preset.text.trim();
              return (
                <button
                  key={preset.id}
                  id={`preset-${preset.id}`}
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? "bg-yellow-400 text-zinc-950 shadow-sm"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {preset.bengaliTitle}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paste Script Notice */}
        {pasteScriptNotice && (
          <div className="p-2 rounded-lg bg-yellow-400/20 border border-yellow-400/30 text-yellow-200 text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span>{pasteScriptNotice}</span>
          </div>
        )}

        {/* Interactive Emoji Acting Bar */}
        <EmojiBar
          onInsertEmoji={handleInsertEmoji}
          language={language}
          detectedEmojis={detectedEmojis}
        />

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="speech-script-textarea"
            rows={7}
            value={text}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
            placeholder="আপনার ডায়লগ বা স্ক্রিপ্ট এখানে লিখুন..."
            className="w-full rounded-xl bg-zinc-950/90 border border-zinc-700/80 p-4 text-sm md:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition resize-y leading-relaxed font-sans"
          />

          {/* Real-time stats & 20,000+ words capacity progress indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-zinc-300">
                <strong className="text-yellow-400">{wordCount}</strong> / 20,000+ words
              </span>
              <span>•</span>
              <span>{charCount} chars</span>
              <span>•</span>
              <span>{lineCount} lines</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">
                {detectedEmojis.length} emotion tags active
              </span>
            </div>

            {/* Capacity Bar */}
            <div className="flex items-center gap-2 w-full sm:w-48">
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.max(2, capacityPercent)}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                {capacityPercent}% capacity
              </span>
            </div>
          </div>
        </div>

        {/* AI Emoji Auto-Director & Tools */}
        <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-yellow-400" />
            <span>MʀツBΛNΛNΛ AI Director:</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="ai-auto-emojis-btn"
              onClick={() => handleAiAction("add_emojis")}
              disabled={isEnhancing}
              className="px-3 py-1.5 rounded-lg bg-yellow-400/15 border border-yellow-400/40 hover:bg-yellow-400/25 text-yellow-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {enhancingAction === "add_emojis" ? (
                <RefreshCw className="w-3 h-3 animate-spin text-yellow-400" />
              ) : (
                <Sparkles className="w-3 h-3 text-yellow-400" />
              )}
              <span>Auto-Insert Acting Emojis (স্বয়ংক্রিয় ইমোজি যুক্ত করুন)</span>
            </button>

            <button
              id="ai-youtuber-energy-btn"
              onClick={() => handleAiAction("youtuber_energy")}
              disabled={isEnhancing}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {enhancingAction === "youtuber_energy" ? (
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              ) : (
                <Flame className="w-3 h-3 text-amber-400" />
              )}
              <span>Max YouTuber Energy</span>
            </button>

            <button
              id="ai-translate-bn-btn"
              onClick={() => {
                setLanguage("bengali");
                handleAiAction("translate_bengali");
              }}
              disabled={isEnhancing}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Languages className="w-3 h-3 text-emerald-400" />
              <span>Translate to বাংলা</span>
            </button>

            <button
              id="ai-translate-hi-btn"
              onClick={() => {
                setLanguage("hindi");
                handleAiAction("translate_hindi");
              }}
              disabled={isEnhancing}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Languages className="w-3 h-3 text-cyan-400" />
              <span>Translate to हिन्दी</span>
            </button>

            <button
              id="ai-translate-en-btn"
              onClick={() => {
                setLanguage("english");
                handleAiAction("translate_english");
              }}
              disabled={isEnhancing}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Languages className="w-3 h-3 text-purple-400" />
              <span>Translate to English</span>
            </button>
          </div>
        </div>
      </div>

      {/* Voice Selection Card */}
      <div
        id="voice-selection-container"
        className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 md:p-6 shadow-xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-yellow-400" />
              <span>Select Voice Actor (ভয়েস ও জেন্ডার নির্বাচন)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              মেয়েদের জন্য মেয়েদের মিষ্টি কণ্ঠ ও ছেলেদের জন্য ছেলেদের এনার্জেটিক কণ্ঠ
            </p>
          </div>

          {/* Gender Filter Buttons: ছেলে / মেয়ে Toggle */}
          <div
            id="voice-gender-filter-bar"
            className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800 self-start sm:self-auto"
          >
            <button
              id="filter-all-voices-btn"
              type="button"
              onClick={() => handleGenderSelect("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                genderFilter === "all"
                  ? "bg-zinc-800 text-yellow-400 shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <span>👥 সব কণ্ঠ</span>
            </button>

            <button
              id="filter-female-voices-btn"
              type="button"
              onClick={() => handleGenderSelect("female")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                genderFilter === "female"
                  ? "bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 shadow-sm border border-pink-500/40"
                  : "text-zinc-400 hover:text-pink-300 hover:bg-zinc-900"
              }`}
            >
              <span>👩 মেয়ের কণ্ঠ (Female)</span>
            </button>

            <button
              id="filter-male-voices-btn"
              type="button"
              onClick={() => handleGenderSelect("male")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                genderFilter === "male"
                  ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/40"
                  : "text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900"
              }`}
            >
              <span>👨 ছেলের কণ্ঠ (Male)</span>
            </button>
          </div>
        </div>

        {/* Voice Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            const isFemale = voice.gender === "Female";
            const isViral = voice.isViral;
            return (
              <button
                key={voice.id}
                id={`voice-card-${voice.id}`}
                onClick={() => setSelectedVoice(voice.id)}
                className={`relative p-4 rounded-xl text-left transition flex flex-col justify-between border cursor-pointer ${
                  isSelected
                    ? isViral
                      ? "bg-gradient-to-b from-yellow-950/40 to-zinc-900 border-yellow-400 shadow-xl shadow-yellow-500/20 ring-2 ring-yellow-400"
                      : isFemale
                      ? "bg-zinc-850 border-pink-400 shadow-lg shadow-pink-950/40 ring-2 ring-pink-400"
                      : "bg-zinc-850 border-yellow-400 shadow-lg shadow-yellow-950/40 ring-2 ring-yellow-400"
                    : isViral
                    ? "bg-gradient-to-b from-yellow-950/20 to-zinc-950/80 border-yellow-500/40 hover:border-yellow-400 hover:bg-zinc-900"
                    : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${voice.color} flex items-center justify-center text-white text-base font-bold shadow-md`}
                      >
                        {voice.id === "Aoede" || voice.id?.toLowerCase()?.includes("baby")
                          ? "👧"
                          : voice.id?.includes("gaming")
                          ? "🎮"
                          : voice.id === "Mr.banana" || voice.id === "Puck"
                          ? "🍌"
                          : isFemale
                          ? "👩"
                          : "👨"}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                          <span>
                            {voice.id === "Aoede"
                              ? "👧 Anya Forger"
                              : voice.name.split(" (")[0]}
                          </span>
                          {voice.id === "Aoede" ? (
                            <span className="text-[9px] bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-black px-1.5 py-0.2 rounded-full shadow-sm animate-pulse">
                              SPY x FAMILY
                            </span>
                          ) : voice.id?.includes("gaming") ? (
                            <span className="text-[9px] bg-gradient-to-r from-red-500 to-amber-500 text-white font-black px-1.5 py-0.2 rounded-full shadow-sm animate-pulse">
                              FF GAMING
                            </span>
                          ) : isViral ? (
                            <span className="text-[10px] bg-red-500 text-white font-black px-1.5 py-0.2 rounded-full animate-pulse">
                              VIRAL
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {voice.tag ? (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isViral
                                  ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-bold"
                                  : isFemale
                                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              {voice.tag}
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isFemale
                                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              {isFemale ? "👩 মেয়ে / Female" : "👨 ছেলে / Male"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isViral
                            ? "bg-yellow-400 text-zinc-950 font-black shadow-md"
                            : isFemale
                            ? "bg-pink-400 text-zinc-950"
                            : "bg-yellow-400 text-zinc-950"
                        }`}
                      >
                        <Check className="w-3 h-3 font-bold" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-200 font-medium leading-snug mb-1">
                    {voice.bengaliVibe}
                  </p>
                </div>

                <p className="text-[10px] text-zinc-400 leading-tight mt-2">{voice.description}</p>
              </button>
            );
          })}
        </div>

        {/* Generate Voice Action Button */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                নির্বাচিত:{" "}
                <strong className="text-white">
                  {selectedVoice} (
                  {VOICES.find((v) => v.id === selectedVoice)?.gender === "Female" ? "মেয়ে / Female" : "ছেলে / Male"}
                  )
                </strong>{" "}
                • ভাষা: <strong className="text-yellow-400 uppercase">{language}</strong>
              </span>
            </div>
            {quotaCountdown !== null && quotaCountdown > 0 && onOpenApiKeyModal && (
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="text-[11px] text-amber-400 hover:text-yellow-300 underline font-medium cursor-pointer"
              >
                (অথবা নিজের ফ্রি Key দিয়ে অপেক্ষা ছাড়াই ভয়েস তৈরি করুন)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              id="generate-tts-speech-btn"
              onClick={onGenerateAudio}
              disabled={isLoadingAudio || !text.trim()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm md:text-base shadow-xl flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:brightness-110 active:scale-98 text-zinc-950 shadow-yellow-500/25"
            >
              {isLoadingAudio ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-zinc-950" />
                  <span>🎙️ স্টুডিও ভয়েস তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🍌</span>
                  <span>Generate Voice (ভয়েস তৈরি করুন)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
