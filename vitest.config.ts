import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit tests, for the code where being right is not obvious by reading it.
 *
 * Deliberately not a browser or component runner: there is no jsdom, no React
 * plugin, and no Next integration here. Those buy coverage of things a
 * typecheck and a build already catch, at the cost of a test suite that needs
 * its own maintenance. What this exists for is the logic with a right answer
 * that a reviewer cannot verify by eye — the document parser above all, which
 * stands between a public HTTP endpoint and every reader's browser.
 *
 * `environment: "node"` because that is where the code under test runs. The
 * parser is a Server Action's first line of defence; testing it in a simulated
 * browser would be testing it somewhere it never executes.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Mirrors the `@/*` path in tsconfig.json. Vite does not read tsconfig
    // paths on its own, and without this every import in a test would have to be
    // a relative path that the source it tests does not use.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
