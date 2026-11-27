import { type ReactNode, ViewTransition } from "react";

const navTransitions = {
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    "nav-fade": "nav-fade",
    default: "none",
};

// React names every top-level DOM node inside a ViewTransition separately, so the page needs a single root
// element to slide as one screen. It also carries the background and full height: a snapshot has no background
// of its own and the previous page would show through the new one.
export function PageTransition({ children }: { children: ReactNode }) {
    return (
        <ViewTransition enter={navTransitions} exit={navTransitions} default="none">
            <div className="min-h-dvh bg-background pb-[calc(var(--tab-bar-clearance)+2.375rem)] px-5 md:pb-14 md:px-10 lg:px-12">
                {children}
            </div>
        </ViewTransition>
    );
}
