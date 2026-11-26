import { Navbar } from "@/components/navbar";
import { ReactNode } from "react";

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <div className="md:grid md:grid-cols-[104px_1fr] lg:grid-cols-[248px_1fr]">
            <Navbar />
            <div className="pb-[calc(var(--tab-bar-clearance)+2.375rem)] px-5 md:pb-14 md:px-10 lg:px-12">
                {children}
            </div>
        </div>
    );
}
