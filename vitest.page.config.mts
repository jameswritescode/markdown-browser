import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/page/**/*.test.ts"],
    globalSetup: ["test/page/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    expect: { poll: { timeout: 5_000 } },
  },
});
