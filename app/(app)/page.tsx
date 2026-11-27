import { db } from "@/db";
import { recipes } from "@/db/schema";
import { RecipeList } from "@/components/recipes/recipe-list";
import Image from "next/image";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import Link from "next/link";
import { getCurrentDevice } from "@/lib/auth/session";
import { PageTransition } from "@/components/layout/page-transition";

export const dynamic = "force-dynamic";

export default async function Home() {
    const device = await getCurrentDevice();
    const allRecipes = await db.select().from(recipes);

    return (
        <PageTransition>
            <header className="flex items-center justify-between pt-5 md:hidden">
                <Image src="/brand/umai-horizontal.svg" alt="Umai" width={144} height={48} className="w-auto h-7.5" />
                {device?.isAdmin && (
                    <Link
                        className="size-11 rounded-full grid place-items-center bg-slate text-rice transition-transform duration-200 ease-spring active:scale-90"
                        aria-label="Nastavení"
                        href="/settings/devices"
                        transitionTypes={["nav-forward"]}
                    >
                        <IconAdjustmentsHorizontal size={22} />
                    </Link>
                )}
            </header>
            <h1 className="font-serif text-[2.441rem] leading-[1.05] mt-5.5 mb-4.5 md:mt-9 lg:text-5xl">
                Co dnes uvaříme?
            </h1>

            <RecipeList recipes={allRecipes} />
        </PageTransition>
    );
}
