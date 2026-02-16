'use client';

import { useState, useRef, useEffect } from "react";
import { Mic, Search, Camera, Volume2, Globe, Sparkles, X, ChevronRight, MessageCircle } from "lucide-react";
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

// --- Camera Component ---
const CameraView = ({ onClose }: { onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
      <button onClick={onClose} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full z-20 shadow-lg hover:bg-red-600 transition-colors">
        <X size={24} />
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
  const [conversationLog, setConversationLog] = useState<{ role: 'user' | 'ai', text: string }[]>([]);

  // Handle Voice Input
  const handleVoiceResult = (text: string) => {
    setQuery(text);
    processInput(text);
  };

  const { isListening, startListening, stopListening } = useSpeechRecognition(handleVoiceResult);

  // --- Main Processing Logic ---
  const processInput = async (input: string) => {
    if (!input.trim()) return;

    // Add User message to log
    setConversationLog(prev => [...prev, { role: 'user', text: input }]);
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
    setConversationLog(prev => [...prev, { role: 'ai', text: speechText }]);
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
        if (!isCameraOn) { // Only auto-listen if we aren't handling some other mode? Actually always auto-listen is good for "conversation"
          startListening();
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className={`min-h-screen relative font-sans overflow-hidden transition-colors duration-500 ${isCameraOn ? 'bg-black' : 'bg-gradient-to-b from-cyan-300 to-blue-500'}`}>

      {/* Camera Overlay */}
      {isCameraOn && <CameraView onClose={() => setIsCameraOn(false)} />}

      {/* Content Container */}
      <div className={`relative z-10 w-full min-h-screen flex flex-col items-center p-4 ${isCameraOn ? 'justify-end pb-20' : ''}`}>

        {/* Header (Hidden in Camera Mode for cleaner view) */}
        {!isCameraOn && (
          <header className="mt-8 mb-6 text-center animate-in slide-in-from-top duration-700">
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-lg flex items-center justify-center gap-3">
              <Sparkles className="w-10 h-10 text-yellow-300 animate-pulse" />
              Smart Kids <span className="text-yellow-300">AI</span>
            </h1>
            <p className="text-white/90 text-lg font-medium mt-2">Your Super Smart Learning Buddy! 🚀</p>
          </header>
        )}

        {/* Main Interaction Area */}
        <div className="w-full max-w-2xl flex flex-col gap-6">

          {/* Result Card (Shows answer) */}
          <AnimatePresence mode="wait">
            {result && !isLoading && (
              <motion.div
                key={result.title}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-yellow-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-3xl font-extrabold text-slate-800 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    {result.title}
                  </h2>
                  <button onClick={() => setResult(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image */}
                  <div className="w-full md:w-1/2 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50 aspect-video relative group">
                    {result.image ? (
                      <img src={result.image} alt={result.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <img
                        src={`https://image.pollinations.ai/prompt/${encodeURIComponent(result.title)}?width=400&height=300&nologo=true`}
                        alt={result.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    )}
                  </div>

                  {/* Text */}
                  <div className="w-full md:w-1/2">
                    <p className="text-xl md:text-2xl text-slate-700 font-medium leading-relaxed">
                      {result.text}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                        {result.source}
                      </span>
                      {result.url && (
                        <a href={result.url} target="_blank" className="flex items-center text-slate-400 hover:text-blue-500 text-sm font-bold ml-auto">
                          Read More <ChevronRight size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {/* Fallback Link for Error */}
                {result.isError && result.url && (
                  <a href={result.url} target="_blank" className="mt-4 block bg-blue-500 text-white text-center py-2 rounded-xl font-bold hover:bg-blue-600">
                    Search Google Instead 🌍
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Speaking Indicator */}
          {aiSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white text-blue-600 font-bold px-6 py-3 rounded-full shadow-lg mx-auto flex items-center gap-2"
            >
              <Volume2 className="animate-pulse" />
              Reading Answer...
            </motion.div>
          )}

          {/* Controls Bar (Always Visible) */}
          <div className="w-full max-w-2xl bg-white rounded-full p-2 shadow-2xl flex items-center gap-2 border-4 border-white/50 backdrop-blur-sm">

            {/* Camera Toggle Button */}
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`p-4 rounded-full transition-all duration-300 font-bold flex items-center gap-2
                                ${isCameraOn ? 'bg-red-500 text-white hover:bg-red-600 shadow-inner' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}
                            `}
            >
              <Camera size={24} />
            </button>

            {/* Search Input (Text) */}
            <div className="flex-1 relative">
              <input
                type="text"
                className="w-full bg-slate-100 rounded-full px-6 py-4 text-lg font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all placeholder:text-slate-400"
                placeholder={isListening ? "Listening..." : "Ask me anything..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVoiceResult(query)}
              />
              {isListening && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce delay-150"></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                </div>
              )}
            </div>

            {/* Mic Button (Main Actor via User Request)  */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-4 rounded-full transition-all duration-300 shadow-lg transform hover:scale-110
                                ${isListening ? 'bg-red-500 text-white ring-4 ring-red-200 animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}
                            `}
            >
              <Mic size={28} />
            </button>
          </div>

          {/* Hint Text */}
          {!result && !isCameraOn && (
            <p className="text-white/80 text-center font-medium animate-pulse">
              Try saying: "Hello" or "Show me a Panda" 🐼
            </p>
          )}

        </div>
      </div>
    </main>
  );
}
