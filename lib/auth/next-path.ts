// Only same-site paths; browsers treat //host and /\host as links to another site.
export function safeNextPath(path: string) {
    if (path.startsWith("/") && !(path.startsWith("//") || path.startsWith("/\\"))) {
        return path;
    }

    return "/";
}
