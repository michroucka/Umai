import type { ReactNode } from "react";

export function PageHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
    return (
        <header className="flex items-end justify-between gap-3 pt-6 md:pt-9">
            <div>
                {eyebrow && (
                    <p className="text-[0.8rem] uppercase tracking-widest font-medium text-rice-dim">{eyebrow}</p>
                )}
                <h1 className="font-serif text-[2.441rem] leading-none">{title}</h1>
            </div>
            {action}
        </header>
    );
}
