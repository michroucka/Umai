import { formatAmount, parseScalable } from "@/lib/utils";
import {Fragment} from "react";

type ScalableTextProps = {
    text: string;
    factor: number;
};

export function ScalableText({text, factor}: ScalableTextProps) {
    const segments = parseScalable(text);

    return (
        <>
            {segments.map((segment, i) => {
                if (segment.type === "text") {
                    return <Fragment key={i}>{segment.value}</Fragment>
                }

                const scaledAmount = formatAmount(segment.value * factor);
                const label = segment.unit ? `${scaledAmount} ${segment.unit}` : scaledAmount;

                return <span key={i} className="font-semibold">{label}</span>
            })}
        </>
    );
}