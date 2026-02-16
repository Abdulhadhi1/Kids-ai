'use client';

import { useState, useRef, useEffect } from "react";
import { Mic, Camera, Volume2, Globe, Sparkles, X, StopCircle } from "lucide-react";
import { generateAnswer } from "./actions";
import { motion, AnimatePresence } from "framer-motion";

// --- Robust Voice Hook with Mobile Support ---
const useSpeechRecognition = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const intentToListen = useRef(false); // Track if we WANT to be listening

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
        // Auto-restart if we still want to listen (Continuous Mode)
        if (intentToListen.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // ignore errors if already started
          }
        }
      };
      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        // Stop listening strictly to process
        intentToListen.current = false;
        recognitionRef.current.stop();
        onResult(text);
      };
    }
  }, [onResult]);

  const startListening = () => {
    intentToListen.current = true;
    try {
      recognitionRef.current?.start();
    } catch (e) { console.warn("Mic already on") }
  };

  const stopListening = () => {
    intentToListen.current = false;
    recognitionRef.current?.stop();
  };

  return { isListening, startListening, stopListening };
};

// --- Camera Component (Front/Selfie) ---
const CameraView = ({ onClose }: { onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
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
    <div className="fixed inset-0 z-0 bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1] opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
      <button onClick={onClose} className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white p-3 rounded-full z-20 shadow-lg border border-white/20">
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
  const [showIntro, setShowIntro] = useState(true);

  // Handle Voice Input
  const handleVoiceResult = (text: string) => {
    setQuery(text);
    processInput(text);
  };

  const { isListening, startListening, stopListening } = useSpeechRecognition(handleVoiceResult);

  const processInput = async (input: string) => {
    if (!input.trim()) return;
    setShowIntro(false);
    setIsLoading(true);

    const lowerInput = input.toLowerCase();
    // 1. Local Greeting Override
    if (lowerInput.match(/^(hello|hi|hey|how are you|good morning)/)) {
      const reply = "Hello! I am ready to learn. Ask me 'Who is a Lion?' or 'What is Mars?'";
      finishProcessing({ title: "Hello Friend! 👋", text: reply, source: "Buddy", image: null }, reply);
      return;
    }

    // 2. Server Search
    try {
      const data = await generateAnswer(input);
      if (data) {
        finishProcessing(data, data.text);
      } else {
        const errorReply = "I couldn't find that. Try asking something else!";
        finishProcessing({
          title: "Oops!", text: errorReply, source: "System", isError: true,
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

  const speak = (text: string) => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      // Voice Selection (Try to find a good English voice)
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => {
        setAiSpeaking(false);
        // >>> CONTINUOUS MODE: Auto-Start Mic after speaking <<<
        // Use a small timeout to ensure audio is fully released
        setTimeout(() => {
          startListening();
        }, 500);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className={`min-h-screen relative font-sans overflow-hidden transition-all duration-500 ${isCameraOn ? 'bg-black' : 'bg-[#0f172a]'}`}>

      {/* --- Dynamic Background (Aurora) --- */}
      {!isCameraOn && (
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-500/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-500/30 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>
      )}

      {/* --- Camera Layer --- */}
      {isCameraOn && <CameraView onClose={() => setIsCameraOn(false)} />}

      {/* --- Main UI Layer --- */}
      <div className={`relative z-10 w-full min-h-screen flex flex-col p-6 ${isCameraOn ? 'justify-end pb-32' : 'justify-between pb-32'}`}>

        {/* Top Bar */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-bold text-sm tracking-wide">KIDS AI</span>
          </div>
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`p-3 rounded-full transition-all border border-white/20 ${isCameraOn ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Camera size={20} />
          </button>
        </header>

        {/* Center Content: Intro OR Result */}
        <div className="flex-1 flex flex-col justify-center items-center gap-6 mt-4">

          {/* INTRO STATE */}
          <AnimatePresence>
            {showIntro && !result && !isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="text-center"
              >
                <motion.div
                  className="w-40 h-40 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.5)]"
                  animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}
                >
                  <span className="text-6xl">🤖</span>
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
                  Hello Buddy!
                </h1>
                <p className="text-slate-400 text-lg">Tap the Mic to start learning!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOADING STATE */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 border-4 border-t-purple-500 border-white/10 rounded-full animate-spin mb-4" />
                <p className="text-white font-bold text-xl animate-pulse">Thinking...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* RESULT CARD (Modern Glass Mobile Card) */}
          <AnimatePresence mode="wait">
            {result && !isLoading && (
              <motion.div
                key={result.title}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden"
              >
                {/* Decorative Header Gradient */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-3xl font-black text-slate-800 leading-tight">{result.title}</h2>
                    <button onClick={() => setResult(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Image */}
                  <div className="rounded-2xl overflow-hidden aspect-video bg-slate-100 mb-6 shadow-inner border border-slate-200">
                    {result.image ? (
                      <img src={result.image} alt={result.title} className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={`https://image.pollinations.ai/prompt/${encodeURIComponent(result.title)}?width=600&height=400&nologo=true`}
                        alt={result.title}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <p className="text-lg text-slate-700 leading-relaxed font-medium mb-4">
                    {result.text}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                    <span className="text-xs font-bold text-purple-600 uppercase tracking-widest bg-purple-100 px-3 py-1 rounded-full">{result.source}</span>
                    {result.url && (
                      <a href={result.url} target="_blank" className="text-slate-400 hover:text-blue-500 transition-colors">
                        <Globe size={20} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LISTENING INDICATOR OVERLAY */}
        {isListening && !aiSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-28 left-0 right-0 flex justify-center z-20 pointer-events-none"
          >
            <div className="bg-black/50 backdrop-blur-sm text-white px-6 py-2 rounded-full font-bold shadow-xl border border-white/20 flex items-center gap-2">
              <div className="flex gap-1 h-3 items-center">
                <div className="w-1 bg-green-400 h-2 animate-[pulse_0.5s_infinite]" />
                <div className="w-1 bg-green-400 h-4 animate-[pulse_0.5s_infinite_0.1s]" />
                <div className="w-1 bg-green-400 h-2 animate-[pulse_0.5s_infinite_0.2s]" />
              </div>
              Listening...
            </div>
          </motion.div>
        )}

        {/* AI SPEAKING INDICATOR OVERLAY */}
        {aiSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-28 left-0 right-0 flex justify-center z-20 pointer-events-none"
          >
            <div className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold shadow-xl flex items-center gap-2 animate-bounce">
              <Volume2 size={18} /> Speaking...
            </div>
          </motion.div>
        )}

      </div>

      {/* --- BOTTOM FLOATING BAR (Fixed) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 z-50 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-3 w-full max-w-md">

          {/* Text Input (Small) */}
          <div className="flex-1 bg-white/10 backdrop-blur-md rounded-full px-4 h-14 flex items-center border border-white/20 focus-within:bg-white/20 transition-colors">
            <input
              type="text"
              className="bg-transparent w-full text-white placeholder:text-white/50 outline-none font-medium"
              placeholder="Type here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVoiceResult(query)}
            />
          </div>

          {/* MAIN MIC BUTTON (Large) */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`h-16 w-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative
                            ${isListening
                ? 'bg-red-500 text-white scale-110'
                : 'bg-white text-blue-600 hover:scale-105'}
                        `}
          >
            {/* Ripple if listening */}
            {isListening && (
              <span className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-50"></span>
            )}

            {isListening ? <StopCircle size={32} fill="currentColor" /> : <Mic size={32} />}
          </button>

        </div>
      </div>

    </main>
  );
}
