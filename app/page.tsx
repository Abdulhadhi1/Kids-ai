'use client';

import { useState, useEffect } from 'react';
import { CameraView } from '@/components/features/CameraView';
import { MicButton } from '@/components/features/MicButton';
import { AnswerDisplay } from '@/components/features/AnswerDisplay';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { generateAnswer, getRelatedImages } from '@/app/actions';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceInput();
  const [answer, setAnswer] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState('');

  // Update question state as transcript changes, but don't auto-submit yet
  useEffect(() => {
    if (transcript) {
      setQuestion(transcript);
    }
  }, [transcript]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      // Allow a small delay for final transcript processing if needed,
      // or rely on the user to check the text bubble and maybe we add a "Go" button?
      // For simplicity/UX: Let's assume stopping means "I'm done, please answer".
      // However, speech recognition `onend` might fire before we have the full text comfortably.
      // Let's rely on a manual effect or just the toggle.
      // Actually, best UX for kids: Tap to speak, Tap to stop -> then it processes.
      if (transcript.length > 0 || question.length > 0) {
        handleAsk(transcript || question);
      }
    } else {
      resetTranscript();
      setAnswer(null);
      setImages([]);
      setQuestion('');
      startListening();
    }
  };

  const handleAsk = async (q: string) => {
    if (!q.trim()) return;

    setIsLoading(true);
    // Fallback to text input if voice failed or user edited it (future feature)

    try {
      const [ans, imgs] = await Promise.all([
        generateAnswer(q),
        getRelatedImages(q)
      ]);

      setAnswer(ans);
      setImages(imgs);

      // Auto-speak the answer
      speak(ans);

    } catch (error) {
      console.error(error);
      setAnswer("Values failed to load. Please try again!");
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string | null) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for kids
    utterance.pitch = 1.1; // Slightly higher/friendly
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-full min-h-screen p-4 gap-4 bg-gradient-to-b from-blue-50 to-pink-50">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-yellow-300 flex items-center justify-center text-xl shadow-sm">
            🤖
          </div>
          <h1 className="text-xl font-bold text-blue-600 font-[family-name:var(--font-varela-round)]">
            Smart Learner
          </h1>
        </div>
        {answer && (
          <Button variant="ghost" size="icon" onClick={() => speak(answer)}>
            <Volume2 className="w-6 h-6 text-blue-500" />
          </Button>
        )}
      </div>

      {/* Camera View */}
      <CameraView />

      {/* Content Area - dynamic height */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 flex flex-col items-center">
        {!isLoading && (
          <div className="w-full max-w-sm mb-4 mt-2">
            <input
              type="text"
              placeholder="Type a question..."
              className="w-full px-4 py-3 rounded-full border-2 border-primary/20 focus:border-primary focus:outline-none text-slate-700 shadow-sm transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAsk(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        )}
        <AnswerDisplay
          question={question}
          answer={answer}
          isLoading={isLoading}
          images={images}
        />
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <MicButton
            isListening={isListening}
            onToggle={handleMicToggle}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Listening Indicator Text */}
      {isListening && (
        <div className="fixed bottom-28 left-0 right-0 text-center text-blue-500 font-bold animate-pulse z-40">
          Listening to you... 👂
        </div>
      )}
    </div>
  );
}
