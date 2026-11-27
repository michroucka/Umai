import { Navbar } from "@/components/layout/navbar";
import { ReactNode } from "react";
import { getCurrentDevice } from "@/lib/auth/session";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
    const device = await getCurrentDevice();
    const isAdmin = device?.isAdmin ?? false;

    return (
        <div className="md:grid md:grid-cols-[104px_1fr] lg:grid-cols-[248px_1fr]">
            <Navbar isAdmin={isAdmin} />
            {children}
        </div>
    );
}
