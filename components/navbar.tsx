import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Navbar() {
    return (
        <div
            className={cn(
                "fixed inset-x-3 bottom-(--tab-bar-bottom) z-50 h-(--tab-bar-height) p-1.5",
                "rounded-tab-bar bg-slate/82 shadow-tab-bar backdrop-blur-tab-bar backdrop-saturate-120",
                "md:sticky md:inset-x-auto md:top-0 md:bottom-auto md:flex md:h-dvh md:flex-col md:gap-7 md:px-3 md:py-5.5",
                "md:rounded-none md:border-r md:border-line md:bg-ink-deep md:shadow-none md:backdrop-blur-none",
                "lg:gap-9 lg:px-4.5 lg:py-7",
            )}
        >
            <Link href={"/"}>
                <Image src="/brand/umai-horizontal.svg" alt="Umai" width={144} height={48} priority />
            </Link>
        </div>
    );
}
