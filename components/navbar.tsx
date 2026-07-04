"use client"

import Image from "next/image";
import {ThemeToggle} from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import Link from "next/link";


export function Navbar() {
    const { resolvedTheme } = useTheme();


    return (
        <div className="flex items-center justify-between mb-6">
            <Link href={"/"}>
                <div className="flex gap-4 items-end">
                    <Image
                        src="/umai_logo_only.svg"
                        alt="Logo"
                        width={60}
                        height={60}
                    />
                    {resolvedTheme === "dark" ?
                        <Image
                            src="/umai_logo_text_light.svg"
                            alt="Logo Text"
                            width={100}
                            height={60}
                        />
                        :
                        <Image
                            src="/umai_logo_text.svg"
                            alt="Logo Text"
                            width={100}
                            height={60}
                        />
                    }
                </div>
            </Link>
            <ThemeToggle />
        </div>
    );
}