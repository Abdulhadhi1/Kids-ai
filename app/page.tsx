'use client';

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Mic, Search, Camera, Volume2, Globe, Sparkles } from "lucide-react";
import { generateAnswer } from "./actions";
import { motion, AnimatePresence } from "framer-motion";

// Simple hook for Speech Recognition
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    } else {
      alert("Speech recognition not supported in this browser. Try Chrome!");
    }
  };

  return { isListening, transcript, startListening, setTranscript };
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isListening, transcript, startListening, setTranscript } = useSpeechRecognition();

  // Auto-search when voice input ends
  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
      handleSearch(transcript);
      setTranscript(""); // Clear transcript after setting query
    }
  }, [transcript]);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const data = await generateAnswer(searchTerm);
      if (data) {
        setResult(data);
      } else {
        setResult({
          title: "No Results Found",
          text: "I couldn't find a simple answer. Try checking Google!",
          source: "System",
          isError: true
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = () => {
    if (typeof window !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(result?.text || "");
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 font-sans text-slate-800">

      {/* Header / Title */}
      <header className="mt-8 mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-600 mb-2 tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-yellow-400" />
          Smart Kids Search
        </h1>
        <p className="text-slate-500 font-medium">Safe & Fun Learning Engine 🚀</p>
      </header>

      {/* Google-Style Search Bar */}
      <div className="w-full max-w-2xl relative mb-8 z-10">
        <div className={`
                    flex items-center bg-white border-2 rounded-full px-4 py-3 shadow-sm hover:shadow-md transition-shadow
                    ${isListening ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100'}
                `}>
          <Search className="text-slate-400 w-6 h-6 mr-3" />

          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-lg placeholder:text-slate-400 font-medium text-slate-700"
            placeholder="Ask anything... (e.g. 'Who is Einstein?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            autoFocus
          />

          {query && (
            <button onClick={() => setQuery('')} className="bg-slate-200 rounded-full p-1 mr-2 hover:bg-slate-300">
              <span className="sr-only">Clear</span>
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>

          <button
            onClick={startListening}
            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-slate-100 text-blue-600'}`}
            title="Search by Voice"
          >
            <Mic className={`w-6 h-6 ${isListening ? 'scale-110' : ''}`} />
          </button>

          <button
            className="p-2 ml-1 hover:bg-slate-100 rounded-full text-blue-600 md:hidden"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="w-full max-w-2xl flex-1 flex flex-col gap-6">

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium animate-pulse">Searching the Universe... 🌍</p>
          </div>
        )}

        {/* Results Card */}
        {!isLoading && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 overflow-hidden"
          >
            {/* Title Section */}
            <div className="border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    Answer from {result.source}
                  </span>
                  <h2 className="text-3xl font-bold text-slate-800 leading-tight">
                    {result.title}
                  </h2>
                  <p className="text-slate-500 font-medium mt-1 text-sm">{result.description}</p>
                </div>
                <button
                  onClick={handleSpeak}
                  className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                  title="Read Aloud"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Image Section - Auto match from Unsplash based on Title */}
            {/* We use a direct source URL trick: https://source.unsplash.com/ is deprecated,
                            so we use a reliable pattern or fallback to Wikipedia image if available */}
            <div className="mb-6 relative rounded-2xl overflow-hidden bg-slate-100 aspect-video shadow-inner">
              {result.image ? (
                <img
                  src={result.image}
                  alt={result.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                // Use Unsplash Source based on the refined title
                <img
                  src={`https://image.pollinations.ai/prompt/${encodeURIComponent(result.title)}?width=800&height=600&nologo=true`}
                  alt={result.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    // Fallback if image fails
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* Text Content */}
            <div className="prose prose-lg text-slate-700 leading-relaxed">
              <p>{result.text}</p>
            </div>

            {/* Google Search Link Fallback */}
            {result.isError && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full bg-blue-600 text-white font-bold text-center py-3 rounded-xl hover:bg-blue-700 transition"
              >
                Search on Google instead 🌐
              </a>
            )}

            {/* Read More Link */}
            {result.url && !result.isError && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-blue-600 font-bold hover:underline"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Read full article on Wikipedia
                </a>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
