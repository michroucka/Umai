"use client"

import Image from "next/image";
import {Button} from "@/components/ui/button";
import {Settings} from "lucide-react";
import {ThemeToggle} from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import Link from "next/link";


export function Navbar() {
    const { resolvedTheme } = useTheme();


    return (
        <div className="flex items-center justify-between mb-8">
            <Link href={"/"}>
                <div className="flex gap-4 items-end">
                    <Image
                        src="/umai_logo_only.svg"
                        alt="Logo"
                        width={80}
                        height={80}
                    />
                    {resolvedTheme === "dark" ?
                        <Image
                            src="/umai_logo_text_light.svg"
                            alt="Logo Text"
                            width={150}
                            height={80}
                        />
                        :
                        <Image
                            src="/umai_logo_text.svg"
                            alt="Logo Text"
                            width={150}
                            height={80}
                        />
                    }
                </div>
            </Link>
            <div className="flex gap-1">
                <Button
                    variant="ghost"
                    size="icon-lg"
                >
                    <Settings className="size-7 sm:size-6" />
                </Button>
                <ThemeToggle />
            </div>
        </div>
    );
}