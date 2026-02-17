'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Bot,
  Camera,
  Eraser,
  Globe,
  GraduationCap,
  Home as HomeIcon,
  Mic,
  Paintbrush,
  Play,
  Settings as SettingsIcon,
  Sparkles,
  Square,
} from "lucide-react";
import { generateAnswer, generateDrawingFromPrompt } from "./actions";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

type SpeechRecognitionWindow = Window & {
  webkitSpeechRecognition?: { new (): SpeechRecognition };
  SpeechRecognition?: { new (): SpeechRecognition };
};

type Language = "en" | "ta";
type Theme = "light" | "dark";
type VoiceStyle = "female" | "male";
type ActiveTab = "home" | "drawing" | "settings";

type AnswerPayload = {
  text: string;
  image: string | null;
};

const STORAGE_KEYS = {
  theme: "kids_theme",
  language: "kids_language",
  voiceStyle: "kids_voice_style",
  speechRate: "kids_speech_rate",
};

const useSpeechRecognition = (onResult: (text: string) => void, lang: Language) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as SpeechRecognitionWindow;
    const SpeechRecognitionCtor = win.webkitSpeechRecognition || win.SpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    recognitionRef.current = new SpeechRecognitionCtor();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = lang === "ta" ? "ta-IN" : "en-US";

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      onResult(event.results[0][0].transcript);
    };
  }, [onResult, lang]);

  const startListening = () => {
    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.error(error);
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  return { isListening, startListening, stopListening };
};

const InlineCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const currentVideo = videoRef.current;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (currentVideo) currentVideo.srcObject = stream;
      } catch (error) {
        console.error("Camera Error:", error);
      }
    };
    startCamera();
    return () => {
      const stream = currentVideo?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover [transform:scaleX(-1)]" />
    </div>
  );
};

