import { Mic, Square } from "lucide-react";
import { motion } from "framer-motion";

interface MicButtonProps {
    isListening: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

export const MicButton = ({ isListening, onToggle, disabled }: MicButtonProps) => {
    return (
        <div className="relative flex justify-center items-center">
            {isListening && (
                <motion.div
                    className="absolute w-24 h-24 rounded-full bg-accent-pink/30"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            )}
            <button
                disabled={disabled}
                onClick={onToggle}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isListening
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
            >
                {isListening ? (
                    <Square className="w-8 h-8 fill-current" />
                ) : (
                    <Mic className="w-8 h-8" />
                )}
            </button>
        </div>
    );
};
