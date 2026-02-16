import { Bubble } from "@/components/ui/bubble";
import { Loader } from "@/components/ui/loader";
import Image from "next/image";

interface AnswerDisplayProps {
    question: string;
    answer: string | null;
    isLoading: boolean;
    images: string[];
}

export const AnswerDisplay = ({ question, answer, isLoading, images }: AnswerDisplayProps) => {
    if (!question && !answer && !isLoading) return null;

    return (
        <div className="w-full flex flex-col gap-4 mt-4 animate-in fade-in slide-in-from-bottom-5">
            {question && <Bubble text={question} variant="user" />}

            {isLoading && (
                <div className="bg-secondary/50 p-4 rounded-2xl rounded-tl-none mr-auto">
                    <p className="text-secondary-foreground text-sm mb-2 font-bold">Thinking...</p>
                    <Loader />
                </div>
            )}

            {answer && (
                <div className="flex flex-col gap-4">
                    <Bubble text={answer} variant="ai" />

                    {images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {images.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-xl overflow-hidden shadow-md bg-gray-100">
                                    <Image
                                        src={img}
                                        alt="Related visual"
                                        width={300}
                                        height={300}
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
