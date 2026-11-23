// Formatted on the server for a fixed zone: the NAS runs in UTC and Node and the browser ship
// different ICU data, so formatting in a client component would not match after hydration.
const pragueDateTimeFormat = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    dateStyle: "medium",
    timeStyle: "short",
});

export function formatPragueDateTime(date: Date): string {
    return pragueDateTimeFormat.format(date);
}
