import type { Metadata } from "next";
import { Varela_Round } from "next/font/google";
import "./globals.css";

const varelaRound = Varela_Round({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-varela-round",
});

export const metadata: Metadata = {
  title: "AI Smart Kids Learning Assistant",
  description: "A fun AI learning assistant for kids!",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${varelaRound.className} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative overflow-hidden bg-white/50 shadow-2xl min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
