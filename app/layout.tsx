import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import {Navbar} from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Umai!",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full xl:h-dvh xl:overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-full xl:h-full flex flex-col p-6 pt-3 max-sm:pb-12 xl:pb-0 2xl:max-w-3/4 2xl:mx-auto">
            <Navbar />
            <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
