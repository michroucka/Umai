import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";

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
    viewportFit: "cover",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="en" className={`dark ${dmSans.variable} ${dmSerifDisplay.variable} antialiased`}>
            <body className="">{children}</body>
        </html>
    );
}
