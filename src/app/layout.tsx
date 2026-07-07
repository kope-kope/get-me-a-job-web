import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { SessionErrorGate } from "@/components/session-error-gate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "get-me-a-job — apply in 10 minutes",
  description:
    "Paste a job description. Get a tailored resume, a cover letter that sounds human, and a cold email to a real hiring manager. All saved to your Google Drive and Gmail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider>
          <SessionErrorGate />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
