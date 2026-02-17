'use client';

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Bot,
  Camera,
  Globe,
  GraduationCap,
  Home as HomeIcon,
  Mic,
  Play,
  Settings,
  Sparkles,
  Square,
} from "lucide-react";
import { generateAnswer } from "./actions";

// --- Type Definitions to fix missing SpeechRecognition types ---
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionError extends Event {
  error: string;
  message: string;
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
  webkitSpeechRecognition?: { new(): SpeechRecognition };
  SpeechRecognition?: { new(): SpeechRecognition };
};

type AnswerPayload = {
  text: string;
  image: string | null;
};

// --- Speech Recognition Hook ---
const useSpeechRecognition = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as SpeechRecognitionWindow;
      const SpeechRecognitionCtor = win.webkitSpeechRecognition || win.SpeechRecognition;
      if (!SpeechRecognitionCtor) return;

      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[0][0].transcript;
        onResult(text);
      };
    }
  }, [onResult]);

  const startListening = () => {
    try { recognitionRef.current?.start(); } catch (e) {
      // If already started, ignore
      console.error(e);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  return { isListening, startListening, stopListening };
};

// --- Inline Camera Component ---
const InlineCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const currentVideo = videoRef.current;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (currentVideo) currentVideo.srcObject = stream;
      } catch (err) { console.error("Camera Error:", err); }
    };
    startCamera();

    return () => {
      const stream = currentVideo?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="w-full h-full bg-black relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
    </div>
  );
};

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSettings, setShowSettings] = useState(false);
  const [query, setQuery] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [result, setResult] = useState<AnswerPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const handleResult = (text: string) => {
    setQuery(text);
    setTypedQuestion(text);
    processInput(text);
  };

  const { isListening, startListening, stopListening } = useSpeechRecognition(handleResult);

  const processInput = async (input: string) => {
    if (!input.trim()) return;
    setIsLoading(true);

    // Stop speaking if new input comes
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();

    try {
      const data = await generateAnswer(input);
      if (data) {
        setResult(data);
        speak(data.text);
      } else {
        const errorData = {
          text: "I couldn't find an answer for that. Please try again!",
          image: null
        };
        setResult(errorData);
        speak(errorData.text);
      }
    } catch (e) {
      console.error(e);
      setResult({ text: "Error connecting to service.", image: null });
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      // Select a voice if possible
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => setAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleSpeech = () => {
    if (aiSpeaking) {
      window.speechSynthesis.cancel();
      setAiSpeaking(false);
    } else if (result?.text) {
      speak(result.text);
    }
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
    <main className={`min-h-screen px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8 ${isDark ? "bg-slate-950 text-slate-100" : "text-slate-900"}`}>
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
                <p className={`mt-1 text-xs uppercase tracking-wide md:text-base ${isDark ? "text-slate-400" : "text-slate-400"}`}>ST. JOSEPH ANGLO INDIAN HS SCHOOL</p>
              </div>
            </div>
            <button className={`flex h-12 w-12 items-center justify-center rounded-full md:h-14 md:w-14 ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
              <Bell size={18} />
            </button>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-5 md:mt-7 md:grid-cols-2 md:items-start md:gap-6">
          <section className={`overflow-hidden rounded-[2rem] border shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Camera size={22} className="text-blue-500" />
                <h2 className="text-[1.9rem] font-semibold tracking-tight md:text-2xl">Ask Your Question</h2>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 md:text-sm">VOICE + CAMERA</span>
            </div>
            <div className={`h-px ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />

            <div className="p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-slate-100">
                <InlineCamera />
                <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-slate-500/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white md:right-4 md:top-4 md:text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${isListening ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`} />
                  {isListening ? "Live" : "Ready"}
                </div>

                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`absolute bottom-4 left-1/2 flex w-[74%] min-w-[220px] -translate-x-1/2 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-white shadow-lg transition-transform active:scale-95 md:bottom-5 md:w-auto md:min-w-0 md:px-7 md:text-lg ${isListening
                      ? "bg-gradient-to-r from-rose-500 to-red-500"
                      : "bg-gradient-to-r from-blue-500 to-blue-600"
                    }`}
                >
                  {isListening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
                  {isListening ? "Stop Listening" : "Speak Question"}
                </button>
              </div>

              <div className={`mt-4 space-y-3 rounded-3xl border px-4 py-4 ${isDark ? "border-slate-700 bg-slate-800/80" : "border-slate-200 bg-slate-100/90"}`}>
                <textarea
                  value={typedQuestion}
                  onChange={(e) => setTypedQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitTypedQuestion();
                    }
                  }}
                  placeholder="Type your question..."
                  className={`min-h-[84px] w-full resize-none rounded-2xl border px-4 py-3 text-base outline-none ring-blue-500/40 placeholder:text-slate-400 focus:ring-2 ${isDark ? "border-slate-600 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700"}`}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className={`truncate text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {query ? `Last question: ${query}` : "You can type or use voice."}
                  </p>
                  <button
                    onClick={submitTypedQuestion}
                    disabled={!typedQuestion.trim() || isLoading}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${!typedQuestion.trim() || isLoading
                        ? "cursor-not-allowed bg-slate-300 text-slate-500"
                        : "bg-blue-500 text-white"
                      }`}
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={`overflow-hidden rounded-[2rem] border shadow-[0_12px_28px_rgba(59,130,246,0.14)] ${isDark ? "border-slate-700 bg-slate-900" : "border-blue-100 bg-[#eaf1fb]"}`}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Sparkles size={22} className="text-blue-500" />
                <h2 className="text-[1.9rem] font-semibold tracking-tight md:text-2xl">AI Answer &amp; Visual</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 md:text-base">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Ready
              </div>
            </div>
            <div className={`h-px ${isDark ? "bg-slate-700" : "bg-blue-100"}`} />

            <div className="space-y-4 p-4">
              <div className={`flex min-h-[270px] items-center justify-center rounded-[1.6rem] border p-4 ${isDark ? "border-slate-700 bg-slate-950" : "border-slate-200 bg-white"}`}>
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={15} className="text-blue-500" />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-blue-500">Thinking...</span>
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

              <div className={`custom-scrollbar max-h-[200px] overflow-y-auto rounded-3xl border px-5 py-4 text-base leading-relaxed md:text-[1.1rem] ${isDark ? "border-slate-700 bg-slate-950 text-slate-200" : "border-slate-200 bg-white text-slate-800"}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                    <Bot size={18} />
                  </div>
                  {result?.text ? (
                    <p>{result.text}</p>
                  ) : (
                    <p className={`italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>Answer will appear here after you ask a question.</p>
                  )}
                </div>
              </div>

              <button
                onClick={toggleSpeech}
                disabled={!result}
                className={`flex w-full items-center justify-center gap-2 rounded-3xl border px-5 py-4 text-lg font-semibold transition active:scale-[0.99] md:text-xl ${!result
                    ? "cursor-not-allowed border-slate-600 bg-slate-800 text-slate-500"
                    : aiSpeaking
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : isDark ? "border-blue-500 bg-slate-950 text-blue-400" : "border-blue-500 bg-white text-blue-600"
                  }`}
              >
                {aiSpeaking ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {aiSpeaking ? "Stop AI Answer" : "Play AI Answer"}
              </button>
            </div>
          </section>
        </div>
      </div>

      <nav className={`fixed bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 items-center justify-around rounded-[2rem] border p-3 shadow-[0_16px_34px_rgba(15,23,42,0.16)] md:hidden ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
        <button className={`flex h-12 w-12 items-center justify-center rounded-full ${isDark ? "bg-slate-800 text-blue-400" : "bg-blue-100 text-blue-500"}`}>
          <HomeIcon size={22} />
        </button>
        <button
          onClick={() => setShowSettings((prev) => !prev)}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${showSettings ? "bg-blue-500 text-white" : isDark ? "text-slate-300" : "text-slate-500"}`}
        >
          <Settings size={22} />
        </button>
      </nav>

      {showSettings && (
        <div className={`fixed bottom-24 left-1/2 z-20 w-[calc(100%-2rem)] max-w-[360px] -translate-x-1/2 rounded-2xl border p-3 shadow-xl md:hidden ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <p className={`px-2 pb-2 text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Theme</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setTheme("light");
                setShowSettings(false);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${theme === "light" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}
            >
              Light
            </button>
            <button
              onClick={() => {
                setTheme("dark");
                setShowSettings(false);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${theme === "dark" ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}
            >
              Dark
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
