import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import { DEFAULT_KEY_POOL } from "./src/constants/apiKeys";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Available Keys Pool from process.env and user requests
let globalKeyRotationIndex = 0;

function getAllAvailableKeys(userKey?: string): string[] {
  const keys: string[] = [];

  // 1. Primary: Server environment key injected by platform
  const envSources = [
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.AI_STUDIO_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  for (const envVal of envSources) {
    if (envVal && typeof envVal === "string") {
      const splitKeys = envVal.split(/[,\n]/).map(k => k.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      keys.push(...splitKeys);
    }
  }

  // 2. User custom key from settings if provided
  if (userKey && typeof userKey === "string") {
    const userKeys = userKey.split(/[,\n]/).map(k => k.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    keys.push(...userKeys);
  }

  // 3. Built-in Key Pool
  if (DEFAULT_KEY_POOL && Array.isArray(DEFAULT_KEY_POOL)) {
    keys.push(...DEFAULT_KEY_POOL);
  }

  return Array.from(new Set(keys)).filter(k => typeof k === "string" && k.trim().length > 10);
}

function getAIClient(apiKey?: string): GoogleGenAI {
  let keyToUse = apiKey;
  if (!keyToUse) {
    const keys = getAllAvailableKeys();
    keyToUse = keys[0] || process.env.GEMINI_API_KEY || "";
  }
  const cleanKey = (keyToUse || "").trim().replace(/^["']|["']$/g, "");

  return new GoogleGenAI({
    apiKey: cleanKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "MʀツBΛNΛNΛ VOICE", timestamp: new Date().toISOString() });
});

/**
 * Emoji & Voice Model to Acting Instruction Map (Ultra-Optimized & Token-Efficient)
 */
function getEmojiActingDirective(
  textLine: string,
  language: "bengali" | "english" | "hindi",
  voiceName: string = "Mr.banana"
): string {
  const langPrompt =
    language === "bengali"
      ? "Bengali (বাংলায় সহজ, সাবলীল ও স্পষ্ট উচ্চারণ)"
      : language === "hindi"
      ? "Hindi (हिन्दी)"
      : "English";

  // Strict anti-drag rule to prevent stretched vowels, trailing throat squeeze, or vocal fry
  const CADENCE = "Speak smoothly with brisk, crisp cadence. Finish words and sentences cleanly without dragging, without stretching ending vowels, without vocal fry, and without trailing squeezed or drawled tone (কোনো শব্দ বা সুর টেনে লম্বা করবে না, একদম স্পষ্ট ও স্বাভাবিক গতিতে শেষ করবে):";

  const isBananaProModel =
    voiceName === "Mr.banana.pro" ||
    voiceName?.toLowerCase()?.includes("banana.pro");

  if (isBananaProModel) {
    if (/পার্থক্য|কি\?|কেন\?|কেমন|জানো|স্নাইপার|রাশার|sniper|rush|\?/i.test(textLine)) {
      return `Speak in an engaging, deep, charismatic YouTube explainer and curious narrator voice in ${langPrompt}. ${CADENCE}`;
    }
    if (/তো গাইজ|গাইজ|সাবস্ক্রাইব|লাইক|কমেন্ট|জানাও|subscribe|comment|share/i.test(textLine)) {
      return `Speak in a warm, confident, engaging YouTuber call-to-action tone in ${langPrompt}. ${CADENCE}`;
    }
    if (/booyah|headshot|শট|পাওয়ার|বিজয়|heroic|master|গ্র্যান্ড|🔥|⚡|🚀|💥/i.test(textLine)) {
      return `Speak in a deep, confident, epic gaming narrator voice in ${langPrompt}. ${CADENCE}`;
    }
    if (/😂|🤣|হাহাহা|haha|lol/i.test(textLine)) {
      return `Speak in a deep, rich baritone chuckle and humorous storyteller tone in ${langPrompt}. ${CADENCE}`;
    }
    return `Speak in a smooth, deep, charismatic, confident Free Fire YouTube narrator voice with clear pronunciation in ${langPrompt}. ${CADENCE}`;
  }

  const isGamingModel =
    voiceName === "Mr.banana.gaming" ||
    voiceName === "Mr.banana.gaming.pro" ||
    voiceName === "Puck" ||
    voiceName?.toLowerCase()?.includes("gaming") ||
    voiceName?.toLowerCase()?.includes("freefire");

  if (isGamingModel) {
    if (/booyah|headshot|one tap|clutch|victory|জিত|উইনার|খতম|সব শেষ|kill|কিল|অসাধারণ|let's go|lets go|op|ওপি|🔥|⚡|🚀|💥|🥳|🎉/i.test(textLine)) {
      return `Speak in energetic Bangladeshi gaming YouTuber victory hype in ${langPrompt}. ${CADENCE}`;
    }
    if (/hp|low|১ জন|একাকী|1vs4|1v4|1 vs 4|zone|সাসপেন্স|আস্তে|ধীরে|লুকিয়ে|ক্যাম্প|😱|😨|😰|🫨|🤫|🤐|\.{3,}/i.test(textLine)) {
      return `Speak in intense gaming suspense tone in ${langPrompt}. ${CADENCE}`;
    }
    if (/knock|নক|rush|রাশ|মেরে দিল|রিভাইভ|পালা|গুলিবৃষ্টি|এনিমি|enemy|gloo wall|গ্লু ওয়াল|দাঁড়া|দাঁড়াও|😡|🤬|👿|💢|😤/i.test(textLine)) {
      return `Speak in aggressive fast-paced gaming battle cry in ${langPrompt}. ${CADENCE}`;
    }
    if (/noob|নুব|বট|bot|লল|lol|হাহা|মজা|troll|ফানি|😂|🤣|😹|😆|😃|😄|😁/.test(textLine)) {
      return `Speak with playful YouTuber laughter and teasing comedy in ${langPrompt}. ${CADENCE}`;
    }
    if (/হারলাম|মায়েন্স|minus|rank down|দুঃখ|কষ্ট|স্যারি|😭|😢|😿|🥺|💔/.test(textLine)) {
      return `Speak with sad emotional gamer tone in ${langPrompt}. ${CADENCE}`;
    }
    return `Speak as a lively, energetic Bangladeshi gaming YouTuber in ${langPrompt}. ${CADENCE}`;
  }

  const isBabyGirlModel =
    voiceName === "Aoede" ||
    voiceName?.toLowerCase()?.includes("aoede") ||
    voiceName?.toLowerCase()?.includes("anya") ||
    voiceName?.toLowerCase()?.includes("আন্যা") ||
    voiceName?.toLowerCase()?.includes("baby") ||
    voiceName?.toLowerCase()?.includes("বাচ্চা");

  if (isBabyGirlModel) {
    const anyaCadence = "Character Persona: Anya Forger (Spy x Family). Voice: Ultra-high-pitched, squeaky, adorable 4-5 year old toddler girl (Atsumi Tanezaki style). Key traits: Extreme cute baby nakra (আদুরে নেকামি), childish lisp and slight stutter (তোতলামি ও বায়না), referring to herself in third person ('আন্যা / Anya'), playful spoiled whining, exaggerated funny gasps, mischievous cute smug giggles, and signature high-energy 'Waku Waku!'. She must sound 100% like a tiny mischievous 4-5 year old anime kid baby, NOT an adult woman:";
    if (/ওয়াকু|waku|রোমাঞ্চ|স্পাই|মিশন|পিনাট|বাদাম|🤩|✨|🎉|🥳|🔥/i.test(textLine)) {
      return `Speak in Anya Forger's iconic ecstatic squeaky 4-year-old toddler scream "Waku Waku!" full of anime child excitement and wide-eyed baby energy in ${langPrompt}. ${anyaCadence}`;
    }
    if (/হেহ|heh|smug|হিহি|হাহা|মজা|funny|কার্টুন|খিলখিল|😂|🤣|😹|😆|😃|😄|😁|😏|🤭/i.test(textLine)) {
      return `Speak in Anya Forger's legendary mischievous smug "Heh 😏" face voice with cute spoiled baby snickers and funny childish teasing in ${langPrompt}. ${anyaCadence}`;
    }
    if (/😱|😨|😰|ওরে বাবা|হায় হায়|ধরা পড়ে গেছি|সিক্রেট|secret|mind|পড়ে ফেললাম/i.test(textLine)) {
      return `Speak in Anya Forger's panicked, dramatic squeaky anime toddler shock, funny high-pitched baby shriek and dramatic toddler gasp in ${langPrompt}. ${anyaCadence}`;
    }
    if (/😭|😢|😿|🥺|💔|কান্না|কেঁদে|ভ্যা|পচা|মারবো|মারব|দেবো না|হুঁ/i.test(textLine)) {
      return `Speak in Anya Forger's iconic cute spoiled baby crying tantrum with heavy baby whines, sniffling, cute childish sobbing and dramatic pouting (একদম ৪-৫ বছরের আদুরে বাচ্চার মিষ্টি কান্না ও নেকামিভরা বায়না) in ${langPrompt}. ${anyaCadence}`;
    }
    if (/😍|🥰|😘|💖|❤️|💕|😻|ভালোবাসি|আই লাভ ইউ|বাবু|আম্মু|আব্বু|পুতুল|চকলেট|আইসক্রিম|বাবা|মা/i.test(textLine)) {
      return `Speak in Anya Forger's sweetest spoiled 4-year-old cuddle voice whining affectionately to Papa Loid and Mama Yor with adorable baby charm in ${langPrompt}. ${anyaCadence}`;
    }
    if (/\?|কি\?|কেন\?|কেমন\?|কই\?/i.test(textLine)) {
      return `Speak in Anya Forger's curious, squeaky, cute 4-year-old child questioning tone with total innocent toddler curiosity in ${langPrompt}. ${anyaCadence}`;
    }
    return `Speak as Anya Forger from Spy x Family: A 4-5 year old ultra squeaky, spoiled, adorable anime toddler girl with extreme baby nakra (মিষ্টি নেকামি), funny childish innocence, cute squeaks and fast lively toddler rhythm in ${langPrompt}. ${anyaCadence}`;
  }

  const isKoreSweetRomanticModel =
    voiceName === "Kore" ||
    voiceName?.toLowerCase()?.includes("kore") ||
    voiceName?.toLowerCase()?.includes("মিষ্টি") ||
    voiceName?.toLowerCase()?.includes("রোমান্টিক") ||
    voiceName?.toLowerCase()?.includes("মেয়ে");

  if (isKoreSweetRomanticModel) {
    const koreCadence = "Character Persona: A 12 to 15 year old young teenage schoolgirl (১২-১৫ বছরের কিশোরী মেয়ে). Voice Characteristics: Naturally high-pitched, sweet, bright, light, and charming young teenage voice. Completely avoid adult woman/mature deep low tones. Speak with youthful softness, innocent charm, cheerful cadence, and crystal-clear pronunciation in Bengali.";
    if (/😍|🥰|😘|💖|❤️|💕|😻|ভালোবাসি|প্রেম|প্রিয়|হৃদয়|মন|কাছে/i.test(textLine)) {
      return `Speak in a very sweet, soft, shy, and heartfelt 12-15 year old teenage girl's voice with innocent charm and bright melodic warmth in ${langPrompt}. ${koreCadence}`;
    }
    if (/😭|😢|😿|🥺|💔|কষ্ট|বেদনা|অশ্রু|ব্যথা|কেন এমন হলো|ছেড়ে গেলে/i.test(textLine)) {
      return `Speak in an emotional, fragile, tearful, and tender 12-15 year old young girl's voice with soft trembling sincerity in ${langPrompt}. ${koreCadence}`;
    }
    if (/😂|🤣|হিহি|হাহা|হাসি|আনন্দ|মজা|মুচকি|ধুর|আরে/i.test(textLine)) {
      return `Speak with a bubbly, cheerful, high-pitched, giggly 12-15 year old teenage girl's laughter and lively bounce in ${langPrompt}. ${koreCadence}`;
    }
    if (/🤫|গোপন|ফিসফিস|আস্তে|শোনো|বলছি/i.test(textLine)) {
      return `Speak in a whispery, curious, sweet teenage girl storytelling tone in ${langPrompt}. ${koreCadence}`;
    }
    if (/\?|কি\?|কেন\?|সত্যি\?|তাই\?/i.test(textLine)) {
      return `Speak in an inquisitive, bright, high-pitched teenage girl's questioning tone in ${langPrompt}. ${koreCadence}`;
    }
    return `Speak in a naturally sweet, high-pitched, light, and cute 12-15 year old teenage girl's voice with lively natural flow in ${langPrompt}. ${koreCadence}`;
  }

  const isDeepBananaModel =
    voiceName === "Mr.banana" ||
    voiceName === "MrBanana" ||
    voiceName === "Bunny" ||
    voiceName?.toLowerCase()?.includes("banana") ||
    voiceName === "Fenrir";

  if (isDeepBananaModel) {
    if (/😭|😢|😿|🥺|💔/.test(textLine)) {
      return `Speak in deep, sorrowful emotional baritone in ${langPrompt}. ${CADENCE}`;
    }
    if (/😂|🤣|😹|😆|😃|😄|😁/.test(textLine)) {
      return `Speak in deep booming masculine laughter in ${langPrompt}. ${CADENCE}`;
    }
    if (/😡|🤬|👿|💢|😤/.test(textLine)) {
      return `Speak in commanding, deep angry baritone in ${langPrompt}. ${CADENCE}`;
    }
    if (/😍|🥰|😘|💖|❤️|💕|😻/.test(textLine)) {
      return `Speak in warm, deep romantic baritone in ${langPrompt}. ${CADENCE}`;
    }
    return `Speak in signature deep, heavy, rich studio baritone voice in ${langPrompt}. ${CADENCE}`;
  }

  if (/😭|😢|😿|🥺|💔/.test(textLine)) {
    return `Speak in emotional, crying tone in ${langPrompt}. ${CADENCE}`;
  }
  if (/😂|🤣|😹|😆|😃|😄|😁/.test(textLine)) {
    return `Speak in hearty joyful laughter in ${langPrompt}. ${CADENCE}`;
  }
  if (/😡|🤬|👿|💢|😤/.test(textLine)) {
    return `Speak with fierce anger and shouting emotion in ${langPrompt}. ${CADENCE}`;
  }
  if (/😍|🥰|😘|💖|❤️|💕|😻/.test(textLine)) {
    return `Speak with sweet romantic affection in ${langPrompt}. ${CADENCE}`;
  }
  if (/🍌/.test(textLine)) {
    return `Speak in signature MʀツBΛNΛNΛ creator voice in ${langPrompt}. ${CADENCE}`;
  }

  return `Speak in natural, expressive, crystal clear ${langPrompt}. ${CADENCE}`;
}

function sanitizeSpeechText(text: string): string {
  return text
    .replace(/[~]+/g, '')
    .replace(/\.{3,}/g, '.')
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split massive text into optimal TTS chunks (up to 3500 chars per chunk to maximize quota efficiency and avoid hitting 3 RPM rate limits)
 */
function splitTextIntoTTSChunks(
  rawText: string,
  language: "bengali" | "english" | "hindi",
  voiceName: string = "Fenrir"
): Array<{ text: string; directive: string }> {
  // If the total text is within 3500 characters, send as a SINGLE chunk for instant, quota-friendly generation!
  if (rawText.trim().length <= 3500) {
    return [{
      text: rawText.trim(),
      directive: getEmojiActingDirective(rawText, language, voiceName),
    }];
  }

  // First split by explicit line breaks/paragraphs
  const rawLines = rawText.split(/\r?\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
  const chunks: Array<{ text: string; directive: string }> = [];

  let currentBlock = "";

  for (const line of rawLines) {
    if ((currentBlock + "\n" + line).length <= 3000) {
      currentBlock = currentBlock ? `${currentBlock}\n${line}` : line;
    } else {
      if (currentBlock) {
        chunks.push({
          text: currentBlock.trim(),
          directive: getEmojiActingDirective(currentBlock, language, voiceName),
        });
      }
      if (line.length <= 3000) {
        currentBlock = line;
      } else {
        // Break super long line into sentences
        const sentences = line.split(/(?<=[.?!।|])\s+/).filter((s) => s.trim().length > 0);
        currentBlock = "";
        for (const sent of sentences) {
          if ((currentBlock + " " + sent).length > 3000 && currentBlock.length > 0) {
            chunks.push({
              text: currentBlock.trim(),
              directive: getEmojiActingDirective(currentBlock, language, voiceName),
            });
            currentBlock = sent;
          } else {
            currentBlock = currentBlock ? `${currentBlock} ${sent}` : sent;
          }
        }
      }
    }
  }

  if (currentBlock.trim().length > 0) {
    chunks.push({
      text: currentBlock.trim(),
      directive: getEmojiActingDirective(currentBlock, language, voiceName),
    });
  }

  if (chunks.length === 0 && rawText.trim().length > 0) {
    chunks.push({
      text: rawText.trim(),
      directive: getEmojiActingDirective(rawText, language, voiceName),
    });
  }

  return chunks;
}

// Gemini 3.1 Flash TTS Endpoint with Ultra-Capacity & Emoji-Acting support
app.post("/api/tts", async (req, res) => {
  try {
    const {
      text,
      voiceName = "Mr.banana",
      language = "bengali",
      speed = 1.0,
      customPrompt = "",
      apiKey = "",
    } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required for voice generation." });
    }

    const availableKeys = getAllAvailableKeys(apiKey);
    const langKey = (language === "english" || language === "hindi") ? language : "bengali";

    if (availableKeys.length === 0) {
      return res.status(400).json({
        error: "কোনো সক্রিয় Gemini API Key পাওয়া যায়নি। অনুগ্রহ করে উপরে '🔑 API Key' বাটনে আপনার নিজস্ব ফ্রি Gemini API Key প্রদান করুন (aistudio.google.com/app/apikey থেকে ফ্রিতে পাওয়া যায়)।",
        needsApiKey: true,
      });
    }

    const cleanSpeechText = sanitizeSpeechText(text);

    // Split text into chunks
    const chunks = splitTextIntoTTSChunks(cleanSpeechText, langKey, voiceName);

    const allowedVoices = [
      "Fenrir",
      "Charon",
      "Zephyr",
      "Puck",
      "Kore",
      "Aoede",
    ];
    let chosenVoice = "Fenrir";
    if (voiceName === "Aoede" || voiceName?.toLowerCase()?.includes("anya") || voiceName?.toLowerCase()?.includes("আন্যা") || voiceName?.toLowerCase()?.includes("baby") || voiceName?.toLowerCase()?.includes("বাচ্চা")) {
      chosenVoice = "Aoede"; // Aoede provides authentic high-pitched cute young anime child/girl voice
    } else if (allowedVoices.includes(voiceName)) {
      chosenVoice = voiceName;
    } else if (voiceName === "Mr.banana.pro" || voiceName?.toLowerCase()?.includes("banana.pro")) {
      chosenVoice = "Fenrir"; // Deep, smooth, charismatic YouTube narrator voice (Exact match to video!)
    } else if (voiceName === "Mr.banana.gaming") {
      chosenVoice = "Puck"; // High-energy, fast, shouting gaming YouTuber engine
    } else if (voiceName === "Mr.banana.gaming.pro") {
      chosenVoice = "Zephyr"; // Crisp modern dynamic streamer
    } else if (
      voiceName === "Mr.banana" ||
      voiceName === "Bunny" ||
      voiceName === "MrBanana"
    ) {
      chosenVoice = "Fenrir"; // Rich, deep, heavy masculine baritone
    } else if (voiceName?.toLowerCase()?.includes("female") || voiceName === "Leda") {
      chosenVoice = "Kore";
    } else if (voiceName === "Orus") {
      chosenVoice = "Fenrir";
    }

    // Generate audio for each chunk sequentially with intelligent multi-key instant failover and retry
    const audioBuffers: Buffer[] = [];
    let lastErrorMsg = "";
    let allChunksSuccessful = true;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let promptText = "";

      if (customPrompt && customPrompt.trim()) {
        promptText = `${customPrompt.trim()}: ${chunk.text}`;
      } else {
        promptText = `${chunk.directive} ${chunk.text}`;
      }

      let chunkGenerated = false;
      const maxPasses = 2; // Fast direct retry
      const permanentlyFailedKeys = new Set<string>();

      for (let pass = 1; pass <= maxPasses; pass++) {
        // Try active keys in the pool with 0ms delay
        for (let k = 0; k < availableKeys.length; k++) {
          const keyIdx = (globalKeyRotationIndex + k) % availableKeys.length;
          const currentKey = availableKeys[keyIdx];
          if (permanentlyFailedKeys.has(currentKey)) continue;

          const aiInstance = getAIClient(currentKey);

          const modelsToTry = [
            "gemini-3.1-flash-tts-preview",
          ];

          for (const modelName of modelsToTry) {
            try {
              const currentPrompt =
                pass === 1
                  ? promptText
                  : `${chunk.directive || `Speak in natural, expressive, crystal clear ${langKey}:`} ${chunk.text}`;

              const response = await aiInstance.models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: currentPrompt }] }],
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: chosenVoice },
                    },
                  },
                },
              });

              const candidate = response.candidates?.[0];
              const audioPart = candidate?.content?.parts?.find((p) => p.inlineData && p.inlineData.data);
              const audioBase64 = audioPart?.inlineData?.data || candidate?.content?.parts?.[0]?.inlineData?.data;

              if (audioBase64) {
                const chunkBuffer = Buffer.from(audioBase64, "base64");
                audioBuffers.push(chunkBuffer);
                chunkGenerated = true;
                globalKeyRotationIndex = keyIdx;
                break; // Success for this chunk!
              }
            } catch (chunkError: any) {
              lastErrorMsg = chunkError?.message || String(chunkError);
              console.warn(
                `Chunk ${i + 1}/${chunks.length} (Model ${modelName}, Key ${keyIdx + 1}/${availableKeys.length}, pass ${pass}) error:`,
                lastErrorMsg.slice(0, 150)
              );

              if (
                lastErrorMsg.includes("leaked") ||
                lastErrorMsg.includes("PERMISSION_DENIED") ||
                lastErrorMsg.includes("API key not valid") ||
                lastErrorMsg.includes("API_KEY_INVALID") ||
                lastErrorMsg.includes("exceeded your current quota")
              ) {
                permanentlyFailedKeys.add(currentKey);
                break; // Don't try other models with dead key
              }
              // If model not found or not supported, continue to next model
              if (lastErrorMsg.includes("not found") || lastErrorMsg.includes("404") || lastErrorMsg.includes("unsupported")) {
                continue;
              }
              break;
            }
          }

          if (chunkGenerated) {
            break;
          }
        }

        if (chunkGenerated) {
          break; // Chunk succeeded
        }

        if (pass < maxPasses && availableKeys.length > 0) {
          // If we had a 429 rate limit and only 1 key, brief backoff
          const waitTime = lastErrorMsg.includes("429") ? 1500 : 500;
          await new Promise((res) => setTimeout(res, waitTime));
        }
      }

      // If this chunk failed after all attempts, break
      if (!chunkGenerated) {
        allChunksSuccessful = false;
        break;
      }
    }

    // If not all chunks succeeded, return meaningful user-friendly message
    if (!allChunksSuccessful || audioBuffers.length === 0 || audioBuffers.length < chunks.length) {
      if (
        lastErrorMsg.includes("leaked") ||
        lastErrorMsg.includes("PERMISSION_DENIED") ||
        lastErrorMsg.includes("API key not valid") ||
        lastErrorMsg.includes("API_KEY_INVALID")
      ) {
        return res.status(400).json({
          error: "API Key-টি সক্রিয় নয় বা Google দ্বারা বাতিল হয়েছে। অনুগ্রহ করে উপরে '🔑 API Key' বাটনে ক্লিক করে aistudio.google.com/app/apikey থেকে আপনার নিজস্ব ফ্রি Gemini API Key বসিয়ে দিন।",
          needsApiKey: true,
        });
      }
      if (
        lastErrorMsg.includes("429") ||
        lastErrorMsg.includes("quota") ||
        lastErrorMsg.includes("Quota") ||
        lastErrorMsg.includes("RESOURCE_EXHAUSTED") ||
        lastErrorMsg.includes("rate-limits")
      ) {
        let retrySeconds = 20;
        const retryMatch = lastErrorMsg.match(/retry in\s+([\d\.]+)s/i) || lastErrorMsg.match(/retryDelay["']?\s*:\s*["']?(\d+)s?/i);
        if (retryMatch && retryMatch[1]) {
          retrySeconds = Math.ceil(parseFloat(retryMatch[1]));
        }
        return res.status(429).json({
          error: `আপনার বর্তমান Gemini API Key-এর ফ্রি কোটা শেষ হয়েছে (429 Quota Exceeded)। অনুগ্রহ করে ${retrySeconds} সেকেন্ড অপেক্ষা করুন অথবা '🔑 API Key' বাটনে aistudio.google.com থেকে নতুন ফ্রি Key যুক্ত করুন।`,
          retryAfter: retrySeconds,
          isQuotaExceeded: true,
          needsApiKey: true,
        });
      }
      return res.status(500).json({
        error: `ভয়েস তৈরি করার সময় সমস্যা হয়েছে (${lastErrorMsg.slice(0, 100) || "API Error"}). অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।`,
      });
    }

    // Concatenate all PCM chunks into one single seamless buffer
    const combinedPcmBuffer = Buffer.concat(audioBuffers);
    const combinedBase64 = combinedPcmBuffer.toString("base64");

    res.json({
      success: true,
      audio: combinedBase64,
      mimeType: "audio/pcm;rate=24000",
      sampleRate: 24000,
      voice: chosenVoice,
      language: langKey,
      totalChunks: chunks.length,
      byteLength: combinedPcmBuffer.length,
    });
  } catch (error: any) {
    console.error("TTS Generation Error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate speech audio.",
    });
  }
});

