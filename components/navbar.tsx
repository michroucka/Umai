"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Icon, IconBook2, IconPlus, IconSettings, IconShoppingCart } from "@tabler/icons-react";
import Image from "next/image";

type NavbarItem = {
    href: string;
    label: string;
    Icon: Icon;
    isActive: (path: string) => boolean;
    adminOnly?: boolean;
    hideOnMobile?: boolean;
};

const NAVBAR_ITEMS: NavbarItem[] = [
    {
        href: "/",
        label: "Recepty",
        Icon: IconBook2,
        isActive: (path) => path === "/" || (path.startsWith("/recipes/") && path !== "/recipes/new"),
    },
    {
        href: "/shopping",
        label: "Nákup",
        Icon: IconShoppingCart,
        isActive: (path) => path === "/shopping",
    },
    {
        href: "/recipes/new",
        label: "Přidat",
        Icon: IconPlus,
        isActive: (path) => path === "/recipes/new",
    },
    {
        href: "/settings/devices",
        label: "Nastavení",
        Icon: IconSettings,
        isActive: (path) => path.startsWith("/settings"),
        adminOnly: true,
        hideOnMobile: true,
    },
];

export function Navbar({ isAdmin }: { isAdmin: boolean }) {
    const path = usePathname();

    return (
        <nav
            aria-label="Hlavní navigace"
            className={cn(
                "fixed inset-x-3 bottom-(--tab-bar-bottom) z-50 h-(--tab-bar-height) p-1.5",
                "rounded-tab-bar bg-slate/82 shadow-tab-bar backdrop-blur-tab-bar backdrop-saturate-120",
                "md:sticky md:inset-x-auto md:top-0 md:bottom-auto md:flex md:h-dvh md:flex-col md:gap-7 md:px-3 md:py-5.5",
                "md:rounded-none md:border-r md:border-line md:bg-ink-deep md:shadow-none md:backdrop-blur-none",
                "lg:gap-9 lg:px-4.5 lg:py-7",
            )}
        >
            <Link href="/" className="hidden md:flex lg:px-3.5">
                <Image src="/brand/umai-horizontal.svg" alt="Umai" width={144} height={48} className="w-full lg:w-29" />
            </Link>
            <ul className="grid grid-cols-3 md:grid-cols-1 md:auto-rows-[64px] md:gap-1.5 lg:auto-rows-[52px]">
                {NAVBAR_ITEMS.map(
                    (item) =>
                        (!item.adminOnly || isAdmin) && (
                            <li key={item.href} className={cn(item.hideOnMobile && "hidden md:block")}>
                                <Link
                                    href={item.href}
                                    aria-current={item.isActive(path) ? "page" : undefined}
                                    className={cn(
                                        "group flex flex-col items-center gap-0.75 rounded-[20px] pt-2.25 pb-1.75",
                                        "text-[0.74rem] font-medium text-rice-dim",
                                        "aria-[current=page]:bg-nori aria-[current=page]:text-rice",
                                        "md:h-full md:justify-center md:rounded-2xl md:hover:text-rice",
                                        "lg:flex-row lg:justify-start lg:gap-3.5 lg:px-4 lg:py-0 lg:text-[0.98rem]",
                                    )}
                                >
                                    <item.Icon
                                        className="shrink-0 group-aria-[current=page]:text-nori-light"
                                        size={22}
                                    />
                                    <span className="leading-[1.3]">{item.label}</span>
                                </Link>
                            </li>
                        ),
                )}
            </ul>
        </nav>
    );
}
