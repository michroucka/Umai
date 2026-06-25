import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {useEffect, useState} from "react";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);

    useEffect(() => {
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        const mq = window.matchMedia("(max-width: 640px)");
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    return isMobile;
}
