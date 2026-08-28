import React, { useState, useEffect } from "react";
import {
  Key,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  X,
  ClipboardPaste,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string, autoGenerate?: boolean) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [pastedSuccess, setPastedSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  // Auto-validate key when input changes or modal opens
  useEffect(() => {
    setInputKey(apiKey);
    setPasteNotice(null);
  }, [apiKey, isOpen]);

  // Debounced auto-test whenever inputKey changes
  useEffect(() => {
    const keyToTest = inputKey.trim().replace(/^["']|["']$/g, "");
    if (!keyToTest || keyToTest.length < 10) {
      setTestResult(null);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsTesting(true);
      try {
        const response = await fetch("/api/validate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: keyToTest }),
        });
        if (isCancelled) return;

        if (response.ok) {
          const data = await response.json();
          if (data.valid) {
            setTestResult({
              success: true,
              message: data.message || "সবুজ বাতি: Key ১০০% সঠিক ও প্রস্তুত! ভয়েস নির্দ্বিধায় তৈরি হবে।",
            });
            onSaveApiKey(keyToTest, false);
          } else {
            setTestResult({
              success: false,
              message: data.message || "লাল বাতি: এই Key টি সঠিক নয় বা মেয়াদোত্তীর্ণ। নতুন কী নিন।",
            });
          }
        } else {
          setTestResult({
            success: false,
            message: "লাল বাতি: Key যাচাই করতে সমস্যা হয়েছে।",
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          setTestResult({
            success: false,
            message: "লাল বাতি: সার্ভার সংযোগে সমস্যা।",
          });
        }
      } finally {
        if (!isCancelled) {
          setIsTesting(false);
        }
      }
    }, 600);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [inputKey]);

  if (!isOpen) return null;

  const trimmedKey = inputKey.trim().replace(/^["']|["']$/g, "");
  const isAQToken = trimmedKey.startsWith("AQ.") || trimmedKey.startsWith("AQ_") || (trimmedKey.startsWith("AQ") && trimmedKey.length > 30);
  const isValidGeminiFormat = trimmedKey.startsWith("AIzaSy");
  const isValidAnyFormat = isValidGeminiFormat || isAQToken || trimmedKey.length >= 20;

  const handleSaveAndGenerate = () => {
    const cleanKey = inputKey.trim().replace(/^["']|["']$/g, "");
    onSaveApiKey(cleanKey, true);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  const handleSaveOnly = () => {
    const cleanKey = inputKey.trim().replace(/^["']|["']$/g, "");
    onSaveApiKey(cleanKey, false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 500);
  };

  const handlePasteFromClipboard = async () => {
    setPasteNotice(null);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          const cleanText = text.trim().replace(/^["']|["']$/g, "");
          setInputKey(cleanText);
          setPastedSuccess(true);
          setPasteNotice("ক্লিপবোর্ড থেকে Key সফলভাবে পেস্ট হয়েছে! ✅");
          setTimeout(() => {
            setPastedSuccess(false);
            setPasteNotice(null);
          }, 3000);
          return;
        }
      }
    } catch (err: any) {
      console.warn("Clipboard read error / iframe restricted:", err);
    }

    // Fallback: Focus and select the input box so the user can easily paste (Ctrl+V or Long press)
    const input = document.getElementById("api-key-input-field") as HTMLInputElement;
    if (input) {
      input.focus();
      try {
        document.execCommand("paste");
      } catch (_) {}
    }
    setPasteNotice("বক্সে ক্লিক করে দীর্ঘক্ষণ চেপে ধরে 'Paste' অথবা কিবোর্ডে Ctrl+V চাপুন।");
    setTimeout(() => setPasteNotice(null), 5000);
  };

  const handleCopyCurrentKey = () => {
    if (!inputKey) return;
    navigator.clipboard.writeText(inputKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleClear = () => {
    setInputKey("");
    setTestResult(null);
  };

  const copyVercelEnvName = () => {
    navigator.clipboard.writeText("GEMINI_API_KEY");
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleTestKey = async () => {
    const keyToTest = inputKey.trim().replace(/^["']|["']$/g, "");
    if (!keyToTest) {
      setTestResult({ success: false, message: "অনুগ্রহ করে আগে একটি Key পেস্ট করুন।" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Test via server-side /api/validate-key which directly invokes Gemini 3.1 Flash TTS
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setTestResult({
            success: true,
            message: data.message || "সবুজ বাতি: Key ১০০% সঠিক ও প্রস্তুত! ভয়েস নির্দ্বিধায় তৈরি হবে।",
          });
          // Auto-save verified key to storage seamlessly
          onSaveApiKey(keyToTest, false);
        } else {
          setTestResult({
            success: false,
            message: data.message || "লাল বাতি: এই Key টি দিয়ে ভয়েস তৈরি সম্ভব নয় বা বাতিল হয়েছে। নতুন কী নিন।",
          });
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setTestResult({
          success: false,
          message: errData?.message || "লাল বাতি: Key যাচাই করতে সমস্যা হয়েছে। দয়া করে সঠিক কী দিন।",
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: "লাল বাতি: সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      id="api-key-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="api-key-modal-card"
        className="bg-zinc-900 border border-yellow-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-100 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-600 flex items-center justify-center text-zinc-950 font-bold shadow-lg shadow-yellow-500/20">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Gemini API Key সেটআপ</span>
              <span className="text-[10px] bg-yellow-400/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full border border-yellow-400/30">
                1-Click Paste
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              আপনার Google Gemini API Key পেস্ট করে সরাসরি ভয়েস তৈরি সচল করুন
            </p>
          </div>
        </div>

        {/* Quick Paste & Input Area */}
        <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>আপনার API Key:</span>
            </label>
            <div className="flex items-center gap-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-yellow-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>ফ্রি কী (Key) নিন</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Interactive Input Box with Paste Button */}
          <div className="relative flex items-center">
            <input
              id="api-key-input-field"
              type={showKey ? "text" : "password"}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy... (একাধিক Key দিতে কমা ব্যবহার করুন: Key1, Key2)"
              autoFocus
              className="w-full pl-3.5 pr-28 py-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-xs text-white font-mono placeholder:text-zinc-600 select-all"
            />

            {/* Action Buttons inside Input */}
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title={showKey ? "লুকান" : "দেখুন"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              {inputKey ? (
                <>
                  <button
                    type="button"
                    onClick={handleCopyCurrentKey}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                    title="কপি করুন"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/40 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-sm"
                  title="ক্লিপবোর্ড থেকে সরাসরি পেস্ট করুন"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>{pastedSuccess ? "পেস্ট হয়েছে!" : "পেস্ট করুন"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Paste Button underneath for mobile convenience */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 font-semibold cursor-pointer underline"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>📋 ক্লিপবোর্ড থেকে পেস্ট করুন (Paste Key)</span>
            </button>

            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !inputKey}
              className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-yellow-400" />}
              <span>কী টেস্ট করুন</span>
            </button>
          </div>

          {/* Paste notice feedback */}
          {pasteNotice && (
            <div className="p-2 rounded-lg bg-yellow-400/20 border border-yellow-400/40 text-yellow-200 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>{pasteNotice}</span>
            </div>
          )}

          {/* Key Status Visual Traffic Lights (সবুজ বাতি ও লাল বাতি) */}
          <div className="bg-zinc-950/90 p-3 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <span>🚦 লাইভ কী ও ভয়েস স্ট্যাটাস লাইট (Status Indicator):</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {isTesting ? "যাচাই হচ্ছে..." : testResult ? (testResult.success ? "READY ✅" : "ERROR ❌") : "WAITING"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Green Light (সবুজ বাতি) */}
              <div
                className={`p-2.5 rounded-lg border transition-all duration-300 flex items-center gap-2.5 ${
                  testResult?.success
                    ? "bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.45)] ring-2 ring-emerald-400"
                    : "bg-zinc-900/40 border-zinc-800/80 text-zinc-500 opacity-30"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      testResult?.success
                        ? "bg-emerald-400 shadow-[0_0_15px_#34d399] animate-pulse"
                        : "bg-zinc-700"
                    }`}
                  />
                </div>
                <div className="text-[11px] leading-tight">
                  <div className="font-bold flex items-center gap-1">
                    <span>🟢 সবুজ বাতি</span>
                  </div>
                  <div className="text-[10px] text-zinc-300">কী সঠিক ও ভয়েস তৈরি হবে</div>
                </div>
              </div>

              {/* Red Light (লাল বাতি) */}
              <div
                className={`p-2.5 rounded-lg border transition-all duration-300 flex items-center gap-2.5 ${
                  testResult && !testResult.success
                    ? "bg-red-950/90 border-red-500 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.45)] ring-2 ring-red-400"
                    : "bg-zinc-900/40 border-zinc-800/80 text-zinc-500 opacity-30"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      testResult && !testResult.success
                        ? "bg-red-500 shadow-[0_0_15px_#f87171] animate-ping"
                        : "bg-zinc-700"
                    }`}
                  />
                </div>
                <div className="text-[11px] leading-tight">
                  <div className="font-bold flex items-center gap-1">
                    <span>🔴 লাল বাতি</span>
                  </div>
                  <div className="text-[10px] text-zinc-300">কী-তে সমস্যা / ভয়েস হবে না</div>
                </div>
              </div>
            </div>

            {/* Live Message explanation below lights */}
            {testResult && (
              <div
                className={`mt-1.5 p-2 rounded-lg text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/60 border-red-500/40 text-red-300"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="leading-snug">{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-[11px] text-yellow-200 flex items-center gap-1.5">
            <span className="font-bold text-yellow-400">💡 প্রো টিপ (Quota Bypass):</span>
            <span>একাধিক Key কমা (,) দিয়ে দিলে একটার কোটা শেষ হলে স্বয়ংক্রিয়ভাবে পরবর্তী কী দিয়ে ভয়েস তৈরি হবে!</span>
          </div>
        </div>

        {/* Realistic Voice Notice & Key Guidance */}
        <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-yellow-500/30 text-[11px] text-zinc-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400 font-bold">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>১০০% কার্যকর Gemini API Key নেওয়ার সহজ নিয়ম</span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-yellow-400 text-zinc-950 font-bold rounded-lg text-[10px] hover:bg-yellow-300 transition flex items-center gap-1 shrink-0"
            >
              <span>নতুন কী নিন</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-zinc-300 leading-relaxed text-[11px]">
            গুগল ক্লাউড কনসোলের কী-তে প্রায়শই রেস্ট্রিকশন থাকে। তাই <strong>Google AI Studio</strong> থেকে সরাসরি কী তৈরি করুন—এটি ১ ক্লিকেই চালু হয়ে যায়।
          </p>

          <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 text-[11px] space-y-1.5">
            <div className="text-yellow-300 font-semibold flex items-center gap-1">
              <span>📌 মাত্র ৩ ধাপে নতুন Key নিন:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-zinc-300">
              <li>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-yellow-400 underline font-semibold"
                >
                  aistudio.google.com/app/apikey
                </a>{" "}
                লিঙ্কে যান।
              </li>
              <li>সেখানে <strong>"Create API key"</strong> বাটনে ক্লিক করুন।</li>
              <li>পাওয়া <code className="text-yellow-300 font-mono bg-zinc-800 px-1 py-0.5 rounded">AIzaSy...</code> কোডটি কপি করে উপরে পেস্ট করে <strong>"সংরক্ষণ করুন"</strong> দিন।</li>
            </ol>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 space-y-2 text-zinc-400">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold flex items-center gap-1.5 text-xs">
                <span>🚀 Vercel / GitHub ডিপ্লয়মেন্ট গাইড:</span>
              </span>
              <button
                onClick={copyVercelEnvName}
                className="inline-flex items-center gap-1 text-[11px] text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-md hover:bg-yellow-400/20 border border-yellow-400/30 cursor-pointer font-bold"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEnv ? "কপি হয়েছে!" : "GEMINI_API_KEY"}</span>
              </button>
            </div>
            <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-800 text-[11px] space-y-1 text-zinc-300">
              <p className="text-amber-300 font-semibold">⚡ Vercel এ ডিপ্লয় করার সময়:</p>
              <p>
                ১. Vercel Dashboard {">"} আপনার Project {">"} <strong>Settings</strong> {">"} <strong>Environment Variables</strong> এ যান।
              </p>
              <p>
                ২. Key নাম দিন <code className="text-yellow-300 font-mono bg-zinc-800 px-1 py-0.5 rounded">GEMINI_API_KEY</code> এবং Value-তে আপনার AI Studio কী পেস্ট করে <strong>Save</strong> ও <strong>Redeploy</strong> করুন।
              </p>
              <p className="text-emerald-400 pt-1 font-medium">
                ✨ এছাড়াও যে কেউ লিঙ্কে ঢুকলে এই পপআপে ফ্রি কী পেস্ট করলেই ব্রাউজারে সঙ্গে সঙ্গে ভয়েস চালু হয়ে যাবে!
              </p>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {savedSuccess && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">API Key সংরক্ষিত হয়েছে! সাথে সাথে ভয়েস তৈরি শুরু হচ্ছে...</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            বাতিল
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveOnly}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer border border-zinc-700 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>শুধু সংরক্ষণ</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAndGenerate}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-zinc-950 transition cursor-pointer shadow-lg shadow-yellow-500/25 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>🚀 সেভ করুন ও সাথে সাথে ভয়েস শুনুন</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
