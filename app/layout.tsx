import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const dmSans = DM_Sans({
    variable: "--font-dm-sans",
    subsets: ["latin", "latin-ext"],
});

const dmSerifDisplay = DM_Serif_Display({
    variable: "--font-dm-serif-display",
    weight: "400",
    subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
    title: "Umai",
    description: "",
};

export const viewport: Viewport = {
    themeColor: "#1E211F",
    colorScheme: "dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`dark ${dmSans.variable} ${dmSerifDisplay.variable} h-full antialiased`}>
            <body className="min-h-full xl:h-dvh xl:overflow-hidden">
                <div className="min-h-full xl:h-full flex flex-col p-6 pt-3 max-sm:pb-12 xl:pb-0 2xl:max-w-3/4 2xl:mx-auto">
                    <Navbar />
                    <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto">{children}</div>
                </div>
            </body>
        </html>
    );
}