// AI Script Enhancer, Storyteller & Emoji Director (Gemini 3.7 Flash)
app.post("/api/enhance-script", async (req, res) => {
  try {
    const { originalText, action = "add_emojis", language = "bengali" } = req.body;

    if (!originalText) {
      return res.status(400).json({ error: "Original text is required." });
    }

    const ai = getAIClient();

    let systemPrompt =
      "You are MʀツBΛNΛNΛ, the ultimate master voice actor director and YouTube creator scriptwriter. You specialize in adding expressive theatrical emojis (like 😭, 😂, 😡, 😱, 😍, 🥱, 🤫, 🥳, 😎, 🍌) before each line so the TTS engine acts with extreme emotions, clear pronunciation, and unmatched viral excitement.";

    let userPrompt = "";

    if (action === "add_emojis") {
      userPrompt = `Analyze the following script and format it line-by-line. At the very beginning of each line, place the exact matching emotional emoji (for example: 😭 for crying/sadness, 😂 for laughing/humor, 😡 for anger, 😱 for shock/scare, 😍 for love/sweetness, 🥳 for celebration/hype, 😎 for swag/attitude, 🍌 for signature banana humor) so each line is acted out accordingly. Keep the text in ${language} without losing any words.

Script:
"""${originalText}"""

Output ONLY the formatted script with emojis at each line start.`;
    } else if (action === "youtuber_energy") {
      userPrompt = `Rewrite the following script with maximum viral YouTube creator energy in ${language}. Put dramatic emotional emojis (🥳, 😂, 😱, 😎, 🍌) before each line to give it high-intensity spoken voiceacting dynamics.

Script:
"""${originalText}"""

Output ONLY the ready-to-speak script.`;
    } else if (action === "translate_bengali") {
      userPrompt = `Translate and adapt the following text into crystal-clear, authentic conversational Bengali (বাংলা) with emotional emojis (😭, 😂, 🥳, 😍, 😎) preceding each line for dramatic acting.

Original:
"""${originalText}"""

Output ONLY the Bengali text.`;
    } else if (action === "translate_hindi") {
      userPrompt = `Translate and adapt the following text into crystal-clear, expressive Hindi (हिन्दी) with emotional emojis (😭, 😂, 🥳, 😍, 😎) preceding each line for dramatic acting.

Original:
"""${originalText}"""

Output ONLY the Hindi text.`;
    } else if (action === "translate_english") {
      userPrompt = `Translate and adapt the following text into crisp, high-impact English with emotional emojis (😭, 😂, 🥳, 😍, 😎) preceding each line for dramatic acting.

Original:
"""${originalText}"""

Output ONLY the English text.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      result: response.text || "",
    });
  } catch (error: any) {
    console.error("Script Enhancement Error:", error);
    res.status(500).json({
      error: error?.message || "Failed to process script enhancement.",
    });
  }
});

// Fallback for unhandled API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `API Route not found: ${req.method} ${req.path}`,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MʀツBΛNΛNΛ VOICE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