function DrawingSection({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#3b82f6");
  const [prompt, setPrompt] = useState("");
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiText, setAiText] = useState("Type a prompt and tap Draw AI.");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 250 * dpr;
    canvas.style.height = "250px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#3b82f6";
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = color;
  }, [color]);

  const drawAt = (clientX: number, clientY: number, move = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!move) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      return;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const generateDrawing = async () => {
    const cleaned = prompt.trim();
    if (!cleaned) return;
    setIsGenerating(true);
    try {
      const data = await generateDrawingFromPrompt(cleaned);
      setAiImage(data.image);
      setAiText(data.text);
    } catch (error) {
      console.error(error);
      setAiText("Could not generate drawing now. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className={`overflow-hidden rounded-[2rem] border shadow-[0_12px_28px_rgba(59,130,246,0.14)] ${isDark ? "border-slate-700 bg-slate-900" : "border-pink-100 bg-gradient-to-br from-pink-50 via-yellow-50 to-cyan-50"}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Paintbrush size={22} className="text-pink-500" />
          <h2 className="text-[1.5rem] font-semibold tracking-tight md:text-2xl">Drawing AI</h2>
        </div>
        <div className="text-2xl">🎨 ✨</div>
      </div>
      <div className={`h-px ${isDark ? "bg-slate-700" : "bg-pink-200"}`} />
      <div className="space-y-4 p-4">
        <div className={`rounded-2xl border p-3 ${isDark ? "border-slate-700 bg-slate-950" : "border-pink-200 bg-white"}`}>
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Type prompt: red car, cute cat, rainbow house..."
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
            />
            <button
              onClick={generateDrawing}
              disabled={!prompt.trim() || isGenerating}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${!prompt.trim() || isGenerating ? "cursor-not-allowed bg-slate-300 text-slate-500" : "bg-pink-500 text-white"}`}
            >
              {isGenerating ? "Drawing..." : "Draw AI"}
            </button>
          </div>
          <p className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{aiText}</p>
        </div>

        <div className={`flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border ${isDark ? "border-slate-700 bg-slate-950" : "border-pink-200 bg-white"}`}>
          {aiImage ? (
            <img src={aiImage} alt="AI Drawing" className="h-full w-full object-cover" />
          ) : (
            <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>AI drawing preview appears here</div>
          )}
        </div>

        <div className={`overflow-hidden rounded-3xl border ${isDark ? "border-slate-700 bg-slate-950" : "border-pink-200 bg-white"}`}>
          <canvas
            ref={canvasRef}
            className="w-full touch-none"
            onPointerDown={(event) => {
              setDrawing(true);
              drawAt(event.clientX, event.clientY, false);
            }}
            onPointerMove={(event) => {
              if (!drawing) return;
              drawAt(event.clientX, event.clientY, true);
            }}
            onPointerUp={() => setDrawing(false)}
            onPointerLeave={() => setDrawing(false)}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {["#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6"].map((swatch) => (
              <button
                key={swatch}
                onClick={() => setColor(swatch)}
                className={`h-8 w-8 rounded-full border-2 ${color === swatch ? "scale-110 border-slate-700" : "border-white"}`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <button
            onClick={clearCanvas}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isDark ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"}`}
          >
            <Eraser size={15} />
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("en");
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>("female");
  const [speechRate, setSpeechRate] = useState(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [query, setQuery] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [result, setResult] = useState<AnswerPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem(STORAGE_KEYS.theme) as Theme | null;
    const savedLang = window.localStorage.getItem(STORAGE_KEYS.language) as Language | null;
    const savedVoice = window.localStorage.getItem(STORAGE_KEYS.voiceStyle) as VoiceStyle | null;
    const savedRate = window.localStorage.getItem(STORAGE_KEYS.speechRate);
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (savedLang === "en" || savedLang === "ta") setLanguage(savedLang);
    if (savedVoice === "female" || savedVoice === "male") setVoiceStyle(savedVoice);
    if (savedRate) {
      const rate = Number(savedRate);
      if (!Number.isNaN(rate) && rate >= 0.6 && rate <= 1.4) setSpeechRate(rate);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.voiceStyle, voiceStyle);
  }, [voiceStyle]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.speechRate, String(speechRate));
  }, [speechRate]);

  const labels = useMemo(() => {
    if (language === "ta") {
      return {
        askQuestion: "Kelvi Kelungal",
        voiceCamera: "Voice + Camera",
        speakQuestion: "Kelvi Pesungal",
        stopListening: "Niruthu",
        typeQuestion: "Ungal kelviyai type seiyungal...",
        ask: "Kel",
        lastQuestion: "Last question",
        answerVisual: "AI Bathil & Visual",
        ready: "Ready",
        thinking: "Yosikirathu...",
        answerPlaceholder: "Kelvi ketta pin bathil inge varum.",
        playAnswer: "AI Bathil Play",
        stopAnswer: "Stop",
      };
    }
    return {
      askQuestion: "Ask Your Question",
      voiceCamera: "VOICE + CAMERA",
      speakQuestion: "Speak Question",
      stopListening: "Stop Listening",
      typeQuestion: "Type your question...",
      ask: "Ask",
      lastQuestion: "Last question",
      answerVisual: "AI Answer & Visual",
      ready: "Ready",
      thinking: "Thinking...",
      answerPlaceholder: "Answer will appear here after you ask a question.",
      playAnswer: "Play AI Answer",
      stopAnswer: "Stop AI Answer",
    };
  }, [language]);

  const onSpeechResult = (text: string) => {
    setQuery(text);
    setTypedQuestion(text);
    processInput(text);
  };

  const { isListening, startListening, stopListening } = useSpeechRecognition(onSpeechResult, language);

  const pickVoice = (voices: SpeechSynthesisVoice[]) => {
    const langPrefix = language === "ta" ? "ta" : "en";
    const langVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
    const pool = langVoices.length > 0 ? langVoices : voices;
    const hints = voiceStyle === "female" ? ["female", "zira", "samantha", "veena"] : ["male", "david", "alex", "mark"];
    const picked = pool.find((voice) => hints.some((hint) => voice.name.toLowerCase().includes(hint)));
    return picked ?? pool[0] ?? null;
  };

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "ta" ? "ta-IN" : "en-US";
    utterance.rate = speechRate;
    utterance.pitch = voiceStyle === "female" ? 1.1 : 0.95;
    const voice = pickVoice(window.speechSynthesis.getVoices());
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => setAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const processInput = async (input: string) => {
    const cleaned = input.trim();
    if (!cleaned) return;
    setIsLoading(true);
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    try {
      const data = await generateAnswer(cleaned, language);
      setResult(data);
      speak(data.text);
    } catch (error) {
      console.error(error);
      setResult({ text: "Error connecting to service.", image: null });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpeech = () => {
    if (aiSpeaking) {
      window.speechSynthesis.cancel();
      setAiSpeaking(false);
      return;
    }
    if (result?.text) speak(result.text);
  };

  const submitTypedQuestion = () => {
    const input = typedQuestion.trim();
    if (!input) return;
    setQuery(input);
    processInput(input);
    setTypedQuestion("");
  };

  const isDark = theme === "dark";

  return (
    <main className={`min-h-screen px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8 ${isDark ? "bg-slate-950 text-slate-100" : "bg-[#eef2f7] text-slate-900"}`}>
      <div className="mx-auto w-full max-w-[560px] md:max-w-[1080px]">
        <header className={`rounded-[2rem] border px-4 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.08)] md:px-7 md:py-5 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg md:h-16 md:w-16">
                <GraduationCap size={26} />
              </div>
              <div>
                <h1 className={`text-[2rem] font-semibold leading-none tracking-tight md:text-4xl ${isDark ? "text-slate-100" : "text-slate-900"}`}>Sanchia Florance</h1>
                <p className={`mt-1 text-base font-medium md:text-xl ${isDark ? "text-slate-300" : "text-slate-600"}`}>Class: III-A</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400 md:text-base">ST. JOSEPH ANGLO INDIAN HS SCHOOL</p>
              </div>
            </div>
            <button className={`flex h-12 w-12 items-center justify-center rounded-full md:h-14 md:w-14 ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
              <Bell size={18} />
            </button>
          </div>

          <div className="mt-4 hidden grid-cols-3 gap-2 md:grid">
            <button onClick={() => setActiveTab("home")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === "home" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>Home</button>
            <button onClick={() => setActiveTab("drawing")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === "drawing" ? "bg-pink-500 text-white" : isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>Drawing</button>
            <button onClick={() => setActiveTab("settings")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === "settings" ? "bg-indigo-500 text-white" : isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>Settings</button>
          </div>
        </header>

        {activeTab === "home" && (
          <div className="mt-5 grid grid-cols-1 gap-5 md:mt-7 md:grid-cols-2 md:items-start md:gap-6">
            <section className={`overflow-hidden rounded-[2rem] border shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <Camera size={22} className="text-blue-500" />
                  <h2 className="text-[1.5rem] font-semibold tracking-tight md:text-2xl">{labels.askQuestion}</h2>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 md:text-sm">{labels.voiceCamera}</span>
              </div>
              <div className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />

              <div className="p-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-slate-100">
                  <InlineCamera />
                  <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-slate-500/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white md:right-4 md:top-4 md:text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${isListening ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`} />
                    {isListening ? "Live" : labels.ready}
                  </div>

                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`absolute bottom-4 left-1/2 flex w-[74%] min-w-[220px] -translate-x-1/2 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg transition-transform active:scale-95 md:bottom-5 md:w-auto md:min-w-0 md:px-7 md:text-lg ${
                      isListening ? "bg-gradient-to-r from-rose-500 to-red-500" : "bg-gradient-to-r from-blue-500 to-blue-600"
                    }`}
                  >
                    {isListening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
                    {isListening ? labels.stopListening : labels.speakQuestion}
                  </button>
                </div>

                <div className={`mt-4 space-y-3 rounded-3xl border px-4 py-4 ${isDark ? "border-slate-700 bg-slate-800/80" : "border-slate-200 bg-slate-100/90"}`}>
                  <textarea
                    value={typedQuestion}
                    onChange={(event) => setTypedQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submitTypedQuestion();
                      }
                    }}
                    placeholder={labels.typeQuestion}
                    className={`min-h-[84px] w-full resize-none rounded-2xl border px-4 py-3 text-base outline-none ring-blue-500/40 placeholder:text-slate-400 focus:ring-2 ${isDark ? "border-slate-600 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className={`truncate text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {query ? `${labels.lastQuestion}: ${query}` : "You can type or use voice."}
                    </p>
                    <button
                      onClick={submitTypedQuestion}
                      disabled={!typedQuestion.trim() || isLoading}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${!typedQuestion.trim() || isLoading ? "cursor-not-allowed bg-slate-300 text-slate-500" : "bg-blue-500 text-white"}`}
                    >
                      {labels.ask}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className={`overflow-hidden rounded-[2rem] border shadow-[0_12px_28px_rgba(59,130,246,0.14)] ${isDark ? "border-slate-700 bg-slate-900" : "border-blue-100 bg-[#eaf1fb]"}`}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <Sparkles size={22} className="text-blue-500" />
                  <h2 className="text-[1.5rem] font-semibold tracking-tight md:text-2xl">{labels.answerVisual}</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 md:text-base">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {labels.ready}
                </div>
              </div>
              <div className={`h-px ${isDark ? "bg-slate-700" : "bg-blue-100"}`} />

              <div className="space-y-4 p-4">
                <div className={`flex min-h-[240px] items-center justify-center rounded-[1.6rem] border p-4 ${isDark ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"}`}>
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles size={15} className="text-blue-500" />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-blue-500">{labels.thinking}</span>
                    </div>
                  ) : result?.image ? (
                    <img src={result.image} alt="Visual Answer" className="max-h-[220px] rounded-2xl object-contain" />
                  ) : (
                    <div className={`flex flex-col items-center gap-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      <div className={`rounded-2xl border border-dashed px-8 py-8 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-300 bg-slate-50"}`}>
                        <Globe size={18} />
                      </div>
                      <span className="text-sm">Visual context area</span>
                    </div>
                  )}
                </div>

                <div className={`custom-scrollbar max-h-[220px] overflow-y-auto rounded-3xl border px-5 py-4 text-base leading-relaxed md:text-[1.1rem] ${isDark ? "border-slate-700 bg-slate-950 text-slate-200" : "border-slate-200 bg-white text-slate-800"}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                      <Bot size={18} />
                    </div>
                    {result?.text ? <p>{result.text}</p> : <p className={`italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>{labels.answerPlaceholder}</p>}
                  </div>
                </div>

                <button
                  onClick={toggleSpeech}
                  disabled={!result}
                  className={`flex w-full items-center justify-center gap-2 rounded-3xl border px-5 py-4 text-lg font-semibold transition active:scale-[0.99] md:text-xl ${
                    !result ? "cursor-not-allowed border-slate-600 bg-slate-800 text-slate-500" : aiSpeaking ? "border-orange-400 bg-orange-50 text-orange-600" : isDark ? "border-blue-500 bg-slate-950 text-blue-400" : "border-blue-500 bg-white text-blue-600"
                  }`}
                >
                  {aiSpeaking ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  {aiSpeaking ? labels.stopAnswer : labels.playAnswer}
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "drawing" && (
          <div className="mt-5 md:mt-7">
            <DrawingSection isDark={isDark} />
          </div>
        )}

        {activeTab === "settings" && (
          <section className={`mt-5 overflow-hidden rounded-[2rem] border shadow-[0_12px_28px_rgba(59,130,246,0.14)] md:mt-7 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-3 px-5 py-4">
              <SettingsIcon size={22} className="text-indigo-500" />
              <h2 className="text-[1.5rem] font-semibold tracking-tight md:text-2xl">Settings</h2>
            </div>
            <div className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-400">Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTheme("light")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${theme === "light" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Light</button>
                  <button onClick={() => setTheme("dark")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Dark</button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-400">Language</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setLanguage("en")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${language === "en" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>English</button>
                  <button onClick={() => setLanguage("ta")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${language === "ta" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Tamil</button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-400">Voice</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setVoiceStyle("female")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${voiceStyle === "female" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Female</button>
                  <button onClick={() => setVoiceStyle("male")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${voiceStyle === "male" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Male</button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-400">Speech Speed: {speechRate.toFixed(1)}x</p>
                <input type="range" min="0.6" max="1.4" step="0.1" value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value))} className="w-full accent-blue-500" />
              </div>
            </div>
          </section>
        )}
      </div>

      <nav className={`fixed bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 items-center justify-around rounded-[2rem] border p-3 shadow-[0_16px_34px_rgba(15,23,42,0.16)] md:hidden ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
        <button onClick={() => setActiveTab("home")} className={`flex h-12 w-12 items-center justify-center rounded-full ${activeTab === "home" ? "bg-blue-500 text-white" : isDark ? "text-slate-300" : "text-slate-500"}`}>
          <HomeIcon size={22} />
        </button>
        <button onClick={() => setActiveTab("drawing")} className={`flex h-12 w-12 items-center justify-center rounded-full ${activeTab === "drawing" ? "bg-pink-500 text-white" : isDark ? "text-slate-300" : "text-slate-500"}`}>
          <Paintbrush size={22} />
        </button>
        <button onClick={() => setActiveTab("settings")} className={`flex h-12 w-12 items-center justify-center rounded-full ${activeTab === "settings" ? "bg-indigo-500 text-white" : isDark ? "text-slate-300" : "text-slate-500"}`}>
          <SettingsIcon size={22} />
        </button>
      </nav>
    </main>
  );
}
