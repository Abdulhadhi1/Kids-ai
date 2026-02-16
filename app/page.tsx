'use client';

import { useState, useRef, useEffect } from "react";
import { Mic, Camera, Volume2, Globe, Sparkles, X } from "lucide-react";
import { generateAnswer } from "./actions";
import { motion, AnimatePresence } from "framer-motion";

// --- Robust Voice Hook ---
const useSpeechRecognition = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const intentToListen = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (intentToListen.current) {
          try { recognitionRef.current.start(); } catch (e) { }
        }
      };
      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        intentToListen.current = false;
        recognitionRef.current.stop();
        onResult(text);
      };
    }
  }, [onResult]);

  const startListening = () => {
    intentToListen.current = true;
    try { recognitionRef.current?.start(); } catch (e) { }
  };

  const stopListening = () => {
    intentToListen.current = false;
    recognitionRef.current?.stop();
  };

  return { isListening, startListening, stopListening };
};

// --- Camera Component (Full Screen + Auto Mic) ---
const CameraView = ({ onClose, isListening }: { onClose: () => void, isListening: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { console.error("Camera Error:", err); }
    };
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-white">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />

      {/* Overlay Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/90 via-white/50 to-transparent"></div>

      <button onClick={onClose} className="absolute top-6 right-6 bg-white text-slate-800 p-3 rounded-full z-20 shadow-lg border border-slate-200">
        <X size={28} />
      </button>

      {/* Mic Status Overlay */}
      {isListening && (
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg animate-pulse z-20">
          <Mic size={18} />
          <span className="font-bold text-sm">Listening...</span>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const handleVoiceResult = (text: string) => {
    setQuery(text);
    processInput(text);
  };

  const { isListening, startListening, stopListening } = useSpeechRecognition(handleVoiceResult);

  // Auto-start Mic when Camera opens
  useEffect(() => {
    if (isCameraOn && !aiSpeaking) {
      startListening();
    } else {
      stopListening();
    }
  }, [isCameraOn, aiSpeaking]); // Re-trigger when AI stops speaking to listen again

  const processInput = async (input: string) => {
    if (!input.trim()) return;
    setIsLoading(true);

    const lowerInput = input.toLowerCase();
    if (lowerInput.match(/^(hello|hi|hey|how are you)/)) {
      const reply = "Hello! I am your learning buddy. Ask me anything!";
      finishProcessing({ title: "Hello! 👋", text: reply, source: "Buddy", image: null }, reply);
      return;
    }

    try {
      const data = await generateAnswer(input);
      if (data) {
        finishProcessing(data, data.text);
      } else {
        finishProcessing({
          title: "Oops!", text: "I couldn't find that. Try again!", source: "System", isError: true,
          url: `https://www.google.com/search?q=${encodeURIComponent(input)}`
        }, "I couldn't find that. Try again!");
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

  const speak = (text: string) => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => {
        setAiSpeaking(false);
        // Mic auto-starts via useEffect dependency on aiSpeaking
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 relative font-sans overflow-hidden">

      {/* --- Camera Layer --- */}
      {isCameraOn && <CameraView onClose={() => setIsCameraOn(false)} isListening={isListening} />}

      {/* --- Main Center Button UI (Only visible when Camera is OFF) --- */}
      {!isCameraOn && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">

          <div className="mb-8">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Sparkles className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-800 mb-2">Smart Buddy</h1>
            <p className="text-slate-500 text-lg">Tap below to start talking!</p>
          </div>

          <button
            onClick={() => setIsCameraOn(true)}
            className="group relative bg-white p-2 rounded-[3rem] shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-12 py-6 rounded-[2.5rem] font-bold text-2xl flex items-center gap-4 shadow-lg group-hover:shadow-blue-500/30">
              <Camera size={32} />
              Open Camera
            </div>
          </button>

        </div>
      )}

      {/* --- Result Overlay (Visible on top of Camera) --- */}
      <AnimatePresence mode="wait">
        {isCameraOn && result && !isLoading && (
          <motion.div
            key={result.title}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30 max-h-[60vh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

            <div className="flex items-start gap-4 mb-4">
              {result.image && (
                <img src={result.image} className="w-20 h-20 rounded-2xl object-cover shadow-sm bg-slate-100" />
              )}
              <div>
                <h2 className="text-2xl font-black text-slate-800 leading-tight">{result.title}</h2>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md mt-1 inline-block">{result.source}</span>
              </div>
            </div>

            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              {result.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Loading Overlay --- */}
      {isCameraOn && isLoading && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-slate-100 rounded-full animate-spin mb-3"></div>
            <p className="font-bold text-slate-700">Thinking...</p>
          </div>
        </div>
      )}

    </main>
  );
}
