import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: { "@": path.resolve(import.meta.dirname) },
    },
    test: {
        environment: "node",
        include: ["**/*.test.{ts,tsx}"],
        exclude: ["node_modules/**", ".next/**"],
        // Every test file imports its own copy of db/index.ts, so each gets a fresh migrated DB.
        env: { DATABASE_PATH: ":memory:" },
        coverage: {
            provider: "v8",
            include: ["app/**", "components/**", "lib/**", "db/**", "proxy.ts", "scripts/**"],
            exclude: ["**/*.test.{ts,tsx}", "components/ui/**"],
            reporter: ["text", "html"],
        },
    },
});
