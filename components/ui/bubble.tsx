import { cn } from "@/lib/utils";

interface BubbleProps {
    text: string;
    variant?: "user" | "ai";
}

export const Bubble = ({ text, variant = "user" }: BubbleProps) => {
    return (
        <div
            className={cn(
                "p-4 rounded-2xl max-w-[80%] my-2 text-lg shadow-sm animate-in fade-in slide-in-from-bottom-2",
                variant === "user"
                    ? "bg-white ml-auto rounded-tr-none border-2 border-primary text-primary-foreground"
                    : "bg-secondary mr-auto rounded-tl-none border-2 border-secondary-foreground text-secondary-foreground"
            )}
        >
            {text}
        </div>
    );
};
