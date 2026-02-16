'use client';

import { useState, useRef, useEffect } from "react";
import { Mic, Search, Camera, Volume2, Globe, Sparkles, X, ChevronRight, RefreshCw, Smile } from "lucide-react";
import { generateAnswer } from "./actions";
import { motion, AnimatePresence } from "framer-motion";

// --- Voice Hook with Auto-Restart Capability ---
const useSpeechRecognition = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isLoopingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // We handle loop manually for better control
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);
      };
    }
  }, [onResult]);

  const startListening = () => {
    isLoopingRef.current = true;
    recognitionRef.current?.start();
  };

  const stopListening = () => {
    isLoopingRef.current = false;
    recognitionRef.current?.stop();
  };

  return { isListening, startListening, stopListening };
};

// --- Camera Component (FRONT FACING SELFIE MODE) ---
const CameraView = ({ onClose }: { onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        // Switch to 'user' for FRONT camera (Selfie Mode)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera Error:", err);
      }
    };
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90 transform scale-x-[-1]" /> {/* Mirror effect */}

      {/* Overlay Gradient for better text readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>

      <button onClick={onClose} className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white p-3 rounded-full z-20 shadow-lg hover:bg-white/30 transition-all border border-white/30">
        <X size={28} />
      </button>
    </div>
  );
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  // Handle Voice Input
  const handleVoiceResult = (text: string) => {
    setQuery(text);
    processInput(text);
  };

  const { isListening, startListening, stopListening } = useSpeechRecognition(handleVoiceResult);

  // --- Main Processing Logic ---
  const processInput = async (input: string) => {
    if (!input.trim()) return;

    setIsLoading(true);

    // 1. Check for Greetings / Small Talk
    const lowerInput = input.toLowerCase();
    if (lowerInput.match(/^(hello|hi|hey|how are you|good morning|who are you)/)) {
      const reply = "Hello! I am your smart learning buddy! I am doing great. Ask me anything, like 'Who is a Tiger?' or 'What is the Sun?'";
      finishProcessing({ title: "Hello Friend! 👋", text: reply, source: "AI Buddy", image: null }, reply);
      return;
    }

    // 2. Perform Search
    try {
      const data = await generateAnswer(input);
      if (data) {
        finishProcessing(data, data.text);
      } else {
        const errorReply = "I couldn't find an answer for that. Try checking Google!";
        finishProcessing({
          title: "Oops!",
          text: errorReply,
          source: "System",
          isError: true,
          url: `https://www.google.com/search?q=${encodeURIComponent(input)}`
        }, errorReply);
      }
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const finishProcessing = (data: any, speechText: string) => {
    setResult(data);
    setIsLoading(false);
    speak(speechText);
  };

  // --- Text-to-Speech with Auto-Listen Loop ---
  const speak = (text: string) => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel(); // Stop current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly higher pitch for "kid friend" voice

      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => {
        setAiSpeaking(false);
        // AUTO-LISTEN: Start listening again after speaking!
        if (!isCameraOn) {
          startListening();
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className={`min-h-screen relative font-sans overflow-hidden transition-colors duration-700 ${isCameraOn ? 'bg-black' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'}`}>

      {/* Background Decorations (Only in Normal Mode) */}
      {!isCameraOn && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>
      )}

      {/* Camera Overlay */}
      {isCameraOn && <CameraView onClose={() => setIsCameraOn(false)} />}

      {/* Content Container */}
      <div className={`relative z-10 w-full min-h-screen flex flex-col items-center p-4 ${isCameraOn ? 'justify-end pb-24' : 'pt-12'}`}>

        {/* Header (Hidden in Camera Mode) */}
        {!isCameraOn && (
          <header className="text-center mb-8 animate-in slide-in-from-top duration-700 fade-in">
            <div className="inline-flex items-center justify-center bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30 shadow-xl mb-4">
              <Sparkles className="w-6 h-6 text-yellow-300 mr-2 animate-spin-slow" />
              <span className="text-white font-bold tracking-wide uppercase text-sm">Safe Kids AI</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl tracking-tight mb-2">
              Smart Buddy
            </h1>
            <p className="text-white/90 text-xl font-medium">Ask me anything! 🚀</p>
          </header>
        )}

        {/* Main Interaction Area */}
        <div className="w-full max-w-2xl flex flex-col gap-6 w-full">

          {/* Result Card (Glassmorphism) */}
          <AnimatePresence mode="wait">
            {result && !isLoading && (
              <motion.div
                key={result.title}
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-white/50 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>

                <button onClick={() => setResult(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>

                <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 leading-tight">
                  {result.title}
                </h2>

                <div className="flex flex-col md:flex-row gap-6 mt-6">
                  {/* Image Container */}
                  <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-lg aspect-video relative bg-slate-200">
                    {result.image ? (
                      <img src={result.image} alt={result.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <img
                        src={`https://image.pollinations.ai/prompt/${encodeURIComponent(result.title)}?width=600&height=400&nologo=true`}
                        alt={result.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="w-full md:w-1/2 flex flex-col justify-center">
                    <p className="text-xl text-slate-700 font-medium leading-relaxed">
                      {result.text}
                    </p>

                    <div className="mt-auto pt-4 flex items-center gap-3">
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {result.source}
                      </span>
                      {result.url && (
                        <a href={result.url} target="_blank" className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors ml-auto shadow-md">
                          <ChevronRight size={20} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Speaking Indicator Bubble */}
          <AnimatePresence>
            {aiSpeaking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="bg-white/95 backdrop-blur-md text-purple-600 font-bold px-8 py-4 rounded-full shadow-2xl mx-auto flex items-center gap-3 border-2 border-purple-200"
              >
                <div className="flex gap-1 h-4 items-end">
                  <div className="w-1.5 bg-purple-500 rounded-full animate-[bounce_1s_infinite_100ms] h-3"></div>
                  <div className="w-1.5 bg-purple-500 rounded-full animate-[bounce_1s_infinite_200ms] h-5"></div>
                  <div className="w-1.5 bg-purple-500 rounded-full animate-[bounce_1s_infinite_300ms] h-3"></div>
                </div>
                Reading Answer...
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Controls Bar */}
          <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-[2rem] p-3 shadow-2xl flex items-center gap-2 border border-white/50 ring-4 ring-white/20 transition-all hover:scale-[1.01]">

            {/* Camera Toggle Button */}
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`p-4 rounded-full transition-all duration-300 font-bold flex items-center justify-center shrink-0
                                ${isCameraOn ? 'bg-red-500 text-white hover:bg-red-600 shadow-xl scale-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-purple-600'}
                            `}
            >
              <Camera size={26} />
            </button>

            {/* Search Input (Text) */}
            <div className="flex-1 relative">
              <input
                type="text"
                className="w-full bg-slate-100/50 rounded-full px-6 py-4 text-xl font-bold text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-200 transition-all placeholder:text-slate-400/80"
                placeholder={isListening ? "Listening..." : "Ask me anything..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVoiceResult(query)}
              />
            </div>

            {/* Mic Button (Call to Action) */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-4 rounded-full transition-all duration-500 shadow-xl transform shrink-0
                                ${isListening ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white scale-110 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:scale-105'}
                            `}
            >
              <Mic size={32} strokeWidth={2.5} />
            </button>
          </div>

          {/* Hint Text */}
          {!result && !isCameraOn && (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {["Tell me about Lions 🦁", "What is Space? 🚀", "Who is Gandhiji? 🇮🇳"].map((hint, i) => (
                <button
                  key={i}
                  onClick={() => handleVoiceResult(hint)}
                  className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full font-medium text-sm hover:bg-white/30 transition-all border border-white/20"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
