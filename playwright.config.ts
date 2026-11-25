import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Outside test-results: Playwright empties that folder after the server has already opened the database.
export const E2E_DATABASE_PATH = path.join(os.tmpdir(), "umai-e2e.db");

export default defineConfig({
    testDir: "e2e",
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        // localhost counts as a secure origin, so the browser keeps the always-`secure` device cookie over HTTP.
        baseURL: `http://localhost:${PORT}`,
        trace: "retain-on-failure",
    },
    // Umai is used on a phone.
    projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
    webServer: {
        // CI builds in an earlier step; locally the build has to match the current code.
        command: [
            `rm -f ${E2E_DATABASE_PATH}*`,
            ...(process.env.CI ? [] : ["npm run build"]),
            `DATABASE_PATH=${E2E_DATABASE_PATH} npm run start -- -p ${PORT}`,
        ].join(" && "),
        url: `http://localhost:${PORT}/pair`,
        reuseExistingServer: false,
        timeout: 180_000,
    },
});
