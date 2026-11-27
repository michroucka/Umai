import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PairForm } from "@/components/devices/pair-form";
import { suggestDeviceName } from "@/lib/auth/device-name";
import { safeNextPath } from "@/lib/auth/next-path";
import { getCurrentDevice } from "@/lib/auth/session";

type PairPageProps = {
    searchParams: Promise<{ next?: string | string[] }>;
};

export default async function PairPage({ searchParams }: PairPageProps) {
    const { next } = await searchParams;

    const firstNext = Array.isArray(next) ? next[0] : next;
    const nextPath = safeNextPath(firstNext ?? "");

    if (await getCurrentDevice()) {
        redirect(nextPath);
    }

    const suggestedName = suggestDeviceName((await headers()).get("user-agent"));

    return <PairForm next={nextPath} suggestedName={suggestedName} />;
}
