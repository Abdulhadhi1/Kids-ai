import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-3xl border bg-card text-card-foreground shadow-sm bg-white p-4",
            className
        )}
        {...props}
    />
))
Card.displayName = "Card"

export { Card }
